# Glossary (template)

> Per-product vocabulary. Keeps UI, APIs, and docs aligned.

| Term | Definition | Avoid confused with |
|------|------------|---------------------|
| **Workspace** | Active scoped context under an account (what the shell switches; aligns with `/auth/me` → `workspaces`). | `business` as tenant name, ambiguous `context`. |
| **Account** | Billing root: tier, billing plan, member limits. | A single workspace. |
| **Capability** | Gated action/feature (`enabled` + optional `reason`). | Informal “permission” strings without structure. |
| **Tier** | Account tier driving limits. | Workspace-specific plan. |
| **Billing plan** | Commercial plan label on the account. | Payment provider SKU names unless you define them as the same. |

## UI labels

Preferred capitalization and language (e.g. Spanish vs English):

-

## API naming

Pluralization, resource names, query param conventions:

-

## Forbidden legacy terms

Terms from **previous** products must not appear in new copy or public contracts:

- Using **`business`** / **`tenant`** for the **same concept as workspace** (unless your product glossary explicitly revives them).
- Ambiguous **`context`** as a noun for “which company we’re in” — use **workspace** or **account**.
