# template-web — system design y `src/components`

## Ubicación canónica

- **Primitives:** `template-web/src/components/ui/` (Button, Input, Card, …)
- **Composed reusables:** `template-web/src/components/<Nombre>/` (Modal, SideNav, ImageUpload, …)
- **Dominio:** `template-web/src/modules/<modulo>/components`
- **Vitrina pública:** ruta **`/system-design`** (`src/app/system-design/`), sin auth, datos mock, `noindex`

## Modal unificado

- Un solo **`@/components/Modal`** con `footer`, `size="narrow"`, `backdrop="soft"` (reemplaza el antiguo `AppModal`).
- Consumidores migrados: `LeaderEditorModal`, `ProspectEditorModal`.

## Política

- No duplicar overlays: modales de módulo deben converger a `Modal` cuando el flujo lo permita (ver backlog en la propia `/system-design` → Legacy).

## Obsoleto

- Carpeta `template-web/templates/` y alias `@templates/*` — eliminados.
- Ruta `/design-system` — sustituida por `/system-design`.
