---
name: finance-traceability-link
purpose: Link operational facts to financial traceability when the product includes money movements.
---

# Skill: Finance traceability link

## Why it exists

When the product tracks money alongside operations, value comes from **linking** operational events to financial records—not duplicating ad hoc ledgers.

## What it solves

- Maps operational actions (orders, payments, adjustments, etc.) to financial movements.
- Standardizes idempotent registration from a known source (`sourceType`, `sourceId`, metadata).
- Keeps totals consistent (accrued, paid, pending, balance).

## When to use

- Any new action with monetary impact **in this product’s domain**.
- Changes to partial payments, allocations, or summaries.
- Building financial summaries for operational entities.

## Expected inputs

- Operational event with economic effect.
- Source reference and metadata rules.
- Amount, date, category, and actor rules.

## Internal steps

1. Define the financial fact (direction, category, amount).
2. Define idempotency for the origin (avoid duplicates on retry).
3. Register automatic ledger/transaction rows with useful metadata.
4. Update entity financial summaries as required by the domain.
5. Record history or audit entries explaining the movement.
6. Validate partials and limits (no over-payment unless allowed).

## Deliverables

- Specification for operational ↔ financial linkage.
- Implementation of registration and events.
- Integrity checks.

## Rules

- Do not create a second competing ledger model without explicit architecture approval.
- Do not record money without a referencable source.
- Do not mix process state with payment state without clear naming.

## Common mistakes

- Double registration on retries.
- Inconsistent totals from rounding.
- Losing actor or document traceability.
