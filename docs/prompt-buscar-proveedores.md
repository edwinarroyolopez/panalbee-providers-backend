# Prompt reutilizable — investigación de proveedores (airlock + growth intelligence)

## 1) Variables editables (cambia solo esto)

TARGET_CATEGORY = "ropa deportiva"
TARGET_CATEGORY_LABEL = "fabricantes de ropa deportiva"
TARGET_LOCATION = "Medellín, Colombia"
TARGET_EXPANSION_AREA = "Valle de Aburrá"
TARGET_MIN_RESULTS = 50
DEFAULT_COUNTRY = "Colombia"

ALLOW_EXPANSION_AREA = true
PRIORITIZE_SMALL_BRANDS = true
STRICT_MANUFACTURER_ONLY = true
REQUIRE_VISIBLE_PHONE_OR_SOCIAL = false

TRUST_LEVEL_MODE = "strict"
SOURCE_PRIORITY = "web+social+directories"
OUTPUT_ROOT_KEY = "providers"


## 2) Objetivo operativo (doble capa)

Este trabajo alimenta **dos capas complementarias** del producto:

1. **Supply curation (airlock)** — proveedores útiles para surtido, validación y curaduría antes de Panalbee.
2. **Growth intelligence** — detectar presencia digital débil, fricciones comerciales y oportunidad real de ofrecer mejora web, catálogo usable o entrada estratégica a Panalbee.

La salida debe permitir:

- **Trazabilidad** del razonamiento (evidencia → normalización → enriquecimiento → scoring).
- **Intake limpio** compatible con `parseProvidersJson` / `validateProvidersImport` / `importProviders` **sin campos extra** que rompan el validador.

El sistema (backend y web) **normaliza de nuevo** cada fila en importación; aun así debes entregar la **proyección final** ya limpia para reducir rechazos y ruido operativo.


## 3) Flujo obligatorio en cinco etapas (orden estricto)

### Etapa 1 — `rawDiscovery` (discovery crudo)

Para cada negocio candidato, reúne evidencia pública verificable:

- Nombre comercial / marca / razón si aplica.
- Sitio, redes, directorios, señales de fabricación o maquila.
- Notas de fuente (URLs citables, no pegar markdown en campos que deban ser URL puras).

**No** emitas aún el JSON de importación.

### Etapa 2 — `normalizedCandidate` (normalización)

Sin inventar datos:

1. Limpia strings: trim consistente, quita espacios invisibles (ZWSP, NBSP raro), unifica comillas rotas.
2. **URLs y redes:** prohibido markdown (`[]()`, backticks). Extrae la URL HTTP(S) real si viene envuelta en texto.
3. Quita sufijos basura en links: paréntesis/corchetes/colgantes `)]}`, puntuación final pegada al dominio.
4. **Teléfonos:** un string por entrada, sin duplicados semánticos (mismo número con distinto formato).
5. **Deduplicación estricta por negocio real:** una sola fila por empresa; variaciones de nombre de la misma operación → una.
6. Si `website`, `instagram` y `facebook` repetían el mismo destino, conserva **un solo campo apropiado** (sitio corporativo en `website`; perfil IG en `instagram`; página FB en `facebook`). Si el “sitio” era en realidad un perfil social, muévelo al campo correcto y deja `website` vacío si no hay dominio propio.
7. **Prohibido `null`** en cualquier campo; si no hay dato verificable, **omite** la clave.

### Etapa 3 — `providerIntelligence` (enrichment)

Solo con evidencia razonable (no especular como hecho):

Evalúa señales mínimas cuando exista evidencia pública:

- Sitio presente / ausente; útil operativo vs solo testimonial / vitrina vacía.
- Catálogo o línea de producto visible o no.
- CTA o contacto claro vs enterrado.
- Teléfono visible vs solo formulario / sin señal.
- WhatsApp visible si aplica.
- Instagram / Facebook encontrados y coherentes con marca.
- Consistencia nombre ↔ marca ↔ dominio ↔ redes.
- Actividad social básica (alta / media / baja / desconocido).
- Si el proveedor se beneficiaría claramente de mejora digital o de entrar a Panalbee (como **hipótesis operativa**, no promesa).

### Etapa 4 — scoring y recomendación (bloques separados)

Asigna **cinco scores enteros 0–100**, cada uno con criterio propio (no promedios opacos ni un solo “score mágico”):

- `dataQualityScore` — limpieza, consistencia, verificabilidad de la evidencia recopilada.
- `supplyFitScore` — valor para el airlock como proveedor de surtido / curaduría.
- `commerceReadinessScore` — preparación digital/comercial para conversión (contacto, confianza, catálogo, fricción).
- `growthOpportunityScore` — fuerza de la oportunidad growth partner (sitio, UX, catálogo, integración).
- `confidenceScore` — confianza en la evidencia pública usada (no en el futuro del negocio).

Recomendación obligatoria (`recommendation`), una de:

- `priorizar_para_panalbee`
- `priorizar_para_growth`
- `priorizar_para_ambos`
- `revisar_manual`
- `descartar`

Incluye `recommendationRationale` breve (1–3 frases, operativas).

### Etapa 5 — `importProjection` (shape canónico de intake)

Proyecta **solo** el contrato de importación. Campos permitidos en cada proyección:

- `name` (requerido)
- `category` (requerido)
- `country` (requerido)
- `city`, `phones`, `instagram`, `facebook`, `website`, `address`, `description`, `trustLevel`, `internalNotes` (opcionales; **omitir** si vacíos)

**Ningún otro campo** en `importProjection` (ni `scores`, ni `signals`, ni `null`).


## 4) Contrato JSON — dos formatos de entrega

### Formato A — Solo intake (mínimo para pegar en airlock)

Devuelve **solo** JSON válido:

```json
{
  "providers": [ { ... } ]
}
```

o un array raíz `[ ... ]`.

Cada objeto debe cumplir el contrato de la etapa 5.

### Formato B — Trazabilidad completa (recomendado para auditoría)

Devuelve JSON válido con candidatos enriquecidos **y** la misma información proyectada para intake:

```json
{
  "researchVersion": 1,
  "candidates": [
    {
      "rawDiscovery": {},
      "normalizedCandidate": {},
      "providerIntelligence": {
        "signals": {},
        "scores": {
          "dataQualityScore": 0,
          "supplyFitScore": 0,
          "commerceReadinessScore": 0,
          "growthOpportunityScore": 0,
          "confidenceScore": 0
        },
        "recommendation": "revisar_manual",
        "recommendationRationale": ""
      },
      "importProjection": {}
    }
  ]
}
```

La UI de importación acepta este formato y extrae automáticamente cada `importProjection` aplicando normalización del servidor.

**Regla:** la capa de intelligence **nunca** reemplaza al contrato canónico; vive **fuera** de `importProjection` o en notas estructuradas resumidas (ver `internalNotes`).


## 5) Reglas duras de URLs y redes

- **Prohibido** markdown en `website`, `instagram`, `facebook`.
- **Prohibido** duplicar el mismo enlace en dos campos.
- Cada URL debe ser **navegable** tal cual (HTTPS implícito permitido solo si el consumidor lo añade; preferir URL completa en redes).
- `website`: dominio propio de la marca cuando exista; no uses perfil social como `website` si no hay sitio — déjalo omitido y usa `instagram` / `facebook`.
- Limpia caracteres que rompen el click: espacios internos, comillas, corchetes, “ghost” Unicode.


## 6) `description` (orientación operativa)

La descripción es **para un operador humano**, no para marketing.

Debe ser **corta, concreta y verificable** en tono. Debe ayudar a responder:

- Qué vende / fabrica / distribuye (línea, especialidad).
- Si hay showroom, taller, ecommerce transaccional o solo contacto / WhatsApp.
- Si el canal digital es **funcional**, **limitado** o **casi inexistente**.
- Si el caso es más **Panalbee**, más **growth**, o **ambos**.

**Prohibido** relleno genérico del tipo: “empresa de ropa deportiva”, “distribuidor en Medellín”, “empresa líder”, “gran trayectoria” sin hecho observable.

**Ejemplo bueno (ilustrativo):** “Confección local de leggings y tops; Instagram activo con precios por DM; sin tienda online; catálogo en PDF en historias.”


## 7) `internalNotes` (curaduría + resumen intelligence)

Usa `internalNotes` para:

- Fuentes clave (dominios o rutas cortas, sin markdown).
- Riesgos / ambigüedades (“nombre similar a otro competidor”).
- Una línea máquina-legible que alimenta la **UI de oportunidad** (listado + mesa del proveedor), además del texto libre anterior.

### Línea obligatoria para activar la capa visible (`intel:`)

Formato: segmentos separados por `|`, cada uno `clave=valor`. Claves soportadas:

| Clave | Significado |
|-------|-------------|
| `rec` | Recomendación: `priorizar_para_panalbee` \| `priorizar_para_growth` \| `priorizar_para_ambos` \| `revisar_manual` \| `descartar` |
| `dq`, `sf`, `cr`, `go`, `conf` | Scores 0–100 (data quality, supply fit, commerce readiness, growth opportunity, confidence) |
| `why` | Rationale corto (entre comillas si lleva espacios) |
| `friction` o `fricciones` | Códigos separados por coma (ej. `sin_sitio`, `sitio_debil`, `catalogo_poco_usable`, `solo_instagram`, `contacto_oculto`) |
| `next` o `proximo` | Código de siguiente paso sugerido (ej. `revisar_surtido`, `propuesta_growth`, `investigar_mas`, `scraping`) |
| `signals` | Tokens opcionales separados por coma |

**Ejemplo:**

`intel: rec=priorizar_para_ambos | dq=72 sf=68 cr=55 go=80 conf=66 | why="Buen surtido; web floja" | friction=sin_sitio,catalogo_pobre | next=revisar_surtido`

### Alternativa (`intel_json:`)

Una sola línea con JSON válido: `{ "recommendation": "...", "scores": { ... }, "frictions": [], "recommendationRationale": "...", "nextStepCode": "...", "signalTokens": [] }`.

Los scores detallados y señales extensas pueden vivir también en `providerIntelligence` (Formato B); no repitas párrafos largos en `internalNotes`.


## 8) `trustLevel` (0–100)

Alineado a evidencia multifuente y calidad de normalización:

- 80–95 — evidencia fuerte, consistente, multifuente.
- 60–79 — evidencia suficiente con lagunas menores.
- 40–59 — evidencia mínima aceptable; suele ir con `revisar_manual` o criterio estricto de exclusión.


## 9) Criterios de inclusión (supply)

- Incluir solo marcas/empresas con evidencia suficiente de fabricación, confección, producción, maquila o personalización alineada a `TARGET_CATEGORY`.
- Excluir revendedores puros sin señal de producción cuando `STRICT_MANUFACTURER_ONLY=true`.
- Si `REQUIRE_VISIBLE_PHONE_OR_SOCIAL=true`, excluir sin teléfono ni red verificable.


## 10) Regla final de salida

- JSON **válido** únicamente (sin prosa alrededor, sin bloques markdown externos).
- Cada `importProjection` sin `null`, sin campos vacíos, sin campos arbitrarios.
- El proveedor debe quedar **listo para airlock** o explícitamente marcado para **`revisar_manual` / `descartar`** en la capa de intelligence (no en campos fuera de contrato).


## 11) Continuidad operativa

Cuando un proveedor quede apto para scraping de productos y tenga **website o canal estable** utilizable, continuar con:

- `docs/prompt-scrapear-productos.md`
