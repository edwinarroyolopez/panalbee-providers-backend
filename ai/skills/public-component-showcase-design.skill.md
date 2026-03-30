---
name: public-component-showcase-design
purpose: Definir una ruta publica de showcase para componentes reusables sin convertirla en mini-app de negocio.
---

# Skill: Public Component Showcase Design

## Por que existe
`template-web` no tiene hoy una vitrina publica canónica de componentes, lo que dificulta validar reusabilidad y onboarding de nuevos equipos.

## Que resuelve
- Diseña arquitectura de showcase publica y segura.
- Define taxonomia de componentes a exhibir.
- Establece metadatos/estados minimos por componente mostrado.

## Cuando usarlo
- Creacion o refactor de ruta publica de componentes en `template-web`.
- Preparacion de catalogo operativo para template hardening.

## Que revisa primero
1. `instructions/template-governance-rules.md` (showcase policy)
2. `template-web/src/app/(public)`
3. `template-web/src/components` y componentes reusable candidatos

## Pasos
1. Definir ruta publica y navegacion del showcase.
2. Agrupar por categoria: primitives, composed, feedback, layout.
3. Especificar ficha por componente (intent, variants, states, constraints).
4. Garantizar datos demo/local sin dependencia de negocio protegido.
5. Definir limites: que NO se expone.

## Entregables
- Blueprint de ruta publica de showcase.
- Estructura de categorias y metadata.
- Checklist de seguridad y aislamiento.

## No debe hacer
- No reutilizar datos reales de negocio.
- No incluir pantallas de dominio como piezas base.

## Colabora con
- `template-web-component-governor`
- `template-release-auditor`
