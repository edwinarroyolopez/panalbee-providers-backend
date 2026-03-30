# Product discipline (for projects built on this starter)

## 1. What this document is

These rules apply to **the product you are building** after you instantiate the starter. They are not tied to any former domain.

Use your filled **`project-context.template.md`**, **`domain-map.template.md`**, and **`glossary.template.md`** to resolve vocabulary, entities, and priorities.

---

## 2. Core mission

The product should help its users **understand, act, and decide** with less friction.

Typical questions (adapt to your domain):

- What is the current state that matters?
- What actions are available now?
- What is blocked and why?
- What changed recently and can be trusted?

If the product does not make those answers easier, it is drifting.

---

## 3. Product principle

> If the primary user cannot tell what to do next in a few seconds, the experience is not finished.

---

## 4. Values

Optimize for:

- clarity
- speed
- confidence
- usefulness
- low cognitive load
- traceability (when the domain requires it)
- sustainable evolution

---

## 5. Product truth

Most users do not need more features; they need **less confusion**.

Reduce:

- operational noise
- duplicated work
- uncertainty
- avoidable mistakes
- friction during daily use

---

## 6. Decision framework

Evaluate features, screens, and flows with questions such as:

1. Does this improve clarity?
2. Does this reduce friction?
3. Does this support a real decision or action?
4. Does this match how the domain works in reality?
5. Does this fit the product language defined in your glossary?
6. Can it be understood without training?

If most answers are no, reject or redesign.

---

## 7. Not just CRUD

Treat the system as including, when applicable:

- domain logic and invariants
- roles and permissions
- capabilities and plan limits
- upgrade or entitlement mechanics
- context-aware navigation
- feedback loops
- traceability
- offline-aware operation (clients)

Never design as if the product were only “create, list, edit, delete.”

---

## 8. Shared shell vs domain behavior

Separate:

- **Shared system behaviors** — navigation patterns, trust, feedback, attachments, shared components
- **Domain behaviors** — entities, workflows, priorities, vocabulary

For each feature ask:

- what is universal to this product?
- what is specific to a tenant profile, industry mode, or workspace type?
- which capabilities or flags enable that behavior?

Do not force every customer into one rigid operational model unless your context says so.

---

## 9. Intention-driven modules

Modules should serve a **clear user intention** (register X, review Y, resolve Z), not only expose an entity.

---

## 10. Coherence

The product should feel like **one product**:

- naming and copy
- screen structure and hierarchy
- error and loading states
- upgrade or limit messaging
- navigation behavior

Avoid fragmented mini-products inside the same app or site.

---

## 11. Traceability

When the domain requires it, prefer systems that can explain **how** important states were reached, not only final snapshots.

---

## 12. Real-world usage

Design for stressed users, imperfect connectivity, and messy data—unless your context explicitly targets a different audience.

---

## 13. Plans, limits, and monetization

When the product uses plans or limits:

- communicate blocks with clarity and dignity
- blocked states should feel understandable, not broken
- upgrade paths should feel like progression, not punishment

---

## 14. Product language

Prefer language that is direct, short, useful, calm, and appropriate to the domain. Avoid engineering jargon in user-facing copy.

---

## 15. Growth

New decisions should allow future growth. Avoid local fixes that create systemic inconsistency or names that cannot scale.

---

## 16. Final product rule

The product should feel like **complexity removed on the user’s side**, not complexity disguised as software.

---

## 17. Optional: dominant operation per profile

If your product defines **profiles** (e.g. industry modes, workspace types), each profile may define a **dominant operation** (the thing users care about first).

Primary surfaces (home, dashboard, main CTA) should reflect that dominant operation for the active profile. Deep analytics or secondary areas may reuse cross-cutting blocks when semantics align.

---

## 18. Adding a new profile or mode

Do not add a new profile with only an enum label. Include at least:

1. operational intent
2. dominant entities and state model
3. feature map and gating
4. primary dashboard or landing composition (if applicable)
5. backend contracts (summary / detail / mutations)
6. client navigation or menu adaptation
7. traceability expectations (if any)
