# PromptForge

PromptForge is a minimalistic, high-craft prompt generator that helps people turn fuzzy goals into clear, reusable prompts in seconds.

## Core idea

PromptForge is a single-screen, terminal-style interface. Users type natural language tasks and lightweight slash commands (like `/help` and `/preferences`) into a calm "PromptForge terminal". The app asks clarifying questions, remembers preferences, and generates reusable prompts.

Under the hood, a shared template system and history power all interactions, but the user only ever sees one focused surface: the terminal.

## High-level features

- Terminal surface: type tasks and commands in one calm, persistent workspace.
- Preferences: configure tone, audience, and domains via interactive flows (for example, `/preferences`).
- Templates: reusable prompt blueprints used internally to shape responses.
- Fields (variables): structured inputs like role, audience, tone, constraints, format, examples that back the template engine.
- History (later): save generated prompts with their filled inputs for later reuse.
- Autocomplete and guidance (later): optional AI-assisted suggestions and gentle quality checks.

## Initial structure

This repository is a small, calm web app focused on:

- Fast clarity and consistent prompt quality
- A single-screen, distraction-free terminal flow
- Command-driven interactions instead of multiple separate pages

Further technical and architectural details live in `docs-product-brief.md` and `docs-architecture.md`.
