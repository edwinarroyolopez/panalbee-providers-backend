# Starter — Instructions (canonical entry)

## Purpose

This file is the entry point for any human or coding agent working on **the instantiated project** (the product you are building on top of `template-web`, `template-app`, and/or `template-backend`).

The codebase evolves through coordinated layers:

1. **Product discipline** (`product-rules.md`)
2. **Backend engineering** (`backend-rules.md`)
3. **App / web UX and design system** (`app-rules.md`, `template-web-design-system.md` when working on web)

Read these before implementing anything meaningful.

---

## Before the first feature: project instantiation

When starting a **new product** from this repo, complete **Phase 1 — instantiation** (see `agent-workflow.md` and **`ai/START_NEW_PROJECT.md`**) before deep feature work.

Fill or derive from the templates in `instructions/*.template.md`:

- `project-context.template.md`
- `domain-map.template.md`
- `feature-map.template.md`
- `glossary.template.md`

Copy each to a project-local file (for example `ai/instructions/project-context.md`) or merge into your product wiki. The templates are **not** rules; they capture identity, domain, surfaces, auth, tenancy, and capabilities for **your** product.

---

## Mandatory reading order

Before making changes, read in this order:

1. `instructions/instructions.md` (this file)
2. `instructions/product-rules.md`
3. `instructions/backend-rules.md`
4. `instructions/app-rules.md` (mobile); for web, also `instructions/template-web-design-system.md`
5. `instructions/template-governance-rules.md` when the task is template extraction, hardening, or reusability work
6. `agent-workflow.md` for execution sequence and audit gates

Do not skip layers.

A change that works technically but violates product clarity is wrong.  
A change that looks good visually but breaks architectural consistency is wrong.  
A change that solves one screen but damages system coherence is wrong.

---

## How to think about the system

The starter is not “just CRUD.” Treat it as a system that may include:

- bounded contexts and domain modules
- roles and permissions
- account capabilities and plan limits
- upgrade paths
- contextual navigation
- traceability
- offline-aware flows (app)
- reusable UI patterns
- a consistent product voice

Do not reduce the product to isolated screens. Use **`instructions/project-context.template.md`** (once filled) as the source of what “the product” means for this clone.

---

## Optional: multiple profiles, tenants, or industry modes

In **this monorepo’s starters**, prefer the vocabulary in `ai/instructions/starter-semantics.md` (**workspace** for active scope, **account** for billing root). “Tenant” belongs in *your* glossary if you run true multi-tenant SaaS—not as a silent synonym in template code.

If **your** product serves more than one kind of customer, workspace, or industry mode:

- keep a **shared shell** (auth, layout, shared components, conventions)
- drive differences from **explicit configuration** (capabilities, feature maps, registries), not from scattered conditionals
- adapt vocabulary and primary flows to the **active context** described in your domain map

If the product is **single-domain**, keep the architecture simple; do not import multi-profile machinery “just in case.”

---

## Design philosophy

Build with strong product discipline:

- clarity over decoration
- reduction over accumulation
- coherence over novelty
- elegance through usefulness
- hierarchy over noise
- confidence through simplicity

This does **not** mean empty minimalism. It means removing friction until the product feels obvious.

---

## Cross-layer implementation rule

Every important change must answer:

1. What real problem does this solve?
2. Which bounded context or module does it belong to?
3. Which layer(s) does it affect?
4. What contracts does it touch?
5. What roles, permissions, capabilities, or limits are involved?
6. What should the user see, feel, or understand after the change?
7. How will it be tested?
8. How does it stay consistent with the product language in your filled context templates?

If these cannot be answered clearly, implementation is premature.

---

## Rules for coding agents

Before implementing:

1. Read the rule documents that apply to your task.
2. Identify whether the change is product, backend, app, web, or cross-layer.
3. Search for existing patterns before creating new ones.
4. Respect modular boundaries and folder ownership.
5. Respect the current shell and UX language.
6. Respect roles, permissions, capabilities, and plan limits when they exist.
7. Do not break backend ↔ client contracts.
8. Keep naming and copy clear.
9. Prefer small safe changes over chaotic rewrites.
10. If you find structural inconsistency, propose improvement instead of patching blindly.
11. Align with the **active domain** and feature map defined for this project (when those files exist).

---

## Mandatory implementation audit rule

No meaningful change is finished just because it compiles.

Every significant change must close with an explicit implementation audit (see `agent-workflow.md`).

Minimum audit scope:

1. entry point and real navigation path
2. backend–client contract consistency
3. DTOs, schemas, and persistence alignment
4. roles / capabilities / plan gating behavior
5. help keys and real help content (if the product uses them)
6. loading / success / error / blocked states
7. readiness as enforceable behavior, not cosmetic
8. backend enforcement for critical rules (not frontend-only)
9. impacted consumers and dependent flows
10. validation commands actually executed

A cross-layer change is complete only when product, backend, clients, contracts, and guidance are operationally coherent.

---

## Canonical location of AI governance

**Source of truth** for agent behavior in this repository:

- `/ai/agent-workflow.md`
- `/ai/instructions/*.md` and `/ai/instructions/*.template.md`
- `/ai/agents/*.agent.md`
- `/ai/skills/*.skill.md`

Historical copies under `template-app/ai/` are **deprecated**; use the repo root `ai/` tree only.

---

## Template transformation mode

When the task is to turn code into a reusable template or to harden `template-web` / `template-app` / `template-backend`, follow `instructions/template-governance-rules.md`.

Prioritize:

1. reusable boundaries over feature velocity
2. decoupling domain-specific naming and behavior
3. stable contracts and folder ownership
4. removal or quarantine of noisy wrappers and duplicated thin layers
5. a clean path for cloning new products
