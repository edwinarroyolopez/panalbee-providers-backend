---
name: backend-app-contract-sync
purpose: Keep backend and client contracts consistent and safe across layers.
---

# Skill: Backend–client contract sync

## Why it exists

Cross-layer changes (DTOs, responses, hooks, screens) create debt when only one layer is updated.

## What it solves

- Aligns DTO/schema/controller/service with client types, hooks, and UI.
- Prevents silent payload and response breakage.
- Aligns cache invalidation and consumption of new fields.

## When to use

- New or changed endpoints.
- Enum, state, or field changes in responses.
- Error semantics the client must interpret.

## Expected inputs

- Backend diff or contract specification.
- List of client consumers for the endpoint.

## Internal steps

1. Build a contract table (field, type, required, semantics).
2. Adjust backend (DTO + service + controller + schema if applicable).
3. Adjust clients (`*.api.ts`, hooks, types, screens).
4. Review cache invalidation (e.g. React Query keys).
5. Review offline/sync when mutations apply.
6. Validate expected errors (validation, blocked, conflict).

## Deliverables

- Final contract matrix.
- Files touched per layer.
- Cross-layer validation checklist.

## Rules

- Avoid ambiguous transitional contracts.
- Do not duplicate endpoints for UI convenience only.
- If the backend changes, update **all** consumers.

## Common mistakes

- Updating types without hooks or mutations.
- Breaking field names used by cache keys or UI.
- Ignoring date/money formats and parsing on clients.
