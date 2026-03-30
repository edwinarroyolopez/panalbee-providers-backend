---
name: business-workflow-design
purpose: Model business workflows before coding, for the active domain.
---

# Skill: Business workflow design

## Why it exists

Costly changes fail when implementation runs ahead of clear states, rules, and traceability.

## What it solves

- Flow design for operational modules (domain-specific).
- Explicit operational rules per entity.
- Impact mapping across backend, clients, and capabilities.

## When to use

- New domain module.
- Operational flow changes with states or events.
- Functional refactor of an existing process.

## Expected inputs

- Functional requirement.
- Target module paths in **the current** backend and client trees.
- Active context: enabled features, capabilities, tenancy rules.

## Internal steps

1. Read `agent-workflow.md` and relevant `instructions/*.md`.
2. Define primary operational intent.
3. List root entity and related entities.
4. Define valid states and transitions.
5. Define minimum traceable events.
6. Define blocks by role, capability, or state.
7. Define contract impact backend ↔ clients.

## Deliverables

- Short workflow doc (state, transition, event, block).
- Business rules in plain operational language.
- Per-layer change list.

## Rules

- Reuse-first; avoid parallel modules.
- Backend owns invariants.
- Respect capability/profile maps, not global hardcoding.

## Common mistakes

- Modeling only the happy path.
- Confusing financial state with operational state.
- Skipping blocked paths and user-visible messages.
