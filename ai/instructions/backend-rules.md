# Backend engineering rules (starter-aligned)

## 1. Role of the backend

The backend is the **source of truth** for domain rules, data integrity, access control, and stable contracts for clients.

The frontend may guide experience; the backend **decides** what is allowed and what is true.

---

## 2. Core principle

> No critical rule should depend only on the client behaving correctly.

---

## 3. Modularity

Organize by **bounded context** or domain module (auth, users, accounts, capabilities, uploads, etc.—extend as your product grows).

Preferred structure per module:

```txt
src/
  <module>/
    <module>.module.ts
    <module>.controller.ts
    <module>.service.ts
    dto/
    schemas/
    guards/
    constants/
    utils/
```

Do not collapse boundaries without a strong reason.

---

## 4. Controllers and services

- Controllers: HTTP boundaries, validation pipes, orchestration.
- Services: business logic, invariants, persistence coordination.

Keep controllers thin.

---

## 5. Validation and schemas

Validate all incoming data. Keep DTOs and persistence schemas aligned with real rules, not with temporary UI shapes.

---

## 6. Persistence

- stable field names
- explicit states where they matter
- timestamps when they improve traceability or auditing
- indexes justified by query patterns
- avoid shaping the database only for one screen

---

## 7. Access model (layered)

Design access in layers appropriate to your product:

### Roles

Who may **attempt** a class of actions.

### Account-level permissions

Fine-grained toggles for account-scoped behavior (keep them coherent; avoid boolean sprawl).

### Capabilities and plans

What is **enabled** for the account, workspace, or subscription tier.

Every sensitive feature should answer:

1. What enables it?
2. Is it tied to a plan, role, capability, or tenant rule?
3. What happens when access is blocked?

---

## 8. Plan limits

Limits are business rules. Each should have a clear source, name, user-visible consequence, and structured response—avoid generic “forbidden” for limit cases.

---

## 9. Upgrade-aware behavior

If the product monetizes, the backend should explicitly resolve plan, entitlements, and structured block reasons for clients to render.

---

## 10. Domain examples (illustrative only)

The following are **patterns** many products use; implement only what your domain map requires:

- **Commerce-style flows** — orders, payments, stock movements may need partial states, history, and linkage between documents.
- **Inventory-style** — material changes should be explicit and traceable, not silent.
- **Obligations** — separate “what happened” from “what is still owed” when both exist in your model.

Adapt naming and modules to **your** glossary, not to any legacy app.

---

## 11. Traceability

When the domain requires it, important actions should leave reconstructable traces (events, audit fields, or append-only history). Prefer explicit operations over hidden side effects.

---

## 12. Contracts with clients

Responses should be predictable: consistent naming, stable shapes, classifiable errors, reason codes when helpful. Clients should not guess business meaning from ambiguous payloads.

If the product has multiple profiles or modes, contracts may expose **stable shared fields** plus clearly named specialized blocks.

---

## 13. Error handling

Differentiate at least: validation, not found, unauthorized/forbidden, limit reached, conflict, internal failure. Do not leak sensitive internals.

---

## 14. Testing priorities

Prioritize:

1. services with domain logic
2. guards and access checks
3. capability and limit enforcement
4. critical end-to-end flows defined in your feature map

---

## 15. What must never happen

Never:

- put heavy logic only in controllers
- trust the client for critical validation
- duplicate access rules without ownership
- mutate balances or stock without clear rules
- return vague errors for meaningful business blocks
- couple unrelated domains for short-term speed

---

## 16. Final backend rule

The backend must make the product **trustworthy**. If the system cannot enforce its own truth, the product becomes decorative.

---

## 17. Profile-aware or multi-tenant backends

When the product has multiple workspace types or tenants:

- separate shared cross-cutting services from profile-specific orchestration
- avoid one giant service accumulating unrelated conditionals
- keep feature maps consistent across capability resolution, guards, and emitted context for clients

---

## 18. Cross-layer release gate

Backend changes that enable, block, or condition operational behavior should pass a cross-layer gate (see `agent-workflow.md`):

1. DTO validation matches the real rule
2. routes and parameters are explicit
3. services enforce the rule
4. persistence matches ownership and states
5. client compatibility is explicit
6. blocked responses are structured for clear UI
7. domain ownership is correct (tenant vs account vs user scope)

No backend feature is complete if clients cannot interpret its states safely.
