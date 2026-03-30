---
name: dashboard-composition-by-profile
purpose: Compose primary dashboards from a shared shell plus registry and reusable widgets—per operational profile when needed.
---

# Skill: Dashboard composition by profile

## Required references

1. `instructions/instructions.md`
2. `instructions/product-rules.md`
3. `instructions/backend-rules.md`
4. `instructions/app-rules.md`
5. Filled `project-context.template.md` and `feature-map.template.md`

## Why it exists

When the product serves different dominant operations per profile, the main dashboard should differ **without** duplicating entire apps or scattering conditionals.

## What it solves

- Pattern: **common shell + profile registry + modular widgets**.
- Separation between **primary operational** dashboard and **reusable deep** analytics or detail blocks.
- Backend contracts as composable blocks the client can arrange safely.

## When to use

- New or refactored primary dashboard.
- New operational profile.
- Reordering widgets or primary CTAs by context.

## Internal steps

1. Define the dominant operational question per profile (when profiles exist).
2. Define primary CTA per profile.
3. Define or adjust registry/config per profile.
4. Compose widgets from typed block contracts.
5. Keep deep analytics decoupled from the home surface where possible.
6. Safe fallback for incomplete profile configuration.

## Deliverables

- Table per profile: intent, CTA, widget order, deep-link routes.
- List of backend block contracts.
- Backend–client consistency checklist for the dashboard.

## Constraints

- Do not bury domain rules in the shared shell.
- Do not force a single hyper-generic dashboard when profiles genuinely differ.
- Do not break existing deep routes without migration notes.
