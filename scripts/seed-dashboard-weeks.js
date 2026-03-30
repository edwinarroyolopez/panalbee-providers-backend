const fs = require('fs');
const path = require('path');
const dns = require('node:dns');
const { MongoClient, ObjectId } = require('mongodb');

dns.setServers(['1.1.1.1', '8.8.8.8']);

const SEED_TAG = 'dashboard_seed_weeks_v1';

function readMongoUri() {
  const envPath = path.resolve(__dirname, '..', '.env');
  const txt = fs.readFileSync(envPath, 'utf8');
  const match = txt.match(/^MONGO_URI\s*=\s*(.+)$/m);
  if (!match) throw new Error('MONGO_URI no encontrado en .env');
  return match[1].trim().replace(/^"|"$/g, '');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function mondayOfWeekUtc(date) {
  const dayStart = startOfUtcDay(date);
  const dow = dayStart.getUTCDay();
  const diffToMonday = (dow + 6) % 7;
  return new Date(dayStart.getTime() - diffToMonday * 86400000);
}

function dateWithHour(baseDate, hour) {
  return new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      hour,
      0,
      0,
      0,
    ),
  );
}

function resolveOperationalType(type) {
  if (type === 'LAND') return 'STORE';
  if (type === 'RIVER') return 'WAREHOUSE';
  return type;
}

function pick(arr, index) {
  return arr[index % arr.length];
}

async function main() {
  const mongoUri = readMongoUri();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  const businesses = await db
    .collection('businesses')
    .find({ isActive: true }, { projection: { _id: 1, name: 1, type: 1, accountId: 1, ownerId: 1 } })
    .toArray();

  if (!businesses.length) {
    console.log('No hay negocios activos para poblar.');
    await client.close();
    return;
  }

  const now = new Date();
  const currentMonday = mondayOfWeekUtc(now);
  const previousMonday = new Date(currentMonday.getTime() - 7 * 86400000);
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(previousMonday.getTime() + i * 86400000);
    return {
      index: i,
      date: d,
      key: dayKey(d),
    };
  });

  const cleanupCollections = [
    'sales',
    'purchases',
    'transactions',
    'inventoryadjustments',
    'products',
    'providers',
    'employees',
    'garments',
    'garmentlots',
    'garmentoperationlogs',
    'cashclosings',
  ];

  for (const col of cleanupCollections) {
    await db.collection(col).deleteMany({ seedTag: SEED_TAG });
  }

  let salesToInsert = [];
  let purchasesToInsert = [];
  let txToInsert = [];
  let inventoryToInsert = [];
  let productsToInsert = [];
  let providersToInsert = [];
  let employeesToInsert = [];
  let garmentsToInsert = [];
  let lotsToInsert = [];
  let logsToInsert = [];
  let cashClosingsToUpsert = [];

  let productCounter = 0;
  let providerCounter = 0;
  let employeeCounter = 0;

  for (let bIndex = 0; bIndex < businesses.length; bIndex += 1) {
    const b = businesses[bIndex];
    const businessId = new ObjectId(b._id);
    const accountId = new ObjectId(b.accountId);
    const ownerId = new ObjectId(b.ownerId);
    const opType = resolveOperationalType(b.type);
    const businessToken = String(b._id).slice(-6);

    const dailyIncomeByKey = new Map();
    const dailyExpenseByKey = new Map();

    const supportsProducts = ['STORE', 'WAREHOUSE', 'WAREHOUSE_WITH_FACTORY', 'NIGHTCLUB'].includes(opType);
    const supportsSales = ['STORE', 'WAREHOUSE', 'WAREHOUSE_WITH_FACTORY'].includes(opType);
    const supportsPurchases = ['STORE', 'WAREHOUSE', 'WAREHOUSE_WITH_FACTORY', 'NIGHTCLUB'].includes(opType);
    const supportsInventory = ['WAREHOUSE', 'WAREHOUSE_WITH_FACTORY'].includes(opType);
    const cashDriven = ['NIGHTCLUB'].includes(opType);
    const isWorkshop = opType === 'GARMENT_WORKSHOP';

    const businessProductIds = [];

    if (supportsProducts) {
      const productBaseNames =
        opType === 'NIGHTCLUB'
          ? ['Licor premium', 'Cerveza botella', 'Energetica', 'Hielo bolsa']
          : ['Producto A', 'Producto B', 'Producto C', 'Producto D'];

      for (let i = 0; i < productBaseNames.length; i += 1) {
        productCounter += 1;
        const pId = new ObjectId();
        businessProductIds.push(pId);
        const rawName = `${productBaseNames[i]} ${businessToken} ${i + 1}`;
        const rating = 3 + ((bIndex + i) % 3);
        productsToInsert.push({
          _id: pId,
          accountId,
          businessIds: [businessId],
          name: rawName,
          normalizedName: normalizeText(rawName),
          sku: `SEED-${businessToken}-${productCounter}`,
          variant: i % 2 === 0 ? 'Base' : 'Plus',
          rating,
          purchasePrice: 7000 + (bIndex + 1) * 1200 + i * 900,
          salePrice: 10500 + (bIndex + 1) * 1700 + i * 1200,
          stock: 50 + i * 12 + bIndex,
          minStock: 8 + i,
          createdByUserId: ownerId,
          updatedByUserId: ownerId,
          isActive: true,
          seedTag: SEED_TAG,
          createdAt: dateWithHour(days[0].date, 9),
          updatedAt: dateWithHour(days[13].date, 18),
        });
      }
    }

    const providerId = new ObjectId();
    providerCounter += 1;
    const providerName = `Proveedor ${businessToken}`;
    providersToInsert.push({
      _id: providerId,
      accountId,
      businessId,
      name: providerName,
      normalizedName: normalizeText(providerName),
      phone: `320555${String(1000 + providerCounter).slice(-4)}`,
      address: `Zona comercial ${businessToken}`,
      rating: 4,
      createdByUserId: ownerId,
      isActive: true,
      seedTag: SEED_TAG,
      createdAt: dateWithHour(days[0].date, 8),
      updatedAt: dateWithHour(days[13].date, 8),
    });

    if (supportsSales) {
      for (const day of days) {
        const salesCount = opType === 'WAREHOUSE_WITH_FACTORY' ? 3 : 2;
        for (let s = 0; s < salesCount; s += 1) {
          const pId = businessProductIds[(day.index + s) % businessProductIds.length];
          const quantity = 1 + ((day.index + s + bIndex) % 4);
          const unitPrice = 15000 + bIndex * 1800 + day.index * 350 + s * 900;
          const subtotal = quantity * unitPrice;
          const makeManufacture = opType === 'WAREHOUSE_WITH_FACTORY' && s === 2;
          const isOpen = makeManufacture || day.index >= 11;
          const delayed = isOpen && day.index % 4 === 0;
          const status = makeManufacture
            ? pick(['EN_FABRICACION', 'LISTO_PARA_ENTREGAR', 'EN_REPARTO'], day.index)
            : isOpen
              ? pick(['PENDIENTE', 'EN_PROCESO'], day.index + s)
              : 'ENTREGADA';

          const paidAmount = isOpen ? Math.floor(subtotal * 0.4) : subtotal;
          const remaining = Math.max(0, subtotal - paidAmount);
          const saleDate = dateWithHour(day.date, 10 + s * 2);
          const deliveryDate = makeManufacture
            ? new Date(saleDate.getTime() + (2 + (day.index % 3)) * 86400000)
            : undefined;

          salesToInsert.push({
            _id: new ObjectId(),
            businessId,
            accountId,
            amountCop: subtotal,
            date: saleDate,
            paymentMethod: pick(['EFECTIVO', 'TRANSFERENCIA', 'QR'], day.index + s),
            description: `Venta seed ${day.key}`,
            status,
            saleType: makeManufacture ? 'MANUFACTURE' : 'IMMEDIATE',
            deliveryType: makeManufacture ? 'MANUFACTURE' : 'IMMEDIATE',
            deliveryDate,
            isDelayed: delayed,
            delayedDays: delayed ? 1 + (day.index % 5) : 0,
            delayedAt: delayed ? new Date(saleDate.getTime() + 86400000) : undefined,
            delayReason: delayed ? 'Demora de insumos' : undefined,
            priority: pick(['NORMAL', 'HIGH', 'URGENT'], day.index + s),
            paymentStatus: remaining > 0 ? 'PARTIAL' : 'PAID',
            productId: String(pId),
            paidAmountCop: paidAmount,
            remainingAmountCop: remaining,
            client: {
              id: `cli-${businessToken}-${day.index}-${s}`,
              name: `Cliente ${day.index + 1}-${s + 1}`,
              phone: `311700${String((bIndex + 1) * 100 + day.index * 10 + s).padStart(4, '0')}`,
              address: `Barrio ${1 + ((day.index + s) % 9)}`,
            },
            product: {
              id: String(pId),
              name: `Producto venta ${s + 1}`,
            },
            items: [
              {
                itemId: `item-${businessToken}-${day.index}-${s}`,
                productId: String(pId),
                productName: `Producto venta ${s + 1}`,
                quantity,
                unitPrice,
                subtotalCop: subtotal,
                requiresManufacturing: makeManufacture,
                operationalStatus: makeManufacture ? status : 'ENTREGADA',
              },
            ],
            manufacturingItems: makeManufacture
              ? [
                  {
                    manufacturingItemId: `m-${businessToken}-${day.index}-${s}`,
                    saleItemId: `item-${businessToken}-${day.index}-${s}`,
                    productId: String(pId),
                    productName: `Producto fabrica ${s + 1}`,
                    quantity,
                    operationalStatus: status,
                    priority: pick(['NORMAL', 'HIGH', 'URGENT'], day.index + 1),
                    commitmentDate: deliveryDate,
                    materialsBlocked: day.index % 5 === 0,
                    isDelayed: delayed,
                    delayedDays: delayed ? 1 + (day.index % 4) : 0,
                    startedAt: new Date(saleDate.getTime() + 4 * 3600000),
                  },
                ]
              : [],
            events: [
              {
                type: 'INVOICE_CREATED',
                message: 'Venta registrada por seed',
                createdAt: saleDate,
                createdBy: String(ownerId),
                createdByName: 'Seeder',
              },
            ],
            createdByUserId: ownerId,
            isActive: true,
            seedTag: SEED_TAG,
            createdAt: saleDate,
            updatedAt: saleDate,
          });
        }
      }
    }

    if (supportsPurchases) {
      for (const day of days) {
        const pId = businessProductIds.length
          ? businessProductIds[day.index % businessProductIds.length]
          : new ObjectId();
        const quantity = 2 + ((day.index + bIndex) % 6);
        const unitPrice = 6200 + bIndex * 500 + day.index * 170;
        const total = quantity * unitPrice;
        const status = day.index % 5 === 0 ? 'VENCIDA' : day.index % 3 === 0 ? 'PENDIENTE' : 'PAGADA';
        const paid = status === 'PAGADA' ? total : Math.floor(total * 0.45);
        const remaining = Math.max(0, total - paid);
        const purchaseDate = dateWithHour(day.date, 9);

        purchasesToInsert.push({
          _id: new ObjectId(),
          businessId,
          accountId,
          productId: pId,
          provider: providerName,
          providerId,
          quantity,
          unitPrice,
          totalAmount: total,
          invoiceDate: purchaseDate,
          invoiceGroupId: `INV-${businessToken}-${day.key}`,
          status,
          paymentType: status === 'PAGADA' ? 'CONTADO' : 'CREDITO',
          paidAmountCop: paid,
          remainingAmountCop: remaining,
          events: [
            {
              type: 'INVOICE_CREATED',
              message: 'Compra seed registrada',
              createdAt: purchaseDate,
              createdBy: String(ownerId),
              createdByName: 'Seeder',
            },
          ],
          createdByUserId: ownerId,
          isActive: true,
          seedTag: SEED_TAG,
          createdAt: purchaseDate,
          updatedAt: purchaseDate,
        });
      }
    }

    if (supportsInventory && businessProductIds.length) {
      for (const day of days) {
        const pId = businessProductIds[(day.index + 1) % businessProductIds.length];
        const plusDelta = 3 + ((day.index + bIndex) % 6);
        const minusDelta = 1 + ((day.index + bIndex) % 3);

        const inDate = dateWithHour(day.date, 11);
        const outDate = dateWithHour(day.date, 17);

        inventoryToInsert.push({
          _id: new ObjectId(),
          accountId,
          businessId,
          productId: pId,
          eventType: 'PURCHASE_EVENT',
          previousStock: 40 + day.index,
          newStock: 40 + day.index + plusDelta,
          delta: plusDelta,
          reason: 'Ingreso por compra seed',
          sourceType: 'SEED',
          sourceId: `seed-in-${businessToken}-${day.key}`,
          createdByUserId: ownerId,
          seedTag: SEED_TAG,
          createdAt: inDate,
          updatedAt: inDate,
        });

        inventoryToInsert.push({
          _id: new ObjectId(),
          accountId,
          businessId,
          productId: pId,
          eventType: 'SALE_EVENT',
          previousStock: 40 + day.index + plusDelta,
          newStock: 40 + day.index + plusDelta - minusDelta,
          delta: -minusDelta,
          reason: 'Salida por venta seed',
          sourceType: 'SEED',
          sourceId: `seed-out-${businessToken}-${day.key}`,
          createdByUserId: ownerId,
          seedTag: SEED_TAG,
          createdAt: outDate,
          updatedAt: outDate,
        });
      }
    }

    if (!isWorkshop) {
      for (const day of days) {
        const baseIncome = 60000 + bIndex * 8000 + day.index * 1400;
        const baseExpense = 18000 + bIndex * 2200 + (day.index % 6) * 1300;
        const income = supportsSales ? Math.floor(baseIncome * 1.15) : baseIncome;
        const expense = cashDriven ? Math.floor(baseExpense * 1.35) : baseExpense;

        dailyIncomeByKey.set(day.key, (dailyIncomeByKey.get(day.key) || 0) + income);
        dailyExpenseByKey.set(day.key, (dailyExpenseByKey.get(day.key) || 0) + expense);

        const incomeDate = dateWithHour(day.date, 20);
        const expenseDate = dateWithHour(day.date, 22);

        txToInsert.push({
          _id: new ObjectId(),
          accountId,
          businessId,
          kind: 'INCOME',
          amountCop: income,
          date: incomeDate,
          category: supportsSales ? 'Caja ventas' : 'Ingreso operativo',
          title: `Ingreso diario ${day.key}`,
          origin: {
            type: 'MANUAL',
            id: `seed-inc-${businessToken}-${day.key}`,
            label: 'Ingreso seed',
            meta: { seed: true },
          },
          notes: 'Movimiento seed para dashboard',
          createdByUserId: ownerId,
          isManual: true,
          isActive: true,
          seedTag: SEED_TAG,
          createdAt: incomeDate,
          updatedAt: incomeDate,
        });

        txToInsert.push({
          _id: new ObjectId(),
          accountId,
          businessId,
          kind: 'EXPENSE',
          amountCop: expense,
          date: expenseDate,
          category: pick(['Nomina', 'Servicios', 'Logistica', 'Reposicion'], day.index + bIndex),
          title: `Gasto diario ${day.key}`,
          origin: {
            type: 'MANUAL',
            id: `seed-exp-${businessToken}-${day.key}`,
            label: 'Gasto seed',
            meta: { seed: true },
          },
          notes: 'Movimiento seed para dashboard',
          createdByUserId: ownerId,
          isManual: true,
          isActive: true,
          seedTag: SEED_TAG,
          createdAt: expenseDate,
          updatedAt: expenseDate,
        });
      }

      for (const day of days) {
        const expectedIncomeCop = dailyIncomeByKey.get(day.key) || 0;
        const expectedExpenseCop = dailyExpenseByKey.get(day.key) || 0;
        const expectedNetCop = expectedIncomeCop - expectedExpenseCop;
        const reportedAmountCop = expectedNetCop + ((day.index + bIndex) % 3 === 0 ? -2000 : 1500);
        const differenceCop = reportedAmountCop - expectedNetCop;
        const closeDate = dateWithHour(day.date, 23);

        cashClosingsToUpsert.push({
          filter: {
            businessId,
            dayKey: day.key,
            isActive: true,
          },
          update: {
            $set: {
              accountId,
              date: closeDate,
              dayKey: day.key,
              responsibleUserId: ownerId,
              totalAmountCop: reportedAmountCop,
              expectedIncomeCop,
              expectedExpenseCop,
              expectedNetCop,
              reportedAmountCop,
              differenceCop,
              summaryBreakdown: {
                salesCollectedCop: supportsSales ? Math.floor(expectedIncomeCop * 0.65) : 0,
                salePaymentsCollectedCop: supportsSales ? Math.floor(expectedIncomeCop * 0.2) : 0,
                otherIncomeCop: supportsSales
                  ? expectedIncomeCop - Math.floor(expectedIncomeCop * 0.85)
                  : expectedIncomeCop,
                purchaseExpenseCop: Math.floor(expectedExpenseCop * 0.35),
                purchasePaymentsExpenseCop: Math.floor(expectedExpenseCop * 0.25),
                payablePaymentsExpenseCop: Math.floor(expectedExpenseCop * 0.15),
                otherExpenseCop:
                  expectedExpenseCop -
                  Math.floor(expectedExpenseCop * 0.35) -
                  Math.floor(expectedExpenseCop * 0.25) -
                  Math.floor(expectedExpenseCop * 0.15),
                incomesMovementCount: 1,
                expensesMovementCount: 1,
              },
              summaryMetadata: {
                dayStartIso: dateWithHour(day.date, 0).toISOString(),
                dayEndIso: dateWithHour(day.date, 23).toISOString(),
                generatedAtIso: closeDate.toISOString(),
                excludedOriginTypes: ['CASH_CLOSING'],
                source: 'TRANSACTIONS',
              },
              observations: 'Cierre generado por seed dashboard',
              seedTag: SEED_TAG,
              updatedAt: closeDate,
            },
            $setOnInsert: {
              _id: new ObjectId(),
              isActive: true,
              createdAt: closeDate,
            },
          },
          upsert: true,
        });
      }
    }

    if (isWorkshop) {
      const workerAId = new ObjectId();
      const workerBId = new ObjectId();
      employeeCounter += 1;
      const phoneA = `31588${String(2000 + employeeCounter).slice(-4)}`;
      employeeCounter += 1;
      const phoneB = `31588${String(2000 + employeeCounter).slice(-4)}`;

      employeesToInsert.push(
        {
          _id: workerAId,
          accountId,
          businessIds: [businessId],
          name: 'Maria',
          lastName: `Operaria${businessToken}`,
          phone: phoneA,
          normalizedPhone: normalizeText(phoneA),
          role: 'MANUFACTURER',
          isSystemUser: false,
          isActive: true,
          createdByUserId: ownerId,
          updatedByUserId: ownerId,
          seedTag: SEED_TAG,
          createdAt: dateWithHour(days[0].date, 8),
          updatedAt: dateWithHour(days[13].date, 8),
        },
        {
          _id: workerBId,
          accountId,
          businessIds: [businessId],
          name: 'Ana',
          lastName: `Confeccion${businessToken}`,
          phone: phoneB,
          normalizedPhone: normalizeText(phoneB),
          role: 'MANUFACTURER',
          isSystemUser: false,
          isActive: true,
          createdByUserId: ownerId,
          updatedByUserId: ownerId,
          seedTag: SEED_TAG,
          createdAt: dateWithHour(days[0].date, 8),
          updatedAt: dateWithHour(days[13].date, 8),
        },
      );

      const garmentId = new ObjectId();
      const garmentName = `Pantalon workshop ${businessToken}`;
      garmentsToInsert.push({
        _id: garmentId,
        accountId,
        businessId,
        name: garmentName,
        normalizedName: normalizeText(garmentName),
        defaultColor: 'Azul',
        imageUrls: [],
        operations: [
          {
            operationId: `op-corte-${businessToken}`,
            name: 'Corte',
            machineName: 'Mesa',
            unitPriceCop: 1200,
            sequence: 1,
          },
          {
            operationId: `op-costura-${businessToken}`,
            name: 'Costura',
            machineName: 'Plana',
            unitPriceCop: 2500,
            sequence: 2,
          },
        ],
        createdByUserId: ownerId,
        updatedByUserId: ownerId,
        isActive: true,
        seedTag: SEED_TAG,
        createdAt: dateWithHour(days[0].date, 8),
        updatedAt: dateWithHour(days[13].date, 8),
      });

      const lotAId = new ObjectId();
      const lotBId = new ObjectId();

      const lotASupplies = days.slice(0, 7).map((day, idx) => ({
        productId: `ins-${businessToken}-${idx}`,
        productName: `Insumo ${idx + 1}`,
        quantity: 4 + idx,
        unitCostCop: 1800 + idx * 90,
        totalCostCop: (4 + idx) * (1800 + idx * 90),
        note: 'Consumo de insumo',
        createdAt: dateWithHour(day.date, 11),
        createdBy: 'Seeder',
      }));

      const lotAIncome = days.slice(2, 14).filter((_, idx) => idx % 3 === 0).map((day, idx) => ({
        amountCop: 220000 + idx * 35000,
        receivedAt: dateWithHour(day.date, 16),
        paymentMethod: idx % 2 === 0 ? 'TRANSFERENCIA' : 'EFECTIVO',
        note: 'Abono lote A',
        createdBy: 'Seeder',
        createdAt: dateWithHour(day.date, 16),
      }));

      const lotALaborPayments = days.slice(4, 14).filter((_, idx) => idx % 3 === 1).map((day, idx) => ({
        employeeId: String(idx % 2 === 0 ? workerAId : workerBId),
        employeeName: idx % 2 === 0 ? 'Maria Operaria' : 'Ana Confeccion',
        amountCop: 140000 + idx * 18000,
        paidAt: dateWithHour(day.date, 19),
        paymentMethod: 'TRANSFERENCIA',
        note: 'Pago semanal',
        createdBy: 'Seeder',
        createdAt: dateWithHour(day.date, 19),
      }));

      lotsToInsert.push(
        {
          _id: lotAId,
          accountId,
          businessId,
          providerId,
          providerName,
          garmentId,
          garmentName,
          color: 'Azul',
          unitAgreedPriceCop: 9500,
          totalUnits: 420,
          sizeDistribution: [
            { size: 'S', quantity: 120 },
            { size: 'M', quantity: 180 },
            { size: 'L', quantity: 120 },
          ],
          colorLines: [
            {
              color: 'Azul',
              totalUnits: 420,
              sizeDistribution: [
                { size: 'S', quantity: 120 },
                { size: 'M', quantity: 180 },
                { size: 'L', quantity: 120 },
              ],
            },
          ],
          receivedDate: dateWithHour(days[0].date, 9),
          commitmentDate: dateWithHour(days[11].date, 18),
          externalReference: `LOT-A-${businessToken}`,
          status: 'EN_PROCESO',
          observations: 'Lote seed activo',
          operations: [
            {
              operationId: `op-corte-${businessToken}`,
              name: 'Corte',
              machineName: 'Mesa',
              unitPriceCop: 1200,
              sequence: 1,
              expectedUnits: 420,
              completedUnits: 390,
              isCompleted: false,
            },
            {
              operationId: `op-costura-${businessToken}`,
              name: 'Costura',
              machineName: 'Plana',
              unitPriceCop: 2500,
              sequence: 2,
              expectedUnits: 420,
              completedUnits: 330,
              isCompleted: false,
            },
          ],
          history: [
            {
              type: 'LOT_CREATED',
              message: 'Lote seed creado',
              createdAt: dateWithHour(days[0].date, 9),
              createdBy: String(ownerId),
            },
          ],
          supplies: lotASupplies,
          laborPayments: lotALaborPayments,
          incomePayments: lotAIncome,
          additionalCosts: [
            {
              type: 'TRANSPORT',
              amountCop: 165000,
              occurredAt: dateWithHour(days[6].date, 13),
              note: 'Transporte lote A',
              createdBy: 'Seeder',
              createdAt: dateWithHour(days[6].date, 13),
            },
            {
              type: 'OTHER',
              amountCop: 98000,
              occurredAt: dateWithHour(days[9].date, 13),
              note: 'Costo adicional lote A',
              createdBy: 'Seeder',
              createdAt: dateWithHour(days[9].date, 13),
            },
          ],
          isActive: true,
          createdByUserId: ownerId,
          updatedByUserId: ownerId,
          seedTag: SEED_TAG,
          createdAt: dateWithHour(days[0].date, 9),
          updatedAt: dateWithHour(days[13].date, 18),
        },
        {
          _id: lotBId,
          accountId,
          businessId,
          providerId,
          providerName,
          garmentId,
          garmentName,
          color: 'Negro',
          unitAgreedPriceCop: 10200,
          totalUnits: 280,
          sizeDistribution: [
            { size: 'M', quantity: 120 },
            { size: 'L', quantity: 160 },
          ],
          colorLines: [
            {
              color: 'Negro',
              totalUnits: 280,
              sizeDistribution: [
                { size: 'M', quantity: 120 },
                { size: 'L', quantity: 160 },
              ],
            },
          ],
          receivedDate: dateWithHour(days[7].date, 9),
          commitmentDate: dateWithHour(days[13].date, 18),
          externalReference: `LOT-B-${businessToken}`,
          status: 'LISTO_PARA_ENTREGAR',
          observations: 'Lote seed por entregar',
          operations: [
            {
              operationId: `op-corte-${businessToken}`,
              name: 'Corte',
              machineName: 'Mesa',
              unitPriceCop: 1200,
              sequence: 1,
              expectedUnits: 280,
              completedUnits: 280,
              isCompleted: true,
            },
            {
              operationId: `op-costura-${businessToken}`,
              name: 'Costura',
              machineName: 'Plana',
              unitPriceCop: 2500,
              sequence: 2,
              expectedUnits: 280,
              completedUnits: 260,
              isCompleted: false,
            },
          ],
          history: [
            {
              type: 'LOT_CREATED',
              message: 'Lote B seed creado',
              createdAt: dateWithHour(days[7].date, 9),
              createdBy: String(ownerId),
            },
          ],
          supplies: [
            {
              productId: `ins-${businessToken}-B1`,
              productName: 'Hilo negro',
              quantity: 18,
              unitCostCop: 2100,
              totalCostCop: 37800,
              note: 'Insumo lote B',
              createdAt: dateWithHour(days[8].date, 12),
              createdBy: 'Seeder',
            },
          ],
          laborPayments: [
            {
              employeeId: String(workerAId),
              employeeName: 'Maria Operaria',
              amountCop: 210000,
              paidAt: dateWithHour(days[12].date, 18),
              paymentMethod: 'TRANSFERENCIA',
              note: 'Pago avance lote B',
              createdBy: 'Seeder',
              createdAt: dateWithHour(days[12].date, 18),
            },
          ],
          incomePayments: [
            {
              amountCop: 450000,
              receivedAt: dateWithHour(days[12].date, 17),
              paymentMethod: 'TRANSFERENCIA',
              note: 'Abono lote B',
              createdBy: 'Seeder',
              createdAt: dateWithHour(days[12].date, 17),
            },
          ],
          additionalCosts: [
            {
              type: 'TRANSPORT',
              amountCop: 120000,
              occurredAt: dateWithHour(days[11].date, 13),
              note: 'Transporte lote B',
              createdBy: 'Seeder',
              createdAt: dateWithHour(days[11].date, 13),
            },
          ],
          readyAt: dateWithHour(days[13].date, 15),
          isActive: true,
          createdByUserId: ownerId,
          updatedByUserId: ownerId,
          seedTag: SEED_TAG,
          createdAt: dateWithHour(days[7].date, 9),
          updatedAt: dateWithHour(days[13].date, 18),
        },
      );

      for (const day of days) {
        const targetLotId = day.index < 8 ? lotAId : lotBId;
        const operationId = day.index % 2 === 0 ? `op-corte-${businessToken}` : `op-costura-${businessToken}`;
        const opName = day.index % 2 === 0 ? 'Corte' : 'Costura';
        const workerId = day.index % 2 === 0 ? workerAId : workerBId;
        const workerName = day.index % 2 === 0 ? 'Maria Operaria' : 'Ana Confeccion';
        const qty = 12 + ((day.index + bIndex) % 16);
        const unitPrice = day.index % 2 === 0 ? 1200 : 2500;
        const workedAt = dateWithHour(day.date, 14);

        logsToInsert.push({
          _id: new ObjectId(),
          accountId,
          businessId,
          lotId: targetLotId,
          garmentId,
          providerId,
          operationId,
          operationName: opName,
          machine: day.index % 2 === 0 ? 'Mesa' : 'Plana',
          unitPriceCop: unitPrice,
          size: pick(['S', 'M', 'L'], day.index),
          color: day.index < 8 ? 'Azul' : 'Negro',
          quantity: qty,
          workedAt,
          workerEmployeeId: workerId,
          workerName,
          workerRole: 'MANUFACTURER',
          note: 'Registro de produccion seed',
          createdByUserId: ownerId,
          seedTag: SEED_TAG,
          createdAt: workedAt,
          updatedAt: workedAt,
        });
      }
    }
  }

  if (productsToInsert.length) await db.collection('products').insertMany(productsToInsert);
  if (providersToInsert.length) await db.collection('providers').insertMany(providersToInsert);
  if (employeesToInsert.length) await db.collection('employees').insertMany(employeesToInsert);
  if (garmentsToInsert.length) await db.collection('garments').insertMany(garmentsToInsert);
  if (lotsToInsert.length) await db.collection('garmentlots').insertMany(lotsToInsert);
  if (logsToInsert.length) await db.collection('garmentoperationlogs').insertMany(logsToInsert);
  if (salesToInsert.length) await db.collection('sales').insertMany(salesToInsert);
  if (purchasesToInsert.length) await db.collection('purchases').insertMany(purchasesToInsert);
  if (txToInsert.length) await db.collection('transactions').insertMany(txToInsert);
  if (inventoryToInsert.length) await db.collection('inventoryadjustments').insertMany(inventoryToInsert);

  for (const op of cashClosingsToUpsert) {
    await db.collection('cashclosings').updateOne(op.filter, op.update, { upsert: op.upsert });
  }

  console.log('Seed completado.');
  console.log(
    JSON.stringify(
      {
        businesses: businesses.length,
        daysSeeded: days.length,
        inserted: {
          products: productsToInsert.length,
          providers: providersToInsert.length,
          employees: employeesToInsert.length,
          garments: garmentsToInsert.length,
          garmentLots: lotsToInsert.length,
          garmentLogs: logsToInsert.length,
          sales: salesToInsert.length,
          purchases: purchasesToInsert.length,
          transactions: txToInsert.length,
          inventoryAdjustments: inventoryToInsert.length,
          cashClosingsUpserts: cashClosingsToUpsert.length,
        },
      },
      null,
      2,
    ),
  );

  await client.close();
}

main().catch((error) => {
  console.error('Error ejecutando seed:', error);
  process.exit(1);
});
