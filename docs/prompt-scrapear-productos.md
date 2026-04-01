# PROMPT TEMPLATE - SCRAPING DE PRODUCTOS PARA AIRLOCK (JSON)

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

Navega el sitio objetivo y extrae productos con cobertura exhaustiva del catalogo accesible, devolviendo SOLO JSON valido compatible con intake de productos del airlock.

No quiero:

* listas sueltas de objetos
* markdown
* texto explicativo
* resultados armados solo desde el grid
* cobertura parcial comoda
* cierre prematuro sin agotar catalogo razonablemente

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

No agregues texto fuera del JSON final.

## 4) Regla critica de extraccion y completitud

No construyas el producto final solo con informacion del grid/listado.

`MIN_TARGET_RESULTS` es piso operativo, no techo.

Si el sitio tiene 100 o mas productos accesibles, el trabajo correcto es extraerlos TODOS los verificables y accesibles, no solo los primeros 100.

## 4.1) Flujo obligatorio en 2 etapas

### ETAPA 1 - Discovery exhaustivo (obligatoria)

Discovery significa cobertura real del catalogo, no una muestra.

Debes:

* localizar rutas de catalogo relevantes (colecciones, categorias, subcategorias, shop, products, all, search)
* recorrer colecciones/categorias hermanas claramente enlazadas
* detectar y agotar paginacion numerada o next/prev
* accionar `load more` hasta agotamiento
* soportar scroll infinito cuando exista
* capturar enlaces de producto desde multiples superficies del sitio
* usar sitemap HTML/XML y/o feeds/JSON embebido publico cuando ayuden a ampliar cobertura
* resolver URLs relativas
* deduplicar por URL canonica o slug normalizado antes de detalle

### ETAPA 2 - Detail extraction (obligatoria)

Para cada URL deduplicada de producto:

* entrar uno por uno a la ficha individual
* construir el producto final principalmente desde detalle
* extraer desde detalle: `name`, `description`, `price`, `compareAtPrice` (si existe), `mainImageUrl`, `imageUrls` (galeria completa), `externalId`, `sku` (si existe), `productType`

Si no se completan ambas etapas, el resultado es invalido.

## 5) Regla de no cierre prematuro (comportamientos invalidos)

Es invalido terminar si ocurre cualquiera de estos casos:

* detenerse tras la primera pagina
* detenerse tras una sola coleccion cuando hay mas relevantes
* devolver solo productos visibles en viewport inicial
* devolver solo datos del grid sin abrir detalle
* parar apenas llega a 100 cuando hay mas productos accesibles
* ignorar colecciones/categorias hermanas claramente enlazadas
* ignorar productos alcanzables por paginacion, load more o scroll
* omitir links de producto detectados sin justificacion tecnica real

## 6) Criterio de parada valido (cuando SI puedes terminar)

Solo puedes cerrar cuando se cumplan condiciones de agotamiento razonable del catalogo accesible:

1. ya recorriste todas las rutas de catalogo relevantes detectadas
2. ya agotaste paginacion, load more e infinite scroll donde existan
3. ya no aparecen nuevas URLs de producto tras deduplicacion final
4. ya visitaste en detalle las URLs deduplicadas que eran accesibles
5. si hay bloqueo real (captcha duro, 403 persistente, bloqueo geo, login obligatorio), lo asumiste como limite tecnico y no inventaste datos

Si el sitio realmente tiene menos productos verificables que `MIN_TARGET_RESULTS`, devuelve todos los verificables y marca `target_reached: false`.

## 7) Reglas del contrato por producto

* `products` es obligatorio.
* `name` y `price` son obligatorios en cada producto.
* `name` debe salir limpio, legible y tomado desde la ficha individual.
* `description` debe salir desde la ficha individual si existe.
* `category` debe salir con el valor de `PROVIDER_CATEGORY` salvo evidencia clara de una categoria mas especifica compatible.
* `productType` debe inferirse de forma util y comercial cuando sea posible.
* `mainImageUrl` es obligatoria si `REQUIRE_IMAGES=true`.
* `imageUrls` debe contener la galeria real del producto sin duplicados.
* `compareAtPrice` solo si existe evidencia real de precio anterior o tachado.
* `currency` debe salir como `DEFAULT_CURRENCY` salvo evidencia distinta.
* `externalId` debe capturarse usando prioridad:

  1. URL canonica del producto
  2. slug
  3. id interno verificable
* `sku` solo si existe realmente en la ficha individual.
* Si un campo opcional no existe, omitelo. No uses `null`.
* No inventes datos.

## 8) Reglas estrictas para nombre, descripcion e imagenes

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

* identifica la imagen principal real desde la ficha
* extrae la galeria completa de esa misma ficha
* `imageUrls` debe contener varias imagenes si la ficha realmente las tiene
* deduplica imagenes de forma estricta
* convierte URLs relativas a absolutas
* limpia caracteres basura al inicio o final de la URL
* no aceptes placeholders
* la primera imagen de `imageUrls` debe coincidir con `mainImageUrl`

## 9) Dedupe y validacion

Deduplica por prioridad:

1. URL canonica
2. slug
3. externalId
4. nombre + precio + mainImageUrl

No incluyas un producto final si:

* no tiene `name`
* no tiene `price`
* no tiene `mainImageUrl` cuando `REQUIRE_IMAGES=true`

## 10) Verificacion interna obligatoria antes del JSON final

Antes de responder, verifica internamente (sin cambiar el formato del JSON final):

1. cuantos links unicos se reunieron en discovery
2. cuantos detalles de producto se pudieron abrir
3. cuantos productos validos sobrevivieron normalizacion
4. si hubo colecciones/rutas omitidas o bloqueadas
5. si el resultado representa razonablemente la totalidad accesible del catalogo

Si la verificacion falla, continua el scraping y no cierres temprano.

## 11) Reglas especiales anti-errores

* No devuelvas objetos fuera de la raiz `products`.
* No devuelvas arrays sin wrapper.
* No mezcles productos dentro del campo `name`.
* No dejes URLs con prefijos como `[` o comillas rotas.
* No concatentes dos productos por error.
* No tomes una sola imagen si la ficha tiene galeria real accesible.
* No inventes descripcion a partir del nombre.
* No cierres extraccion desde grid: el producto final debe salir del detalle.

## 12) Contexto del proveedor a respetar

Proveedor: PROVIDER_NAME
Website objetivo: TARGET_WEBSITE
Categoria de proveedor: PROVIDER_CATEGORY
Ubicacion: PROVIDER_LOCATION
Contexto operativo: PROVIDER_CONTEXT
Instagram referencia: INSTAGRAM_REFERENCE
Facebook referencia: FACEBOOK_REFERENCE

## 13) Salida final

Devuelve SOLO JSON valido.
