# PromptForge Data Flows

This document describes how the PromptForge terminal stores, retrieves, and synchronizes data across the client, Next.js server actions, and Supabase.

## Overview

```
┌──────────────┐   ┌───────────────────────┐   ┌────────────────────────┐
│   Browser    │   │    Next.js (App)      │   │       Supabase         │
├──────────────┤   ├───────────────────────┤   ├────────────────────────┤
│ Terminal UI  │   │ Server actions        │   │ pf_sessions            │
│ Terminal reducer│ │ Services (prompt,    │   │ pf_preferences         │
│ Draft in localStorage│ preferences, history,│ │ pf_generations        │
│ pf_session_id cookie │ events, session)   │   │ pf_prompt_versions     │
│                │   │ Supabase clients     │   │ pf_events              │
└──────────────┘   └───────────────────────┘   │ user_preferences (auth)│
                                               └────────────────────────┘
```

## Storage layers

### 1) UI state (memory)

- Managed by `features/terminal/terminalState.tsx` reducer + context.
- Drives the terminal log, input, clarifying flow, prompt edit/finalize, preference wizard, modals, and snapshots.

### 2) Local draft (`localStorage`)

- Managed by `useTerminalPersistence` (key: `pf_draft`).
- Saves: lines, pending task, editable prompt, clarifying questions/answers, consent selections, prompt state, header/help flags, likes.
- Restores on reload with a toast; clears on approval or `/discard`.
- Resilient to storage unavailability and corrupted payloads.

### 3) Cookie (session identity)

- Name: `pf_session_id`, set on first server action.
- Attributes: httpOnly, sameSite=lax, path=/, maxAge=1y, secure in production.
- Validated as UUID v4; invalid cookies are ignored and replaced on next action.

### 4) Supabase (persistent)

- `pf_sessions`: session ids (UUID).
- `pf_preferences`: guest/session preferences (tone, audience, domain).
- `pf_generations`: session-scoped history of prompts (task, label, body).
- `pf_prompt_versions`: prompt snapshots for restores.
- `pf_events`: analytics-style events for the session.
- `user_preferences`: authenticated user preferences (tone, audience, domain, default model, temperature, language, depth, output format, citation preference, persona hints, ui_defaults, sharing_links, do_not_ask_again).

## Session management

1. **First visit (no cookie)**  
   `loadSessionState()` returns a pending session id with empty preferences/history. The page renders immediately.

2. **First server action**  
   `getOrCreateActionSessionId()` issues a UUID, sets the cookie, and upserts `pf_sessions`.

3. **Subsequent requests**  
   `loadSessionState()` validates the cookie, fetches session preferences (if guest) or `user_preferences` (if authenticated), and hydrates the last 10 generations into the terminal lines.

## Preferences flow

- Authenticated users: preferences are read/written in `user_preferences` via `preferencesServer`. Wide schema supports model, temperature, language, depth, output format, citation preference, persona hints, ui_defaults, sharing_links, and do_not_ask_again.
- Guests: tone/audience/domain are stored in `pf_preferences` keyed by `pf_session_id`.
- Local fallback: preferences also cache to `localStorage` for non-authenticated users (see `PreferencesPanel` logic) so UI remains sticky even before Supabase writes.

## Prompt generation flow

1. User types a task. Draft is saved to `localStorage` as they type.
2. On submit, `promptService.generateClarifyingQuestions` may run; consent + clarifying answers live in reducer state and persist to draft storage.
3. Approval triggers `promptService.generateFinalPrompt` (and optional edits via `promptService.editPrompt`).
4. `historyService.recordGeneration` stores the result in `pf_generations` and `pf_prompt_versions`; `eventsService.recordEvent` logs `prompt_saved`.
5. Draft is cleared; the approved prompt is copied when requested and logged via `recordEvent('prompt_copied', ...)`.

## History flow

- `loadSessionState` preloads the 10 most recent generations for the session and renders them as system/user lines.
- `/history` command routes through `historyService.listHistory` to render additional items.
- Snapshots in `pf_prompt_versions` provide restore fidelity beyond the summary shown in history.

## Error handling

- Supabase writes retry once on FK failures after `ensureSessionExists`.
- Expected “no rows” responses (`PGRST116`) are treated as empty results.
- Draft persistence guards against storage errors by catching/clearing bad payloads.
- Cookie validation rejects non-UUID values to avoid injection.

## Performance notes

- Draft saves are debounced; only the last 10 generations are loaded on page render.
- Services are server-only; the browser never sees Supabase service role keys.
- Reducer-driven state minimizes prop-drilling and repeated `useState` setters.

## Troubleshooting

- **Draft not restoring**: confirm `localStorage` availability and that the draft is <24h old; check console for JSON parse clears.
- **Session not sticking**: ensure cookies are enabled and `pf_session_id` is a valid UUID; a new cookie is issued on the next action if invalid.
- **Preferences not saving**: verify Supabase env vars, ensure `user_preferences` (auth) or `pf_sessions`/`pf_preferences` exist; check Supabase logs for errors.
- **History empty**: confirm `pf_generations` rows for the current `pf_session_id`; guest sessions are unique per browser profile.
