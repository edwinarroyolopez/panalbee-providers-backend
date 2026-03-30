---
name: operational-ui-flow-builder
purpose: Build forms and operational flows consistent with the product’s UX language and existing components.
---

# Skill: Operational UI flow builder

## Why it exists

Daily work happens in screens, modals, selectors, timelines, and quick actions. Inconsistency here drives adoption risk and errors.

## What it solves

- Registration/edit/payment-style flows using proven patterns in **the current** codebase.
- Reuse of shared layout, loaders, attachments, and selectors.
- Clear feedback: loading, success, error, retry.

## When to use

- New operational screens.
- New mutation modals or sheets.
- UX adjustments without breaking the shared design language.

## Expected inputs

- Primary screen intention.
- Form fields and validations.
- Backend actions and response states.

## Internal steps

1. Define the dominant intention of the screen.
2. Order hierarchy: context → primary action → detail.
3. Reuse components and patterns from reference modules in the repo.
4. Implement minimum validation for money, quantity, dates when applicable.
5. Immediate feedback and double-submit protection.
6. Integrate uploads when the flow needs evidence files.
7. Check empty/error/offline for critical actions.

## Deliverables

- Working screen or modal aligned with the design system.
- Complete UX states (loading/success/error/empty).
- Copy and action consistency notes.

## Rules

- Do not introduce a parallel mini design system.
- Avoid dense forms without hierarchy.
- Keep copy short, operational, and non-technical for end users.

## Common mistakes

- Multiple competing primary CTAs.
- Money/quantity inputs without consistent parsing.
- No visible confirmation after mutations.
