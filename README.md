# PromptForge

PromptForge is a minimalistic, high-craft prompt generator that helps people turn fuzzy goals into clear, reusable prompts in seconds.

## Core idea

PromptForge offers two complementary ways to get from fuzzy intent to a clear prompt:

- A **Fast & Easy** flow (default) where users describe their task in plain language (typed or voice). The app may ask a few clarifying questions and then proposes ready-to-use prompt variants that can be refined further.
- An **Enchanted** sandbox where users deliberately choose templates and settings, shaping precise prompt recipes they can reuse and iterate on.

Under the hood, both flows share the same template system and history so users can move smoothly between quick assistance and deep control.

## High-level features

- Fast & Easy flow: describe your task (voice or text), answer lightweight clarifying questions, and receive several ready prompts you can tweak.
- Enchanted sandbox: a calmer, more advanced space where you pick templates, tune fields, and refine prompts with full control.
- Templates: reusable prompt blueprints (private and shareable).
- Fields (variables): structured inputs like role, audience, tone, constraints, format, examples.
- Live preview: see the final prompt update instantly as fields change.
- Validation: required fields, missing info warnings, gentle quality checks.
- History: save generated prompts with their filled inputs for later reuse.
- Export: plain text, markdown, and structured template+input snapshots.
- (Later) Autocomplete for task input: optional AI-assisted suggestions while typing the problem description.

## Initial structure

This repository will grow into a small, calm web app focused on:

- Fast clarity and consistent prompt quality
- A single-screen, distraction-free generator flow
- A template builder with split view (fields on the left, prompt + preview on the right)

Further technical and architectural details will be added as the implementation evolves.
