# PromptForge Architecture

PromptForge is a single-surface, terminal-style Next.js app backed by Supabase. This snapshot reflects the current implementation (App Router, `/generate` entrypoint) and the boundaries introduced by the refactor.

## Stack

- Next.js (App Router), React 18, TypeScript
- Tailwind CSS with small shadcn-based UI primitives (select, checkbox)
- Supabase (Postgres + Auth) for auth, preferences, and history (events removed; prompt_versions removed)
- Server-only services for LLM calls and Supabase access

## Runtime layout

- `web/src/app` – routes. `/` redirects to `/generate`. The terminal page is server-rendered with `loadSessionState`, then hydrates the client terminal.
- `PromptTerminal` (client) renders the full experience: terminal log, input, clarifying flow, prompt editor, preferences modal, history, and snapshots.
- `features/terminal/terminalState.tsx` – reducer + context for all terminal UI state; `stateActions.ts` exposes typed action creators.
- `features/terminal/TerminalShellView.tsx` – presentational wrapper for header, panels, and main content.
- `features/preferences/*` – reusable field components for the preferences modal.
- `services/*` – server-only utilities (`promptService`, `preferencesServer`, `historyService`, `eventsService`, `sessionService`) that own Supabase and LLM interactions.
- `lib/*` – constants, types, theme helpers, Supabase client factories (server + browser).
- `hooks/*` – composable flows (generation, clarifying questions, terminal persistence/drafts, snapshots, preferences controller, command router, hotkeys, focus).

## State and data flow

- UI state lives in the terminal reducer; components dispatch typed actions instead of keeping ad-hoc `useState`.
- Drafts persist to `localStorage` (`pf_draft`) via `useTerminalPersistence`, restoring on reload with a toast.
- Session identity comes from the `pf_session_id` cookie, created on the first server action and backed by `pf_sessions`.
- Preferences:
  - Authenticated users: stored in `user_preferences` (tone, audience, domain, default model, temperature, language, depth, output format, citation preference, persona hints, UI defaults, sharing links, do_not_ask_again).
  - Guests: stored per session in `pf_preferences` (tone, audience, domain).
- History: `pf_generations` stores session-scoped history with server-side pruning (keep latest per session). `pf_prompt_versions` and events are removed; history is fetched on-demand (e.g., `/history`) to keep the terminal clean on load.
- Events: `pf_events` records session analytics (prompt saved, prompt copied, preferences updated, etc.).
- Auth:
  - Login is required before generating or editing prompts. Server actions enforce authenticated Supabase sessions; client-side gating is a UX convenience only.
  - Clarifying questions fall back to deterministic templates for guests to avoid anonymous OpenAI usage.
- Task flow controller:
  - `features/terminal/taskFlow.ts` encapsulates task submission, validation, consent/clarifying/preference branching, and revise flow. `PromptTerminal` consumes its handlers so the UI stays presentational and testable.
- Mode and starter controllers:
  - `features/terminal/modeController.ts` centralizes quick/guided switching and associated resets.
  - `features/terminal/starterExamples.ts` owns starter prompts and focus behavior for inserts.

## UI composition rules

- Single surface: all interactions start in the terminal (input + slash commands). Modals are state-driven only.
- Components stay small: logic belongs in hooks and reducer actions; views remain presentational (`TerminalShellView`, field components).
- Keyboard accessibility: consent and preference options default-select the first item; hotkeys handled via `useTerminalHotkeys`.
- Loading/error states are explicit (toasts, disabled buttons, skeleton for page load).

## Error handling and resilience

- Supabase writes retry once on FK failures after ensuring `pf_sessions` exists.
- LLM calls and Supabase writes are isolated in services; server actions thinly re-export them.
- Draft persistence tolerates unavailable storage and clears corrupted data.

## Planned/optional modules

- Templates/gallery are not implemented yet; add them under `features/templates` with matching services while keeping the single-surface terminal.
- Additional commands (history export, template management) should continue to flow through the terminal input.
