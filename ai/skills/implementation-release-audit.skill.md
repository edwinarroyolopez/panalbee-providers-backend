---
name: implementation-release-audit
purpose: Audit implementations before closure to ensure operational coherence across layers.
---

# Skill: Implementation release audit

## Why it exists

A successful build does not imply release readiness. Changes can compile yet fail from contract drift, incomplete gating, missing help content, or cosmetic-only “ready” states.

## What it solves

- Closes the loop across product intent, backend, clients, and guidance.
- Surfaces partially applied contracts.
- Finds orphan routes or UIs without backend support.
- Checks help keys and actionable content when the product uses help.
- Verifies gating is enforced on the backend, not only hidden in UI.
- Validates ownership (tenant/account/domain scope).

## When to use

- End of any significant cross-layer change.
- Before calling a new operational module “done.”
- Before merge or release of capability- or state-sensitive work.

## Expected inputs

- Implemented requirement.
- Changed backend and client files.
- Affected consumers list.
- Executable validation commands.

## Internal steps

1. Review `agent-workflow.md` and relevant `instructions/*.md`.
2. Verify entrypoint and real navigation.
3. Verify backend–client contract across DTO/controller/service/schema vs types/hooks/UI.
4. Verify persistence ownership and scoping.
5. Verify operational states (pending/blocked/ready/error/success).
6. Verify help trigger, key, and content (if applicable).
7. Verify backend enforcement for critical blocks.
8. Verify impacted consumers; no silent drift.
9. Run and report technical validation.
10. Issue final verdict.

## Deliverables

- Verdict: `PASS` / `PASS WITH RISKS` / `FAIL`.
- Severity-ranked findings.
- Validation matrix.
- Residual risks and corrective actions.

## Relationship to other skills

- Does not replace `backend-app-contract-sync.skill.md`; uses it for contract detail.
- Does not replace `business-workflow-design.skill.md`; validates that states and rules were applied.
- Does not replace `capability-profile-feature-gating.skill.md`; validates real gating behavior.
- Does not replace `operational-ui-flow-builder.skill.md`; validates operational UX closure.

## Common mistakes

- PASS based only on compilation.
- Skipping real screen/hook consumers.
- Accepting frontend-only blocks without backend enforcement.
- Accepting help keys without actionable content.
- Accepting “ready” UI that does not change real behavior.
