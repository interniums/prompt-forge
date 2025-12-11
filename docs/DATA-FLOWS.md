# PromptForge Data Flows

This document describes how the PromptForge terminal stores, retrieves, and synchronizes data across the client, Next.js server actions, and Supabase.

## Overview

```
┌──────────────┐   ┌───────────────────────┐   ┌────────────────────────┐
│   Browser    │   │    Next.js (App)      │   │       Supabase         │
├──────────────┤   ├───────────────────────┤   ├────────────────────────┤
│ Terminal UI  │   │ Server actions        │   │ pf_sessions            │
│ Terminal reducer│ │ Services (prompt,    │   │ pf_preferences         │
│ Draft in localStorage│ preferences, history│   │ pf_generations        │
│ pf_session_id cookie │ session)            │   │                       │
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
- `pf_generations`: session-scoped history of prompts (task, label, body). Rows are retained per session with a server-side cap.
- `pf_prompt_versions`: removed (legacy).
- `pf_events`: removed (legacy analytics).
- `user_preferences`: authenticated user preferences (tone, audience, domain, default model, temperature, language, depth, output format, citation preference, persona hints, ui_defaults, sharing_links, do_not_ask_again).

## Session management

1. **First visit (no cookie)**  
   `loadSessionState()` returns a pending session id with empty preferences/history. The page renders immediately.

2. **First server action**  
   `getOrCreateActionSessionId()` issues a UUID, sets the cookie, and upserts `pf_sessions`.

3. **Subsequent requests**  
   `loadSessionState()` validates the cookie and fetches session preferences (if guest) or `user_preferences` (if authenticated). The terminal no longer auto-hydrates history; the surface stays clean on load.

## Preferences flow

- Authenticated users: preferences are read/written in `user_preferences` via `preferencesServer`. Wide schema supports model, temperature, language, depth, output format, citation preference, persona hints, ui_defaults, sharing_links, and do_not_ask_again.
- Guests: tone/audience/domain are stored in `pf_preferences` keyed by `pf_session_id`.
- Local fallback: preferences also cache to `localStorage` for non-authenticated users (see `PreferencesPanel` logic) so UI remains sticky even before Supabase writes.

## Prompt generation flow

1. User types a task. Draft is saved to `localStorage` as they type.
2. On submit, `promptService.generateClarifyingQuestions` may run; consent + clarifying answers live in reducer state and persist to draft storage.
3. Approval triggers `promptService.generateFinalPrompt` (and optional edits via `promptService.editPrompt`).
4. `historyService.recordGeneration` stores the result in `pf_generations` (oldest rows beyond the cap are pruned per session).
5. Draft is cleared; the approved prompt is copied when requested.

### Unclear task flow

- We heuristically flag unclear tasks client-side before hitting OpenAI; on hit we show a two-button modal (Edit / Continue anyway).
- Once the user picks an option for the same task, we remember it (`allowUnclear`) and skip re-showing the modal across clarifying, preferences, and final generation for that task.
- Continuing anyway runs clarifying/final generation with `allowUnclear: true` so the flow can finish without re-prompting.
- Keyboard users can navigate the modal with arrows and confirm with Enter/Space; initial focus starts on the first button.

## History flow

- History is fetched on demand via the `/history` command (`historyService.listHistory`).
- The terminal does not auto-render prior generations on load to avoid clutter; users pull history only when needed.
- Prompt versions/events are removed; history relies on `pf_generations` with pruning.

## Error handling

- Supabase writes retry once on FK failures after `ensureSessionExists`.
- Expected “no rows” responses (`PGRST116`) are treated as empty results.
- Draft persistence guards against storage errors by catching/clearing bad payloads.
- Cookie validation rejects non-UUID values to avoid injection.
- Event logging and prompt_versions are removed to reduce stored PII.

## Performance notes

- Draft saves are debounced; only the last 10 generations are loaded on page render.
- Services are server-only; the browser never sees Supabase service role keys.
- Reducer-driven state minimizes prop-drilling and repeated `useState` setters.

## Troubleshooting

- **Draft not restoring**: confirm `localStorage` availability and that the draft is <24h old; check console for JSON parse clears.
- **Session not sticking**: ensure cookies are enabled and `pf_session_id` is a valid UUID; a new cookie is issued on the next action if invalid.
- **Preferences not saving**: verify Supabase env vars, ensure `user_preferences` (auth) or `pf_sessions`/`pf_preferences` exist; check Supabase logs for errors.
- **History empty**: confirm `pf_generations` rows for the current `pf_session_id`; guest sessions are unique per browser profile.
