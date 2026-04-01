# PROMPT TEMPLATE - ZIP PUPPETEER PARA SCRAPING DE PRODUCTOS

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

Genera un proyecto completo en Node.js usando Puppeteer, empaquetado en un `.zip`, listo para correr localmente, que scrapee el sitio objetivo con cobertura exhaustiva del catalogo accesible y genere JSON final compatible con intake de productos del airlock.

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

No cambies ese shape.

## 4) Regla critica de arquitectura del scraper

El proyecto debe separar claramente estas etapas:

1. discovery (subsistema de cobertura)

   * detectar y recorrer rutas de catalogo relevantes (`collections`, `categories`, `shop`, `products`, `all`, `search`)
   * detectar multiples colecciones/categorias enlazadas
   * agotar paginacion numerada y next/prev
   * accionar boton `load more` hasta agotamiento
   * soportar `infinite scroll` hasta estabilizacion
   * recolectar links reales de producto desde multiples superficies
   * usar sitemap HTML/XML y feeds/JSON embebido publico como fallback util
   * deduplicar links por URL canonica/slug normalizado
   * continuar hasta que no aparezcan URLs unicas nuevas

2. detail extraction

   * entrar a cada link individual deduplicado
   * extraer nombre limpio, descripcion, precio, compareAtPrice, sku, externalId, imagen principal y galeria completa
   * construir el producto final principalmente desde ficha individual, no desde grid

3. normalization

   * limpiar textos y URLs
   * resolver URLs relativas
   * convertir precios a enteros numericos
   * deduplicar imagenes de forma estricta
   * validar shape final y requeridos

Si no se respetan discovery + detail extraction + normalization, el resultado no cumple este prompt.

## 5) Regla de completitud y anti-early-exit

`MIN_TARGET_RESULTS` es piso, no techo.

Regla operativa obligatoria:

* si el sitio tiene 100 o mas productos accesibles, el objetivo correcto es extraer TODO el catalogo accesible verificable
* si tiene menos, devolver todos los verificables
* si hay bloqueo tecnico real, reportarlo con honestidad (sin inventar productos)

`catalogo agotado razonablemente` solo aplica con evidencia operativa: estabilizacion de URLs unicas y agotamiento de rutas detectadas (no por percepcion general).

Queda prohibido por diseno que el proyecto:

* se detenga solo por alcanzar 100
* procese solo la primera pagina
* procese solo una coleccion cuando hay mas relevantes
* construya productos solo desde grid
* procese solo los primeros N links sin justificacion tecnica
* ignore links detectados pero no visitados sin registrar motivo

## 6) Requisitos funcionales obligatorios

El proyecto debe:

* navegar realmente el sitio objetivo
* recorrer paginacion, `load more` o scroll infinito segun aplique
* explorar multiples colecciones/categorias relevantes
* entrar a cada ficha individual deduplicada accesible
* construir el JSON final desde detalle
* deduplicar por canonical URL/slug
* continuar discovery hasta estabilizacion de URLs unicas

## 7) Robustez del scraper

Incluye, cuando aplique:

* retries razonables por navegacion o extraccion
* timeouts claros por etapa
* esperas inteligentes (evitar sleeps ciegos)
* manejo de navegacion rota y errores recuperables
* dedupe estricto de imagenes
* checkpoint o persistencia temporal para no perder avance en corridas largas
* separacion limpia de extractores por etapa

## 8) Reporte operativo de cobertura (sin romper JSON principal)

Ademas del JSON final principal, el proyecto debe generar trazabilidad local clara (logs y/o archivo auxiliar) con minimo:

* colecciones/categorias recorridas
* paginas o acciones de paginacion ejecutadas
* total de candidate links
* total de candidate links unicos
* total de fichas visitadas
* total de productos validos
* razones de descarte
* bloqueos tecnicos detectados
* veredicto de catalogo: agotado razonablemente o parcial

## 9) Reglas estrictas de extraccion

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

## 10) Requisitos del proyecto zip

Debe incluir como minimo:

* `package.json`
* `README.md`
* `src/` o estructura equivalente clara
* script principal CLI
* utilidades de discovery
* utilidades de extraccion de detalle
* utilidades de normalizacion
* carpeta o archivo de salida JSON
* reporte local de cobertura
* manejo de errores y deduplicacion
* validacion final del shape

## 11) README obligatorio

Debe explicar claramente:

* version de Node recomendada
* instalacion
* ejecucion
* donde configurar URL objetivo
* como cambiar `MIN_TARGET_RESULTS`
* donde queda el JSON resultante
* donde queda el reporte de cobertura
* limitaciones conocidas

## 12) Restricciones

* no entregar codigo suelto ni ejemplo parcial
* no cambiar el contrato de salida
* no construir productos solo desde grid
* no permitir nombres contaminados con JSON/URL
* no asumir que una sola imagen basta si hay galeria
* no asumir que la primera pagina agota el catalogo
* no inventar datos faltantes

## 12.1) Checklist de calidad antes de empaquetar ZIP

Para cada producto del JSON final:

1. `name` limpio y legible
2. `description` incluida cuando exista en ficha
3. `mainImageUrl` real
4. `imageUrls` completa y deduplicada
5. `externalId` consistente

Y a nivel corrida completa:

6. links unicos estabilizados (sin nuevos links tras ultima pasada)
7. detalle visitado para links accesibles
8. cobertura declarada como agotada o parcial con razon tecnica

## 13) Contexto del proveedor

Proveedor: PROVIDER_NAME
Website objetivo: TARGET_WEBSITE
Categoria del proveedor: PROVIDER_CATEGORY
Ubicacion: PROVIDER_LOCATION
Contexto operativo: PROVIDER_CONTEXT
Instagram referencia: INSTAGRAM_REFERENCE
Facebook referencia: FACEBOOK_REFERENCE

## 14) Resultado esperado

Quiero:

* el proyecto completo
* empaquetado en `.zip`
* listo para correr localmente
* con scraper robusto para catalogos grandes
* con JSON final compatible con airlock
* con trazabilidad local de cobertura y completitud
