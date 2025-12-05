# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository status

As of 2025-12-05 this repository contains both product docs and an implemented web application.

- The core product/docs live at the repo root (`README.md`, `docs-product-brief.md`, `docs-architecture.md`).
- The Next.js app lives in `web/` and renders the PromptForge terminal on the root route (`/`).

The terminal is the primary user surface; any future features (templates, history, Task Helper) should be reachable through commands typed into this surface.

## Tooling and commands

The `web/` folder contains a standard Next.js + TypeScript app with npm-based tooling:

- Development server: `cd web && npm run dev`
- Lint: `cd web && npm run lint`
- Production build: `cd web && npm run build`

Use these commands as the source of truth when running, linting, or building the app.

## Product and domain overview

PromptForge is a minimalistic, high-craft prompt generator that helps users turn fuzzy goals into clear, reusable prompts quickly.

Key domain concepts from the documentation:

- **Fast & Easy flow** – default entry point where users describe a problem in natural language (typed or voice), optionally answer a few clarifying questions, and receive several ready-to-use prompt variants they can refine.
- **Enchanted sandbox** – a more advanced space where users choose templates and settings themselves, shaping prompt recipes with fine-grained control.
- **Templates ("prompt recipes")** – reusable prompt blueprints, potentially both private and shareable/public.
- **Fields / variables** – structured inputs like role, audience, tone, constraints, format, and examples that parameterize a template.
- **Live preview** – a composed prompt that updates as fields change, showing the final text that will be copied or exported.
- **Validation & guidance** – required fields, missing-info warnings, and gentle quality checks to improve prompt quality without being heavy-handed.
- **History** – saved generations along with the inputs used, so users can revisit, duplicate, and tweak past prompts.
- **Export** – output formats such as plain text, Markdown, and structured template+input snapshots for reuse elsewhere.
- **User preferences & profile** – light-weight preference and context data (e.g., tones, audiences, domains) used to personalize defaults and suggestions.
- **Autocomplete for problem input (future)** – optional AI-assisted suggestions while typing what the user wants to do.
- **Voice typing effect** – animating dictated input as if it is being typed to keep voice interactions legible and calm.

Primary user flows to keep in mind when designing or reading code:

1. Terminal task flow (default): user describes a problem in the terminal → app may ask clarifying questions → user receives one or more prompt candidates → refine and copy/export.
2. Preferences: user runs `/preferences` → app walks through a short Q&A to capture tone, audience, and domain defaults.
3. Templates and history (later): user manages templates and reuses past generations through additional terminal commands.

There is a single primary surface: the PromptForge terminal on `/`. Any additional internal modules (for templates, history, Task Helper, etc.) should plug into this surface rather than introducing new standalone pages.

These concepts and flows should shape both domain modeling and UI architecture once implementation begins.

## Tech stack (initial plan)

As the implementation starts, the intended stack is:

- **Framework**: Next.js (App Router) with React 18 and TypeScript.
- **Styling**: Tailwind CSS with a small, focused design system.
- **Database & auth**: Supabase (Postgres + Supabase Auth).
- **State management**: React built-ins only (`useState`, `useReducer`, `useContext`, `useMemo`, etc.); no external global state managers.
- **Data access**:
  - Prefer server components and server actions for reads/writes.
  - Use the Supabase JS client directly; Prisma can be introduced later if the data layer becomes complex.
- **AI integration**: server-only utility modules wrapping LLM APIs (including Task Helper intent extraction and template ranking), with no keys exposed to the browser.

For more detail, see `docs-architecture.md`.

## Future architecture guidance for agents

Once code is added, future agents should:

1. **Identify the stack and entry points**
   - Locate the main application entry (e.g. `src/main.tsx`, `app/page.tsx`, a backend `main` file, etc.).
   - Map how routes or screens correspond to the "Core screens" listed above.

2. **Look for clear separation of concerns**
   - Expect a separation between:
     - **Domain/model layer** – templates, fields, prompt assembly, validation, and history entities.
     - **UI layer** – components implementing Template Builder, Generator, Gallery, History, etc.
     - **Persistence/integration layer** – any APIs, storage, or sync mechanisms that back templates and history.
   - When editing or adding code, keep new logic within the appropriate layer instead of mixing UI, domain, and persistence concerns.

3. **Align features with documented flows**
   - When implementing new features or refactors, verify they support or extend one of the documented primary flows (template selection, template creation/editing, history reuse, or gallery/sharing).
   - For new screens or modules, document how they fit into the flows above to keep the app focused and calm.

4. **Update this file as the codebase evolves**
   - Once there are concrete build/test commands and a real module structure, add:
     - Exact dev, build, lint, and test commands (including how to run a single test).
     - A short description of the main modules/packages and how they map to the product concepts listed here.
   - Keep this file concise and focused on information that is non-obvious from a quick scan of the repository.
