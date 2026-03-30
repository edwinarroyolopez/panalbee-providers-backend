# Start a new product from this monorepo

Use this after cloning `template-web`, `template-app`, and/or `template-backend`. It ties together `agent-workflow.md` Phase 1–2 and the instantiation templates.

## Phase 1 — Instantiate (before feature work)

1. **Clone** the starters you need into a new repo or workspace.
2. **Read** `ai/instructions/instructions.md` and `ai/agent-workflow.md` (sections “Phase 1” and “Phase 2”).
3. **Copy and fill** (drop `.template` from the filename, e.g. `project-context.md`):
   - `ai/instructions/project-context.template.md` — identity, surfaces, auth, tenancy, capabilities, what is core vs example.
   - `ai/instructions/domain-map.template.md` — entities, language, boundaries.
   - `ai/instructions/feature-map.template.md` — routes, API map, gating.
   - `ai/instructions/glossary.template.md` — terms and forbidden legacy names.
4. **Wire environment**
   - Web: `NEXT_PUBLIC_API_BASE` → your API root (default in repo targets `http://localhost:7000/api`).
   - App: `template-app/src/config/apiBaseUrl.ts` dev/prod URLs.
5. **Prune** example/legacy trees you will not ship (see `template-app/src/README.md` for modules not on the starter navigator).
6. **Align native IDs** when you are ready: Android `applicationId`, iOS bundle id, Firebase files — not required to read the canon, but required before store release.

## Phase 2 — Build

1. Treat the filled `project-context` + `feature-map` as the definition of **the product**.
2. Follow `ai/agent-workflow.md` for every task (layers, contracts, audit gate).
3. Use agents/skills under `ai/agents/*.agent.md` and `ai/skills/*.skill.md` as needed.
4. Read **`ai/instructions/starter-semantics.md`** for canonical terms (`workspace`, `account`, `capability`, `tier`, `billingPlan`) and forbidden starter vocabulary.

## Workspace pattern (explicit)

In **template-web** and the **app shell**, “workspace” means a **scoped context** under an account (aligned with `template-backend` `workspaces` on `/auth/me`). Example-only and legacy-heavy app code lives under **`template-app/src/quarantine/legacy-domain/`** and must not be imported from `starter-*`, `auth`, or `system-design` surfaces.
