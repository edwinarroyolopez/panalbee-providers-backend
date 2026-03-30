---
name: reusable-component-extraction
purpose: Extraer y consolidar componentes/herramientas repetidas en capas base reusables.
---

# Skill: Reusable Component Extraction

## Por que existe
Hay duplicacion de patrones UI y wrappers delgados que inflan complejidad sin aportar valor de dominio.

## Que resuelve
- Detecta componentes repetidos para mover a base/shared/composed.
- Elimina aliases/wrappers sin comportamiento.
- Define contrato minimo reusable para cada extraccion.

## Cuando usarlo
- Refactors en `template-web/src/components|modules`.
- Refactors en `template-app/src/components|modules`.
- Cuando se detectan variantes clonadas por pantalla/modulo.

## Que revisa primero
1. `instructions/template-governance-rules.md`
2. Arbol de componentes actuales.
3. Uso real por pantallas y modulos.

## Pasos
1. Agrupar duplicados por patron (layout, modal, header, input, table/list cards).
2. Separar API reusable de props de dominio.
3. Definir destino: `base` o `composed`.
4. Reemplazar consumidores y retirar wrappers obsoletos.
5. Verificar que no se rompa estado/loading/error en consumidores.

## Entregables
- Lista de extracciones realizadas o planificadas.
- Contrato de cada componente base/composed.
- Lista de wrappers eliminables.

## No debe hacer
- No mezclar logica de negocio en primitives.
- No mover componentes sin consumidores identificados.

## Colabora con
- `template-web-component-governor`
- `template-system-architect`
