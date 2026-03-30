---
name: capability-profile-feature-gating
purpose: Apply consistent feature gating by capability, plan, or operational profile across backend and clients.
---

# Skill: Capability / profile feature gating

## Required references

1. `instructions/instructions.md`
2. `instructions/product-rules.md`
3. `instructions/backend-rules.md`
4. `instructions/app-rules.md` (and web design system when UI is web)
5. Filled `feature-map.template.md` (per project)

## Why it exists

Products with multiple workspaces, tiers, or profiles need endpoints, guards, and navigation to stay aligned with the **active context**—without drift between layers.

## What it solves

- Coherent feature maps per profile or tier.
- Sync between backend guards and client visibility / lock states.
- Prevention of routes that appear supported but are not backed by the API or domain.

## When to use

- New feature or module with gating.
- Changes to capability or profile maps.
- Bugs where UI and backend disagree on access.

## Internal steps

1. Review feature map in backend and clients.
2. Validate guards per endpoint.
3. Validate menus, primary routes, and deep links.
4. Validate fallback when context is missing.
5. Validate blocked messaging matches glossary and product rules.

## Deliverables

- Matrix: `profile or tier × feature × endpoint × screen`.
- Inconsistencies and fixes.
- Checklist for onboarding a new profile (when applicable).

## Constraints

- Backend is source of truth.
- Hiding a button is not a security model.
- Avoid duplicating gating rules without ownership.
