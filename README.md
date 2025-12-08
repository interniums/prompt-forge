# PromptForge

PromptForge is a single-screen, terminal-style prompt workbench. Users type a task (or run slash commands), the app asks short clarifying questions, and it returns a ready-to-use prompt with a minimal amount of UI chrome.

- Calm terminal UI with history, clarifying questions, and prompt editing.
- Lightweight preferences (tone, audience, domain, model, etc.) with guest + authenticated storage.
- Local draft persistence and session-scoped history so users can continue where they left off.
- Supabase-backed auth (magic link + Google) and storage for preferences, history, and events.

## Quick start

```
cd web
npm install
npm run dev
# open http://localhost:3000 (redirects to /generate)
```

Environment (`web/.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Apply the schema in `supabase-schema.sql` to your Supabase project before running locally.

## Key flows

- Task → prompt: type a task, optionally answer clarifying questions, approve/copy the generated prompt.
- Preferences: open the preferences modal or run the preference Q&A to set tone/audience/domain/model/etc.; stored per user when signed in, otherwise per session.
- History: the last 10 prompts for the session are rendered into the terminal on load; full history is retrievable via `/history`.
- Auth: the terminal is usable as a guest; sign-in is required before generating/saving prompts. Magic link and Google OAuth are supported.

## Developer commands

- Dev server: `cd web && npm run dev`
- Lint: `cd web && npm run lint`
- Build: `cd web && npm run build`

## Docs

- Product brief: `docs-product-brief.md`
- Architecture: `docs-architecture.md`
- Data flows: `docs/DATA-FLOWS.md`
- Supabase setup: `SUPABASE_OAUTH_SETUP.md`, `supabase-schema.sql`

## Status

The shipped surface is the PromptForge terminal at `/generate`. Templates/gallery are not yet implemented; the codebase is organized for future feature modules but keeps the experience on a single, calm screen.
