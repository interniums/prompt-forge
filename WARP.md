# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository status

As of 2025-12-04 this repository is in an early, design-only phase. There is no application code, build tooling, or test configuration yet. The main sources of truth are:

- `README.md` – high-level overview of PromptForge, its purpose, and planned feature set.
- `docs-product-brief.md` – detailed product brief describing users, core promise, key concepts, primary flows, and planned screens.

When implementation is added, new tooling and architecture should be reflected back into this file.

## Tooling and commands

There are currently no package manifests or build/test configurations in the repo (for example, no `package.json`, `pyproject.toml`, `go.mod`, or similar files). That means there is **no canonical build, lint, or test command defined yet**.

When code and tooling are introduced, derive commands from the concrete configuration in the repo instead of assuming defaults. In particular:

- If a JavaScript/TypeScript toolchain is added (e.g. `package.json` appears):
  - Use the package manager implied by lockfiles (e.g. `pnpm-lock.yaml`, `yarn.lock`, or `package-lock.json`).
  - Prefer running tasks via `npm run`, `pnpm`, or `yarn` scripts defined in `package.json` (e.g. `dev`, `build`, `lint`, `test`).
  - For “run a single test” flows, look for the test runner (Vitest, Jest, Playwright, etc.) and use its documented CLI targeting options (by file or test name) based on the configured scripts.
- If a different ecosystem is used (Python, Go, Rust, etc.):
  - Inspect the corresponding config (`pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc.) and any `Makefile` or task runner config to discover the authoritative commands.

Always take commands from the actual repo configuration rather than generic conventions, and update this section once the tooling is in place.

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

1. Fast & Easy (default): user describes a problem → app may ask clarifying questions → user receives several prompt candidates → refine or copy/export.
2. Enchanted sandbox: user chooses or creates a template → defines fields/options → previews and tests → reuses via Generator.
3. Reuse from history (duplicate, tweak, copy).
4. Share templates via some form of gallery.

Core planned screens from the product brief:

- Landing
- Gallery
- Dashboard
- Template Builder (split view: fields on one side, prompt + preview on the other)
- Generator (a single, calm flow for generating prompts)
- Task Helper (task → template assistant, likely reachable from Landing/Generator)
- History (searchable, focused on quick reuse)

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
