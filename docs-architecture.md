# PromptForge Architecture

This document describes the initial technical architecture and stack for the PromptForge web application.

## High-level architecture

PromptForge is a web application with:

- A **Next.js + React + TypeScript** frontend.
- A **Supabase** backend for Postgres, authentication, and persistence.
- **Server-side AI integration** via server-only utility modules (no AI keys in the browser).
- A focus on a calm, minimal **terminal-style UI** that sits on top of a structured template and history engine.

The app is organized around a **single terminal surface** rather than multiple pages:

- Users type tasks and commands (for example, `/help`, `/preferences`) into the terminal.
- The backend uses templates, fields, preferences, and history to shape prompts and answers.

Logical flows inside the terminal include:

- Task handling: take a freeform description and generate prompts.
- Preferences: collect and store tone, audience, and domain defaults.
- Templates and history (later): manage templates and reuse past generations via commands.

## Tech stack

- **Framework**: Next.js (App Router) with React 18 and TypeScript.
- **Styling**: Tailwind CSS and a small, focused set of reusable UI primitives.
- **Database & auth**: Supabase (Postgres + Supabase Auth).
- **State management**: React built-ins only (`useState`, `useReducer`, `useContext`, `useMemo`, etc.). No external global state managers (Redux, Zustand, etc.).
- **Data access**:
  - Prefer **server components** and **server actions** for reads/writes.
  - Use the Supabase JS client directly; introduce Prisma later only if the data layer becomes complex enough to justify it.
- **AI integration**:
  - Server-only modules wrapping LLM APIs.
  - Task Helper pipeline lives on the server (intent extraction, template ranking, field suggestions).

## Interaction patterns

- The primary UI is a client component `FastEasyShell` that renders the terminal: a scrollable log plus an input area.
- **Server actions** (and, later, route handlers) handle mutations and AI calls, e.g. saving generations, updating preferences, or running Task Helper-style intent extraction.
- Additional React components can be introduced for richer terminal interactions (for example, inline previews), but all user-initiated actions start from the terminal input.

## Supabase usage

- Postgres stores:
  - Users and auth metadata (via Supabase Auth).
  - Templates and their fields.
  - Generations/history (including inputs and final prompts).
  - Optional tags/metadata for Task Helper matching.
- The Supabase JS client is initialized in dedicated helper modules for server and client usage.

## Fast & Easy flow (assistant layer)

- Accepts a freeform task description (text or voice → text).
- On the server, an AI-backed pipeline:
  - Extracts intent, goal, audience, tone, format, and constraints.
  - Uses user preferences/profile (when available) to pick sensible defaults.
  - Asks a small number of clarifying questions when confidence is low or key fields are missing.
  - Matches against template metadata and tags stored in Supabase.
  - Returns several candidate prompts (and/or underlying templates + filled fields) that can be refined.
- The client UI then:
  - Shows candidate prompts with short rationales.
  - Lets the user accept a candidate, edit it, or jump into the Enchanted sandbox with the same context.

## Enchanted sandbox

- Built on Template Builder + Generator.
- Users:
  - Create or edit templates and fields.
  - Fill fields in Generator to assemble prompts, with live preview.
  - Optionally receive gentle inline hints or suggested field defaults.
- This mode favors transparency and control over automation, but still reuses the same AI utilities when needed.

## Preferences, autocomplete, and voice typing (future iterations)

- **User preferences & profile**
  - Store light-weight preference data (tone, typical audiences, domains, languages, etc.) in Supabase.
  - Use this data to pre-fill fields, rank templates, and bias Fast & Easy suggestions.
- **Autocomplete for problem input**
  - Client-side experience where the assistant suggests completions as the user types the task description.
  - Backed by a small server-side utility that proposes likely continuations based on partial input and history.
- **Voice typing effect**
  - For voice input, animate the transcription as if it is being typed, to keep the experience legible and calm instead of dumping text all at once.

This document should evolve alongside the implementation. When the actual Next.js project structure, Supabase schema, and assistant pipeline are in place, update this file with concrete file paths, schema snippets, and key modules.
