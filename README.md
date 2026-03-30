Perfecto. A continuación tienes el **README v1.2**, **pulido con lupa**, pensado **explícitamente para que un equipo de React Native pueda construir la app sin ambigüedades**.

No hay promesas futuras mezcladas, no hay endpoints “fantasma”.
Todo lo que aparece aquí **ya existe o está claramente definido como contrato**.

---

# 📘 API – Businessría Backend (NestJS)

Sistema backend para **operación businessra diaria**, control de personal, producción, paradas, distribución de dinero y analítica.

**Base URL**

```
http://localhost:7000/api
```

---

# 🔐 Auth

Autenticación **por teléfono + OTP** (WhatsApp).
El login legacy existe solo para transición.

---

## Register (OWNER)

Crea un usuario OWNER inicial.

```bash
curl -X POST http://localhost:7000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+573001112233",
    "name": "Juan Businessro"
  }'
```

---

## Login legacy (deprecable)

⚠️ **No usar en la app nueva**, solo compatibilidad.

```bash
curl -X POST http://localhost:7000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+573001112233"
  }'
```

---

## Request OTP (login real)

```bash
curl -X POST http://localhost:7000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+573001112233"
  }'
```

Respuesta:

```json
{
  "otpToken": "uuid-token",
  "expiresAt": "2025-12-26T..."
}
```

---

## Verify OTP (login)

```bash
curl -X POST http://localhost:7000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+573001112233",
    "otpToken": "uuid-token",
    "code": "123456"
  }'
```

Respuesta:

```json
{
  "accessToken": "JWT_TOKEN",
  "user": {
    "_id": "...",
    "role": "OWNER | ADMIN | OPERATOR"
  }
}
```

📱 **React Native**
→ Guardar `accessToken`
→ Todas las llamadas usan `Authorization: Bearer`

---

## Me (contexto del usuario)

Devuelve el usuario **y sus negocios asociadas** (por memberships).

```bash
curl -X GET http://localhost:7000/api/me \
  -H "Authorization: Bearer JWT_TOKEN"
```

Ejemplo:

```json
{
  "user": { "...": "..." },
  "businesses": [
    {
      "businessId": "...",
      "membershipId": "...",
      "puestoCount": 1,
      "isInside": false
    }
  ]
}
```

📱 **React Native**
→ Pantalla inicial
→ Selector de negocio
→ Permisos por rol

---

# 🏗️ Inventory (Equipos)

Equipos que **consumen puestos** y participan en producción.

**Base**

```
/business/:businessId/inventory/items
```

---

## Crear equipo

```bash
curl -X POST http://localhost:7000/api/businesses/{businessId}/inventory/items \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "MOTOR",
    "name": "Motor Yamaha 40HP",
    "brand": "Yamaha",
    "model": "40X",
    "serialNumber": "YM-40-00012",
    "puestoCount": 2
  }'
```

---

## Listar / filtrar / actualizar / elinegocior

✔️ CRUD completo
✔️ `soft delete`
✔️ filtros por categoría, texto

📱 **React Native**
→ Catálogo de equipos
→ Asociado a downtimes y settlements

---

# 👷 Memberships (Businessros)

Relación **usuario ↔ negocio** con puestos.

**Base**

```
/business/:businessId/memberships
```

---

## Invite businessr (flujo real)

Crea **User OPERATOR + Membership** y envía link por WhatsApp (simulado).

```bash
curl -X POST http://localhost:7000/api/businesses/{businessId}/memberships/invite \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+573225802687",
    "name": "Samuel",
    "puestoCount": 1
  }'
```

📱 **React Native**
→ El link abre la app
→ Teléfono precargado
→ Se hace OTP login

---

## Operaciones disponibles

* Listar memberships
* Marcar **entrada / salida**
* Cambiar puestos
* Soft delete

📱 **React Native**
→ Control de asistencia
→ Vista “quién está en la negocio”

---

# ⛏️ Downtimes (Paradas)

Registro de **paradas simultáneas**, clave para pérdidas.

**Scopes**

* `MINE` → toda la negocio
* `EQUIPMENT` → equipo específico

**Base**

```
/business/:businessId/downtimes
```

---

## Crear downtime por equipo

```bash
curl -X POST http://localhost:7000/api/businesses/{businessId}/downtimes \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "BREAKDOWN",
    "scope": "EQUIPMENT",
    "equipmentItemId": "{itemId}",
    "reason": "Motor recalentado"
  }'
```

---

## Cerrar downtime

```bash
curl -X PATCH http://localhost:7000/api/businesses/{businessId}/downtimes/{downtimeId}/close \
  -H "Authorization: Bearer JWT_TOKEN"
```

📱 **React Native**
→ Botón “Parar equipo”
→ Botón “Reanudar”

---

# 🪙 Lavadas (Producción)

Registro **diario / por turno**.

**Base**

```
/business/:businessId/operations
```

---

## Crear operation

```bash
curl -X POST http://localhost:7000/api/businesses/{businessId}/operations \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-12-27",
    "shift": "DAY",
    "goldGrams": 3.45,
    "expensesCop": 150000,
    "notes": "Lavada normal"
  }'
```

✔️ OPERATOR puede crear
✔️ OWNER/ADMIN ve todo

📱 **React Native**
→ Formulario simple
→ Offline-friendly (futuro)

---

# 💰 Settlements (Cierre contable)

Distribución **real de dinero** por operation.

📌 Conceptos clave:

* 1 settlement por operation
* Inmutable
* Auditable
* Base para pagos y rankings

**Base**

```
/business/:businessId/operations/:operationId/settlement
```

---

## Cerrar operation

```bash
curl -X POST http://localhost:7000/api/businesses/{businessId}/operations/{operationId}/settlement \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "goldPriceCop": 320000
  }'
```

Respuesta:

```json
{
  "netAmountCop": 954000,
  "valuePerPuestoCop": 159000,
  "payouts": [
    { "type": "OPERATOR", "amountCop": 159000 },
    { "type": "EQUIPMENT", "name": "Motor Yamaha", "amountCop": 318000 }
  ]
}
```

📱 **React Native**
→ Pantalla “Cierre del día”
→ Confirmación OWNER

---

# 📊 Analytics (OWNER / ADMIN)

**Base**

```
/business/:businessId/analytics
```

---

## Producción

```bash
GET /analytics/production?from=&to=
```

---

## Downtimes (resumen / tipo / equipo)

```bash
GET /analytics/downtimes/summary
GET /analytics/downtimes/by-type
GET /analytics/downtimes/by-equipment
```

---

## Rankings cruzados

### Equipos (ganancia vs pérdida)

```bash
GET /analytics/rankings/cross/equipment?businessId=&from=&to=
```

---

## Alertas

### Equipos con pérdida neta

```bash
GET /analytics/alerts/equipment-loss?businessId=&from=&to=
```

📱 **React Native**
→ Alertas rojas
→ “Este motor perdió más de lo que produjo”

---

# 🔐 Seguridad / Roles

| Rol   | Permisos    |
| ----- | ----------- |
| OWNER | Todo        |
| ADMIN | Operación   |
| OPERATOR | Me, Lavadas |

---

# 🧭 Estado del sistema

Este backend **ya cubre**:

✅ Operación diaria
✅ Producción
✅ Paradas
✅ Dinero
✅ Pérdidas
✅ Rankings
✅ Alertas

No es demo.
No es MVP.
Es **software de negocio real**.

---

# 🚀 Próximo paso natural (para la app)

🥇 **Historial de payouts**

* ¿Cuánto ha ganado este businessro?
* ¿Cuánto ha producido este equipo?
* Totales por mes / negocio

Eso es exactamente lo que **el usuario pide primero**.

Cuando quieras, seguimos.
Este sistema ya **habla lenguaje businessro**, no lenguaje técnico ⛏️💰

// Reset

curl -X POST http://localhost:7000/api/dev/reset \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
