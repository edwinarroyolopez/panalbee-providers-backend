---
name: operational-state-traceability
purpose: Model traceable states and events in operational flows.
---

# Skill: Operational state traceability

## Why it exists

Operational modules often depend on **states** and **reconstructable history** for daily use and audits.

## What it solves

- Practical state machines without over-engineering.
- Business events explainable in timelines or history logs.
- Transition rules and role-based blocks.

## When to use

- New states or flow changes.
- Timelines or operational history UX.
- Fixes when live state disagrees with recorded events.

## Expected inputs

- Target entity in **your** domain map.
- Current and desired states.
- Role and capability rules.

## Internal steps

1. Enumerate valid states.
2. Declare allowed and forbidden transitions.
3. Require an event for each important transition.
4. Define minimum event metadata (actor, time, relevant amounts).
5. Keep backend as source of truth for transitions.
6. Expose fields for timeline UX without ambiguous client-only inference.

## Deliverables

- Table `current_state → action → next_state`.
- Catalog of operational events.
- Mandatory backend validations.

## Rules

- Avoid silent retroactive changes without an explicit event or policy.
- Do not mutate critical state from clients without backend validation.
- Keep event copy understandable to operational users.

## Common mistakes

- Uncontrolled rollbacks.
- Missing actor or timestamp.
- Timelines full of technical noise without business meaning.
