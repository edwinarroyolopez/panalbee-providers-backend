# Project context (template)

> Copy to `project-context.md` (or your wiki) and fill before major feature work.

## Identity

- **Product name**:
- **One-line value proposition**:
- **Primary users** (roles):
- **Environments** (dev/stage/prod URLs or notes):

## Surfaces

- **Web** (`template-web`): Y/N — purpose:
- **Mobile app** (`template-app`): Y/N — purpose:
- **Backend** (`template-backend`): Y/N — API base path:

## Auth model

- Mechanism (e.g. JWT, session, OAuth):
- Identity fields (phone, email, SSO, …):
- Refresh / logout rules (summary):

## Tenancy and scope

- **Multitenancy**: none / account / workspace / hybrid — describe:
- **Default scope** for data (user, account, workspace):

## Capabilities and entitlements

- How capabilities or plans are represented (backend + clients):
- List of base capabilities for this product (or “TBD”):

## Bounded contexts

List modules or contexts and one-line ownership each:

| Context | Owns (entities / rules) |
|--------|-------------------------|
|        |                         |

## Starter vs product code

- What stays **core starter** (do not couple to domain):
- What is **example only** (safe to delete or replace):
- What is **product-specific** (your IP):

## Links

- Filled **domain map**: (path)
- Filled **feature map**: (path)
- Filled **glossary**: (path)
