# PromptForge Architecture

This document describes the initial technical architecture and stack for the PromptForge web application.

## High-level architecture

PromptForge is a web application with:

- A **Next.js + React + TypeScript** frontend.
- A **Supabase** backend for Postgres, authentication, and persistence.
- **Server-side AI integration** via server-only utility modules (no AI keys in the browser).
- A focus on calm, minimal UI with live prompt preview and structured templates.

The app is organized around two primary experiences, plus supporting screens:

- **Fast & Easy flow (default)**: an assistant-style surface where the user describes a task (text or voice). The backend may ask clarifying questions, then generates several prompt variants that can be refined and reused.
- **Enchanted sandbox**: a more deliberate workspace where users pick or build templates, adjust fields and options, and drive the Generator with fine-grained control.

Supporting surfaces:

- Template Builder: create/edit templates with fields and instant preview.
- Generator: use templates and fields to assemble prompts in a calm, single-flow UI.
- History: browse, duplicate, and tweak past generations.
- Gallery: browse shared/public templates.

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

- **Server components** handle most data fetching from Supabase for pages like Generator, Template Builder, History, and Gallery.
- **Server actions** handle mutations and AI calls, e.g. saving templates, generating prompts, or running Task Helper suggestions.
- **Client components** are used where interactivity is required (form inputs, live preview controls, voice capture), calling server actions via form submissions or event handlers.

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
