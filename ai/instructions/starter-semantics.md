# Starter semantics (canonical)

Single source of truth for **this monorepo’s reusable starters** (`template-web`, `template-app`, `template-backend`, `ai/*`). Product repos copy `project-context` / `glossary` and may override; until then, this file is the canon.

## Canonical terms

| Term | Meaning |
|------|---------|
| **Account** | Billing + identity root (tier, billing plan, limits). One user belongs to an account. |
| **Workspace** | **Active scoped context** under an account (tenant scope for data and UI). What the shell switches. Aligned with `GET /auth/me` → `workspaces[]`. |
| **Scope** | Abstract “where this request/UI applies”; in code prefer naming **`workspace`** or **`workspaceId`** unless you mean JWT/account scope. |
| **Capability** | Gated feature or action (`CapabilityFlag`, plan/role/tier reasons). |
| **Tier** | Account tier enum (limits template). |
| **Billing plan** | Commercial/plan label on the account (`billingPlan`). |

## Canonical term for “active context”

- **Canonical:** **workspace** (and `activeWorkspaceId` in auth state; optional rich **`OperationalWorkspaceContext`** only under `template-app/src/quarantine/legacy-domain/` for example domain modules).
- **Use in:** Shell (header, menu), `/auth/me` mapping, client DTOs, backend `me()` payload, AI instructions and checklists.
- **Do not use for the same concept:** `business`, `tenant`, `context` (as a noun for tenancy), or `mine` / product-specific scope names in **new** starter code or public copy.

## Allowed vs prohibited (starter canon)

**Allowed**

- `workspace`, `workspaces`, `activeWorkspaceId`, `workspaceId` (sample domain HTTP paths in the app use **`/workspaces/...`** as the canonical segment; map legacy **`business`** / **`businessId`** keys only at API boundaries when talking to older servers).
- `account`, `tier`, `billingPlan`, `usage` (`workspaces` / `members` counts).
- `capability` / `capabilities` / `CapabilityFlag`.
- `OperationalWorkspaceContext` (quarantine only) for rich example-domain state; nested field **`workspace`** holds `{ id, name, type, ... }`.

**Prohibited in canonical surfaces** (root navigators, `auth`, shared stores outside quarantine, marketing copy in starters, backend `me()` shape):

- Using **`business`** / **`Business`** to mean the **tenant scope** (UI labels, store names, `/me` fields).
- **`tenant`** in user-facing copy or client types for this starter (reserved for true multi-tenant SaaS docs if your product glossary reintroduces it).
- Ambiguous **`context`** as “the company we’re in” — use **workspace** or **account** explicitly.

**Quarantine**

- Example domain modules may keep **filenames** from older iterations (e.g. `ListBusinessScreen`, `businesses.api.ts`) while **exports, types, and URLs** align to workspace vocabulary. Ingestion code may read legacy DTO keys (`business`, `businessId`, `businessName`) and normalize into workspace-shaped state.

## Where this decision lives

- This file: `ai/instructions/starter-semantics.md`
- Checklist: `ai/START_NEW_PROJECT.md` (workspace pattern + pointer here)
- Per-product overrides: filled `ai/instructions/glossary.md` (from `glossary.template.md`)
