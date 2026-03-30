---
name: template-optimization-pass
purpose: Eliminar ruido estructural que empeora mantenibilidad del template.
---

# Skill: Template Optimization Pass

## Por que existe
Los templates contienen ruido tipico de evolucion de producto (wrappers vacios, aliases de ruta, imports ruidosos, hooks espejo) que dificulta clonacion limpia.

## Que resuelve
- Detecta y prioriza optimizaciones de bajo riesgo y alto impacto.
- Limpia wrappers/aliases innecesarios.
- Reduce superficie de mantenimiento sin cambiar reglas de negocio.

## Cuando usarlo
- Despues de auditoria de readiness.
- Antes de release audit de template.

## Que revisa primero
1. `instructions/template-governance-rules.md`
2. Listado de wrappers y aliases detectados.
3. Duplicaciones en hooks/services/components.

## Pasos
1. Detectar elementos sin valor arquitectonico.
2. Marcar riesgo de eliminacion (bajo/medio/alto).
3. Ejecutar limpieza incremental empezando por bajo riesgo.
4. Verificar imports, rutas y consumidores.

## Entregables
- Lista de optimizaciones aplicadas/propuestas.
- Impacto esperado en mantenibilidad.
- Riesgos residuales.

## No debe hacer
- No optimizar por estilo personal.
- No mezclar esta pasada con features nuevas.

## Colabora con
- `template-web-component-governor`
- `template-release-auditor`
