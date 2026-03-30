# Template Governance Rules

## Purpose

Define the canonical governance for converting `template-web`, `template-app`, and `template-backend` into reusable output templates that are safe to clone as new product starters.

This document is transversal.

Do not duplicate these rules in workflow/agents/skills. Those artifacts execute this policy.

## Scope

Applies when a task involves at least one of:

- template extraction
- template hardening
- reusable componentization
- domain decoupling
- starter cleanup for cloning

## Canonical decision classes

Every audited piece (module, component, hook, service, DTO, route, store, guard, decorator) must be classified in exactly one class:

1. `REUSABLE`: keep as template core
2. `ADAPT`: keep but refactor/rename/boundary-adjust
3. `EXAMPLE_ONLY`: keep as example/reference, not mandatory dependency
4. `REMOVE`: delete because it adds noise or drift
5. `QUARANTINE`: isolate temporarily until design stabilizes

No implementation should proceed without explicit class assignment.

## Boundary model (mandatory)

Use this boundary model across web/app/backend:

- `core/shared/base`: generic reusable primitives and cross-cutting contracts
- `domain`: business-specific behavior
- `examples/showcase`: demonstrative paths and sample flows
- `legacy/quarantine`: unstable or transitional pieces

Rules:

1. domain logic must not leak into base primitives
2. showcase/examples must not become runtime dependencies for core flows
3. wrappers that only rename/re-export behavior are not valid boundaries
4. route aliases that only mirror another screen are migration artifacts, not template architecture

## Coupling signals (must be audited)

Treat these as coupling/debt indicators:

- domain names hardcoded in shared UI/hooks/services
- business-specific copy in reusable components
- duplicated modal/hook wrappers with no behavior
- duplicated API wrappers with identical behavior
- mixed ownership in one folder (UI + contracts + side effects without boundary)
- cross-layer contract drift (DTO vs app types/hook assumptions)
- route-level aliases that only render another page

## Public component showcase policy (web)

If a public showcase route is introduced:

1. it must be explicitly public and isolated from protected business data
2. it must catalogue reusable components, not domain pages
3. each showcased component must document intent, variants, states, and usage constraints
4. showcase data must be local mock/demo-safe, never production-coupled
5. showcase is a template quality tool, not a mini-app

## Contract boundary policy (cross-template)

Contracts must keep clear ownership:

- backend: DTO validation, enforcement, reason semantics
- app/web: typed consumers, rendering states, user-facing interpretation

No silent contract transitions.

Any changed contract requires explicit impact mapping in consumers.

## Execution gates

A template change is not complete unless all gates pass:

1. classification gate (`REUSABLE/ADAPT/EXAMPLE_ONLY/REMOVE/QUARANTINE`)
2. boundary gate (core/domain/examples/legacy ownership clear)
3. duplication gate (redundant wrappers/aliases removed or justified)
4. contract gate (backend-app-web alignment where applicable)
5. starter gate (project remains clone-friendly, minimal hidden coupling)

## Documentation proportionality

Only create or modify documents when one of these is true:

1. a reusable transversal rule changed -> `instructions`
2. a reusable specialized decision role is needed -> `agents`
3. a reusable execution recipe is stable -> `skills`
4. task sequence changed -> `agent-workflow`

Do not create documents for temporary hypotheses.
