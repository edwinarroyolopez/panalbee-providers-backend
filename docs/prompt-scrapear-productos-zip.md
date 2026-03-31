# PROMPT TEMPLATE — ZIP PUPPETEER PARA SCRAPING DE PRODUCTOS

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
OUTPUT_SCHEMA_MODE = "airlock_products_json_light"
DELIVERABLE_NAME = "shana-pijamas-scraper"
NODE_VERSION_TARGET = "20+"

Variables canonicas esperadas por el airlock UI para interpolacion:
`PROVIDER_NAME`, `TARGET_WEBSITE`, `PROVIDER_CATEGORY`, `PROVIDER_LOCATION`, `PROVIDER_CONTEXT`, `INSTAGRAM_REFERENCE`, `FACEBOOK_REFERENCE`, `MIN_TARGET_RESULTS`, `DEFAULT_CURRENCY`.

## 2) Objetivo

Quiero que generes un proyecto completo en Node.js usando Puppeteer, empaquetado en un `.zip`, listo para correr localmente, que scrapee el sitio objetivo y genere un JSON final compatible con intake de productos del airlock.

## 3) Contrato de salida del JSON

El scraper debe generar un archivo JSON con esta estructura exacta:

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

## 4) Regla critica de arquitectura del scraper

El proyecto debe separar claramente estas etapas:

1. discovery

   * detectar colecciones/listados
   * reunir links reales de productos
   * deduplicar links

2. detail extraction

   * entrar a cada link individual
   * extraer nombre limpio
   * descripcion clara
   * precio
   * compareAtPrice
   * sku
   * externalId
   * imagen principal
   * galeria completa

3. normalization

   * limpiar textos
   * limpiar URLs
   * convertir precios a enteros
   * deduplicar imagenes
   * validar shape final

No quiero un scraper que arme productos finales directamente desde el grid.

Si no se respetan discovery + detail extraction + normalization, el resultado no cumple este prompt.

## 5) Requisitos funcionales obligatorios

El proyecto debe:

* navegar realmente el sitio objetivo
* detectar coleccion principal, paginacion, load more o rutas equivalentes
* recorrer todos los productos visibles y accesibles
* entrar a cada ficha individual
* construir el JSON final desde la ficha individual, no solo desde el grid
* intentar llegar a `MIN_TARGET_RESULTS`
* si el sitio no llega a ese numero, devolver todos los verificables y marcar `target_reached: false`

## 6) Reglas estrictas de extraccion

### Nombre

* obligatorio
* tomado desde la ficha individual
* limpio y legible
* sin basura, sin URLs incrustadas, sin restos de JSON roto

### Descripcion

* tomada desde la ficha individual
* clara y util
* omitir si no existe

### Imagenes

* `mainImageUrl` debe ser real
* `imageUrls` debe contener galeria real sin duplicados
* si la ficha tiene multiples imagenes reales, no devolver solo una
* resolver URLs relativas
* limpiar URLs corruptas
* descartar placeholders

### Precio

* entero numerico
* `compareAtPrice` solo si existe evidencia real

### IDs

* `externalId` debe capturarse usando prioridad:

  1. URL canonica
  2. slug
  3. id interno verificable
* `sku` solo si existe

## 7) Requisitos del proyecto zip

Debe incluir como minimo:

* `package.json`
* `README.md`
* `src/` o estructura equivalente clara
* script principal CLI
* utilidades de discovery
* utilidades de extraccion de detalle
* utilidades de normalizacion
* carpeta o archivo de salida JSON
* manejo basico de errores
* deduplicacion
* validacion final del shape

## 8) README obligatorio

Debe explicar claramente:

* version de Node recomendada
* instalacion
* ejecucion
* donde configurar URL objetivo
* como cambiar `MIN_TARGET_RESULTS`
* donde queda el JSON resultante
* limitaciones conocidas

## 9) Restricciones

* no me entregues solo codigo suelto
* no me entregues un ejemplo parcial
* no cambies el contrato de salida
* no construyas productos solo desde el grid
* no permitas nombres contaminados con fragmentos de JSON o URLs
* no asumas que una sola imagen basta si la ficha tiene galeria
* no asumas que la primera pagina agota el catalogo
* no inventes datos

## 9.1) Checklist de calidad antes de empaquetar ZIP

Para cada producto del JSON final:

1. `name` limpio y legible
2. `description` incluida cuando exista en ficha
3. `mainImageUrl` real
4. `imageUrls` completa y deduplicada
5. `externalId` consistente

## 10) Contexto del proveedor

Proveedor: PROVIDER_NAME
Website objetivo: TARGET_WEBSITE
Categoria del proveedor: PROVIDER_CATEGORY
Ubicacion: PROVIDER_LOCATION
Contexto operativo: PROVIDER_CONTEXT
Instagram referencia: INSTAGRAM_REFERENCE
Facebook referencia: FACEBOOK_REFERENCE

## 11) Resultado esperado

Quiero:

* el proyecto completo
* empaquetado en `.zip`
* listo para correr localmente
* con scraper robusto
* y con JSON final compatible con el airlock, pero ligero y esencial
