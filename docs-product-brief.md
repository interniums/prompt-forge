# PromptForge – Product Brief

## Product idea

PromptForge is a focused workspace for turning fuzzy goals into clear prompts through a single, terminal-style experience:

- Users describe a problem in their own words (typed or voice) in the PromptForge terminal.
- Lightweight slash commands (for example, `/help`, `/preferences`) control all other interactions: updating preferences, exploring templates, and reusing past prompts.

Under the hood, a shared template, history, and preference system powers the terminal, but users always stay in one calm surface.

## Target users

- Makers and founders writing product specs, strategies, and pitches
- Developers generating coding prompts and debugging requests
- Marketers creating ads, landing copy, and email sequences
- Writers and creators shaping outlines, scripts, and story prompts
- Teams that want consistent prompt quality and shared standards

## Core promise

Fast clarity and consistent quality. The app reduces prompt-writing friction, enforces structure, and improves outcomes with lightweight guidance—without feeling heavy or complicated.

## Current scope (2025-12)

- Shipped: terminal flow with clarifying questions, prompt editing/approval, preferences (guest + authenticated), session-scoped history, and local draft persistence.
- Planned: templates/gallery and the "Enchanted sandbox" remain future work; all additions should continue to flow through the terminal surface.

## Key concepts

- **Fast & Easy flow**: default entry point where users describe a problem (text or voice), optionally answer clarifying questions, and receive several ready-to-use prompt variants with room for refinement.
- **Enchanted sandbox**: a more advanced, structured space where users choose templates, fields, and options to shape prompts deliberately.
- **Templates**: reusable prompt blueprints (private and shareable).
- **Fields (variables)**: role, audience, tone, constraints, format, examples.
- **Live preview**: instant prompt assembly as fields change.
- **Validation**: required fields, missing info warnings, gentle quality checks.
- **History**: saved generations with inputs for later reuse.
- **User preferences & profile**: lightweight information (e.g., typical tone, audiences, domains) that helps personalize defaults and recommendations.
- **Autocomplete for task input (later)**: optional AI-assisted suggestions while typing a problem description to reduce friction.
- **Voice typing effect**: UI animation that makes dictated input feel like it’s being typed in real time.

## Primary flows

1. **Task → prompt (default)**: Describe a problem (typed or voice) in the terminal → app may ask a few clarifying questions → user receives one or more prompt candidates → refine and copy/export.
2. **Preferences**: Run `/preferences` → answer a few short questions → app updates stored tone, audience, and domain defaults used when shaping prompts.
3. **Templates and history (later)**: Manage templates and reuse past generations through additional terminal commands (for example, `/templates`, `/history`).

## Core surface

- A single PromptForge terminal:
  - One page, terminal-style UI with a scrolling log and an input at the bottom.
  - All interactions—tasks, preferences, templates, and history—are initiated by typing into the terminal.

## Design principles

- Minimalist, calm, and distraction-free
- Speed first: generate → copy is always one click away
- Guided, not bossy
- Trustworthy and predictable
- Delight through details: microcopy, spacing, shortcuts, and polish
