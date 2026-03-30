# Agent workflow (canonical)

## Purpose

This file defines how any coding agent should work **in the instantiated project** and in the **starter** repositories (`template-web`, `template-app`, `template-backend`).

It is not a replacement for rule documents.  
Rule documents define **what** must be respected.  
This file defines **how** to approach the work.

### Mandatory companions

1. `./instructions/instructions.md`
2. `./instructions/product-rules.md`
3. `./instructions/backend-rules.md`
4. `./instructions/app-rules.md` (mobile); `./instructions/template-web-design-system.md` (web UI)
5. `./instructions/template-governance-rules.md` (template extraction / hardening)

Operational checklist: **`ai/START_NEW_PROJECT.md`**.

When building a **new product** from the starter, also use the filled copies of:

- `instructions/project-context.template.md`
- `instructions/domain-map.template.md`
- `instructions/feature-map.template.md`
- `instructions/glossary.template.md`

Read them before doing meaningful work.

---

## Core principle

> Do not jump into code just because the request sounds clear.

A good implementation must preserve:

- product clarity (per the project’s context)
- architectural consistency
- UX coherence on each surface
- backend ↔ client contract stability
- permission, capability, and plan logic when they exist
- traceability when the domain requires it
- maintainability

If code is added fast but damages the system, it is not a good implementation.

---

## Phase 1 — Project instantiation (before feature development)

Run this when **spinning up a new product** from the starter (new repo or new clone).

1. **Clone or copy** the relevant starters (`template-web`, `template-app`, `template-backend`).
2. **Define identity** — name, users, environments (see `project-context.template.md`).
3. **Define domain** — entities, language, boundaries (`domain-map.template.md`).
4. **Define surfaces** — which clients ship in v1; align env and API base URLs.
5. **Define auth model** — how users prove identity; token/session rules.
6. **Define tenancy** — none, account-scoped, workspace-scoped, or hybrid; default data scope.
7. **Define capabilities** — optional feature flags, plans, entitlements; how they are enforced (backend-first).
8. **Define bounded contexts** — module ownership; what stays starter-core vs example vs product.
9. **Prune examples** — remove or quarantine sample modules, copy, and routes that do not belong to the new product.
10. **Record decisions** in the filled templates so Phase 2 agents can read one source of truth.

Do not start large feature work until the **project context** and **feature map** are at least minimally filled.

---

## Phase 2 — Ongoing development (after instantiation)

Once Phase 1 is satisfied:

- follow the **standard workflow** below on every task
- treat `instructions.md` + filled templates as the definition of **the product**
- implement on **the current web**, **the current app**, and/or **the current backend** as scoped in the request
- reuse starter patterns without dragging in **legacy domain** names or flows removed at instantiation

---

## Domain-aware principle

**The active domain** is whatever the filled **domain map** and **glossary** say it is—not a fixed industry baked into the starter.

Before implementing, confirm whether behavior should:

- reuse the shared shell and patterns
- adapt vocabulary, entities, and flows to the active domain
- be enabled or disabled by capabilities, plans, or profile

Avoid static assumptions like “one flow fits all customers” when the product defines multiple profiles.

---

## Standard workflow

Every task should follow this sequence:

1. Understand the request
2. Identify domain / profile context (from templates when available)
3. Identify affected layers (product, backend, app, web, cross-layer)
4. Read the relevant files
5. Identify existing patterns in **the current** codebase
6. Define the business rule in plain language
7. Define contract changes (if any)
8. Implement safely
9. Verify consistency
10. Test or validate logically
11. Run the implementation audit gate when required
12. Summarize what changed and follow-ups

Do not skip steps.

---

## 1. Understand the request

Rewrite the task in precise terms. Ask:

- What problem is actually being solved?
- Is this product, backend, app, web, or cross-layer?
- New feature, fix, refactor, or UX improvement?
- Is there a hidden business rule?
- Does it affect roles, capabilities, plans, or upgrades?

---

## 2. Identify domain / profile context

When templates exist:

- Which profile, workspace, or mode is affected?
- Which entities and language apply?
- What remains shared across profiles?
- Which capabilities gate the behavior?

Design so the product can evolve without duplicating entire clients.

---

## 3. Identify affected layers

**Product** — meaning, flows, vocabulary, gating, what the user should understand.

**Backend** — rules, validation, permissions, schemas, services, APIs, invariants.

**App / web** — screens, navigation, components, states, gating UI, offline/sync (app).

Treat multi-layer tasks as **cross-layer**; do not implement as if local to one file.

---

## 4. Read relevant files first

Locate modules, services, controllers, screens, hooks, DTOs, guards, and existing tests. Prefer extending patterns over inventing new ones.

---

## 5. Identify existing patterns

Before creating anything new, search for similar modules, guards, forms, lists, loaders, and gating. Preference order: reuse → extend → create.

---

## 6. Define the business rule explicitly

State the rule in plain language. If you cannot, you are not ready to code it cleanly.

---

## 7. Define contract impact

For backend ↔ client work: request/response shape, errors, new fields, gating semantics. Update **all** consumers. Avoid ambiguous transitional APIs.

---

## 8. Implement safely

Small, cohesive changes; clear naming; explicit logic; respect module boundaries.

### Backend

Thin controllers; logic in services; validate input; enforce access; meaningful errors; traceability when needed.

### App / web

Respect shell and navigation; reuse components; loading / empty / error / blocked states; gating and copy aligned with glossary.

### Cross-layer

Business rule clarity first; contract second; backend truth before client interpretation; same language both sides.

---

## 9. Validate consistency

Check alignment with product intent, patterns, UX, access model, contracts, and complexity.

---

## 10. Testing and validation

Validate success, invalid input, unauthorized, limits, empty, loading, error, retry, offline (if relevant). Use project-defined commands.

---

## 11. Implementation audit gate

Before calling a task done when the change is cross-layer, new operational flow, or gating-sensitive, run an explicit audit:

1. real entrypoint and navigation continuity
2. contract alignment across consumers
3. DTO / schema / persistence coherence
4. backend enforcement for critical blocks
5. client blocked / pending / ready / error / success states
6. help keys and content (if used)
7. validation commands executed and reported

Use `skills/implementation-release-audit.skill.md` and, when appropriate, `agents/implementation-auditor.agent.md`.

---

## 12. Refactors, features, bugs, UX, access control

Same discipline as before: preserve behavior unless intentional; fix root causes; access work must answer who sees, who acts, what blocks, and how it is enforced on the backend.

---

## 13. Documentation updates

When introducing durable rules (capabilities, limits, contracts, patterns), update the filled templates or rule docs—do not rely only on code.

---

## 14. Final output expectations

Summarize: what changed, why, modules touched, layers, contracts, access implications, risks, reusable patterns.

---

## 15. Pace

Move fast only when clarity is preserved. **The project** should grow with discipline, not by accident.

---

## 16. Template transformation lane

When the task is extraction / hardening / reusable output for `template-web`, `template-app`, or `template-backend`:

1. Run `skills/template-readiness-audit.skill.md`
2. Classify pieces (`REUSABLE` / `ADAPT` / `EXAMPLE_ONLY` / `REMOVE` / `QUARANTINE`)
3. Define boundaries (core starter, domain, examples, legacy)
4. Run decoupling / folder-boundary / optimization skills as needed
5. Close with `agents/template-release-auditor.agent.md`

Recommended agents: `template-system-architect`, `template-web-component-governor`, `template-contract-boundary-guardian`, `template-release-auditor`.

Mandatory output: readiness matrix, boundary map, prioritized actions, residual risks.

---

## 17. Agent and skill map (reference)

| Concern | Agent / skill |
|--------|----------------|
| Cross-layer contracts | `agents/contract-integrator.agent.md`, `skills/backend-app-contract-sync.skill.md` |
| Domain workflows | `agents/domain-workflow-architect.agent.md`, `skills/business-workflow-design.skill.md` |
| UX operations | `agents/operational-ux-guardian.agent.md`, `skills/operational-ui-flow-builder.skill.md` |
| Profile / capability architecture | `agents/specialization-context-architect.agent.md`, `skills/capability-profile-feature-gating.skill.md`, `skills/dashboard-composition-by-profile.skill.md` |
| Release quality | `agents/implementation-auditor.agent.md`, `skills/implementation-release-audit.skill.md` |
| Template hardening | `agents/template-*.agent.md`, `skills/template-*.skill.md` |
