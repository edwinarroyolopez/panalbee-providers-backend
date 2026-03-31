# PROMPT TEMPLATE — SCRAPING DE PRODUCTOS PARA AIRLOCK (JSON)

## 1) Variables editables

PROVIDER_NAME = ""
TARGET_WEBSITE = ""
PROVIDER_CATEGORY = ""
PROVIDER_LOCATION = ""
PROVIDER_CONTEXT = ""
INSTAGRAM_REFERENCE = ""
FACEBOOK_REFERENCE = ""

MIN_TARGET_RESULTS = 100
DEFAULT_CURRENCY = "COP"
STRICT_WEBSITE_ONLY = true
REQUIRE_IMAGES = true
REQUIRE_DETAIL_PAGE = true
DEDUPE_BY = "canonical_url_or_slug"
ALLOW_PARTIAL_IF_SITE_LIMITED = true

Variables canonicas esperadas por el airlock UI para interpolacion:
`PROVIDER_NAME`, `TARGET_WEBSITE`, `PROVIDER_CATEGORY`, `PROVIDER_LOCATION`, `PROVIDER_CONTEXT`, `INSTAGRAM_REFERENCE`, `FACEBOOK_REFERENCE`, `MIN_TARGET_RESULTS`, `DEFAULT_CURRENCY`.

## 2) Objetivo operativo

Navega el sitio objetivo y extrae productos visibles con enfoque comercial, devolviendo SOLO JSON valido compatible con intake de productos del airlock.

La salida debe parecerse al shape ligero del intake, pero con datos realmente utiles y consistentes.

No quiero:

* listas sueltas de objetos
* markdown
* texto explicativo
* resultados armados solo desde el grid
* nombres corruptos
* URLs mal cerradas
* galerias incompletas

## 3) Contrato de salida obligatorio

Devuelve SOLO JSON valido con esta estructura exacta:

{
"products": [
{
"name": "",
"price": 0,
"category": "",
"productType": "",
"mainImageUrl": "",
"imageUrls": [],
"compareAtPrice": 0,
"currency": "",
"externalId": "",
"sku": "",
"description": ""
}
],
"total_found": 0,
"target_min_results": 100,
"target_reached": false,
"source_website": ""
}

## 4) Regla critica de extraccion

No construyas el producto final solo con informacion del grid/listado.

## 4.1) Flujo obligatorio en 2 etapas

### ETAPA 1 — Discovery (obligatoria)

- descubrir colecciones/listados relevantes
- reunir links reales de producto
- deduplicar links antes de avanzar

### ETAPA 2 — Detail extraction (obligatoria)

- entrar uno por uno a cada link deduplicado
- construir el producto final desde la ficha individual
- extraer desde detalle: `name`, `description`, `price`, `compareAtPrice` (si existe), `mainImageUrl`, `imageUrls` (galeria completa), `externalId`, `sku` (si existe), `productType`

Si no se completan ambas etapas, el resultado se considera invalido.

Proceso obligatorio:

1. primero detecta y recopila links reales de producto desde el grid/listado
2. luego recorre uno por uno esos links
3. la informacion final del producto debe salir principalmente desde la ficha individual
4. solo usa el grid como apoyo inicial para descubrir productos, no como fuente final suficiente

Si no entraste a la ficha individual, el producto no esta suficientemente validado.

## 5) Reglas del contrato

* `products` es obligatorio.
* `name` y `price` son obligatorios en cada producto.
* `name` debe salir limpio, legible y tomado desde la ficha individual.
* `description` debe salir desde la ficha individual si existe.
* `category` debe salir con el valor de `PROVIDER_CATEGORY` salvo evidencia clara de una categoria mas especifica compatible.
* `productType` debe inferirse de forma util y comercial cuando sea posible:

  * `set`
  * `pijama`
  * `batola`
  * `camison`
  * `short`
  * etc.
* `mainImageUrl` es obligatoria si `REQUIRE_IMAGES=true`.
* `imageUrls` debe contener la galeria real del producto sin duplicados.
* `compareAtPrice` solo si existe evidencia real de precio anterior o tachado.
* `currency` debe salir como `COP` salvo evidencia distinta.
* `externalId` debe capturarse usando prioridad:

  1. URL canonica del producto
  2. slug
  3. id interno verificable
* `sku` solo si existe realmente en la ficha individual.
* Si un campo opcional no existe, omitulo. No uses `null`.
* No inventes datos.

## 6) Reglas estrictas para nombre, descripcion e imagenes

### Nombre

* toma el nombre principal desde la ficha individual
* limpia caracteres basura
* elimina fragmentos de JSON roto, markdown roto o restos de URLs
* no mezcles nombre con campos vecinos

### Descripcion

* toma la descripcion desde la ficha individual
* prioriza descripcion comercial del producto
* si existe HTML, conviertelo a texto limpio si hace falta
* si no existe, omite el campo

### Imagenes

* primero identifica la imagen principal real del producto desde la ficha
* luego extrae la galeria completa de esa misma ficha
* `imageUrls` debe contener varias imagenes si la ficha realmente las tiene
* deduplica imagenes
* convierte URLs relativas a absolutas
* limpia caracteres basura al inicio o final de la URL
* no aceptes placeholders
* la primera imagen de `imageUrls` debe coincidir con `mainImageUrl`

## 7) Reglas estrictas de proceso

### Cobertura

* recorre toda la coleccion visible o todas las colecciones relevantes
* detecta paginacion, load more, scroll o rutas equivalentes
* no te quedes con la primera pantalla

### Descubrimiento

* primero reune el universo de links reales de productos
* deduplica esos links antes de entrar a detalle

### Enriquecimiento

Para cada link de producto:

* abre la ficha individual
* extrae nombre limpio
* extrae precio real
* extrae compareAtPrice si existe
* extrae descripcion
* extrae imagen principal
* extrae galeria
* extrae sku si existe
* extrae externalId util
* infiere productType

### Dedupe

Deduplica por prioridad:

1. URL canonica
2. slug
3. externalId
4. nombre + precio + mainImageUrl

### Validacion

No incluyas un producto final si:

* no tiene `name`
* no tiene `price`
* no tiene `mainImageUrl` cuando `REQUIRE_IMAGES=true`

## 8) Reglas especiales anti-errores

* No devuelvas objetos fuera de la raiz `products`.
* No devuelvas arrays sin wrapper.
* No mezcles productos dentro del campo `name`.
* No dejes URLs con prefijos como `[` o comillas rotas.
* No concatentes dos productos por error.
* No tomes una sola imagen si la ficha tiene galeria real accesible.
* No inventes descripcion a partir del nombre.
* No cierres extraccion desde grid: el producto final debe salir del detalle.

## 8.1) Validacion minima antes de responder

Antes de devolver JSON final, verifica por producto:

1. `name` limpio (sin fragmentos JSON/URL)
2. `mainImageUrl` valida y utilizable
3. `imageUrls` deduplicada y completa segun ficha
4. `description` presente si la ficha la publica
5. `externalId` consistente (URL/slug/id)

## 9) Objetivo minimo

Debes intentar llegar a `MIN_TARGET_RESULTS`.
Si el sitio realmente no tiene suficientes productos visibles/accesibles, devuelve todos los verificables y marca:

* `target_reached: false`
* `total_found` con el total real encontrado

## 10) Contexto del proveedor a respetar

Proveedor: PROVIDER_NAME
Website objetivo: TARGET_WEBSITE
Categoria de proveedor: PROVIDER_CATEGORY
Ubicacion: PROVIDER_LOCATION
Contexto operativo: PROVIDER_CONTEXT
Instagram referencia: INSTAGRAM_REFERENCE
Facebook referencia: FACEBOOK_REFERENCE

## 11) Salida final

Devuelve SOLO JSON valido.
