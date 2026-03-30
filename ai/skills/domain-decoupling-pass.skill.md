---
name: domain-decoupling-pass
purpose: Detectar y desacoplar naming, tipos y reglas demasiado amarradas al dominio original.
---

# Skill: Domain Decoupling Pass

## Por que existe
Un starter reusable falla cuando conserva nombres, estructuras y supuestos de un negocio especifico en capas supuestamente compartidas.

## Que resuelve
- Localiza acoplamiento de dominio en UI/hooks/services/stores/DTOs.
- Propone neutralizacion por renombre, adapters o aislamiento en `domain`.
- Evita que core reusable dependa de vocabulario de negocio original.

## Cuando usarlo
- Antes de publicar un template como base clonable.
- Cuando aparecen nombres de dominio en carpetas shared/base/core.
- Cuando hay contratos con campos ambiguos o demasiado especificos.

## Que revisa primero
1. `instructions/template-governance-rules.md`
2. `template-web/src`, `template-app/src`, `template-backend/src`
3. Tipos/DTOs compartidos y stores globales

## Pasos
1. Detectar terminos y estructuras acopladas al dominio origen.
2. Clasificar: renombrar, encapsular, mover a `domain`, o retirar.
3. Definir adapters transitorios si hay riesgo de ruptura.
4. Verificar que contratos compartidos sigan claros y estables.

## Entregables
- Inventario de coupling de dominio.
- Plan de desacople con impacto por capa.
- Riesgos de migracion y mitigacion.

## No debe hacer
- No borrar contexto de negocio que deba quedar como `EXAMPLE_ONLY`.
- No mezclar desacople con rediseno funcional grande.

## Colabora con
- `template-contract-boundary-guardian`
- `template-system-architect`
