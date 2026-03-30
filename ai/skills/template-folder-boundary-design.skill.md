---
name: template-folder-boundary-design
purpose: Disenar fronteras de carpetas claras para evitar mezcla de responsabilidades en templates.
---

# Skill: Template Folder Boundary Design

## Por que existe
Las fronteras de carpetas actuales mezclan en algunos puntos componentes, modulo de dominio, hooks y wrappers redundantes.

## Que resuelve
- Define ownership claro por carpeta.
- Reduce mezcla entre core reusable y dominio.
- Establece ubicacion oficial para ejemplos/showcase y cuarentena.

## Cuando usarlo
- Refactors estructurales en web/app/backend.
- Cuando hay dudas de donde vive cada pieza reusable.

## Que revisa primero
1. `instructions/template-governance-rules.md` (boundary model)
2. Arbol real de carpetas en los tres templates.
3. Entrypoints y consumidores principales.

## Pasos
1. Mapear estructura actual por capa.
2. Asignar ownership por bloque (`core/shared/base`, `domain`, `examples/showcase`, `legacy/quarantine`).
3. Definir movimientos necesarios minimizando churn.
4. Validar imports y dependencias cruzadas.

## Entregables
- Mapa de fronteras de carpetas objetivo por proyecto.
- Lista de movimientos recomendados.
- Reglas de ubicacion para nuevas piezas.

## No debe hacer
- No crear carpetas vacias para "orden visual".
- No romper rutas publicas/protegidas sin plan de migracion.

## Colabora con
- `template-system-architect`
- `template-contract-boundary-guardian`
