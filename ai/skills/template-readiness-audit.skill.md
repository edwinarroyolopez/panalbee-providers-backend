---
name: template-readiness-audit
purpose: Auditar si un proyecto esta realmente listo para operar como template de salida.
---

# Skill: Template Readiness Audit

## Por que existe
Sin una clasificacion formal, los equipos confunden codigo util con deuda heredada y publican starters frágiles.

## Que resuelve
- Clasifica piezas en `REUSABLE/ADAPT/EXAMPLE_ONLY/REMOVE/QUARANTINE`.
- Identifica coupling, duplicacion y fronteras rotas.
- Entrega baseline de reusabilidad por proyecto.

## Cuando usarlo
- Inicio de fase de template hardening.
- Antes de plan de extraccion/componentizacion.
- Cierre de fase para medir avance real.

## Que revisa primero
1. `instructions/template-governance-rules.md`
2. Estructura de `template-web/src`, `template-app/src`, `template-backend/src`
3. Wrappers/rutas alias/hooks delgados/contratos duplicados

## Pasos
1. Inventariar modulos por capa (ui/hooks/services/stores/contracts/backend).
2. Clasificar cada bloque en una sola clase canónica.
3. Marcar acoplamientos especificos de dominio.
4. Identificar quick wins de hardening (alto impacto, bajo riesgo).
5. Proponer secuencia incremental de ejecucion.

## Entregables
- Matriz de readiness por proyecto y por modulo.
- Lista priorizada de acciones (`ADAPT/REMOVE/QUARANTINE`).
- Riesgos de clonacion actuales.

## No debe hacer
- No implementar features nuevas.
- No mover codigo sin clasificacion previa.

## Colabora con
- `template-system-architect`
- `template-release-auditor`
