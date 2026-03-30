const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const TAG = '[sim-semana-real-v2]';
const DEFAULT_ACCOUNT_ID = '69b176bd8de38a6551455fb2';
const TARGET_BUSINESSES = 4;

const BUSINESS_NAME_POOL = ['Tienda Tapao', 'Tienda Centro', 'Tienda Alameda', 'Tienda La 15', 'Tienda Norte'];
const PROVIDERS = ['Distribuidora Andina', 'Mayorista Tapao', 'Comercial El Portal', 'Bodega Centro'];

const TAG_REGEX = new RegExp(TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

function readMongoUri() {
  const envPath = path.resolve(__dirname, '..', '.env');
  const envRaw = fs.readFileSync(envPath, 'utf8');
  const match = envRaw.match(/^MONGO_URI=(.*)$/m);
  if (!match) throw new Error('MONGO_URI not found in .env');
  return match[1].trim().replace(/^['\"]|['\"]$/g, '');
}

function startOfDayUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function pick(list, index) {
  return list[index % list.length];
}

function toMoney(value) {
  return Math.max(0, Math.round(value));
}

function statusColor(status) {
  if (status === 'PENDIENTE') return '#F8C74A';
  if (status === 'EN_PROCESO') return '#60A5FA';
  if (status === 'EN_FABRICACION') return '#A78BFA';
  if (status === 'LISTO_PARA_ENTREGAR') return '#34D399';
  if (status === 'EN_REPARTO') return '#38BDF8';
  if (status === 'ENTREGADA') return '#22C55E';
  if (status === 'CANCELADA') return '#F87171';
  return '#7E94BE';
}

function saleTypeByPosition(dayIndex, saleIndex) {
  const matrix = [
    ['IMMEDIATE', 'SPECIAL_ORDER', 'MANUFACTURE'],
    ['IMMEDIATE', 'IMMEDIATE', 'SPECIAL_ORDER', 'MANUFACTURE'],
    ['SPECIAL_ORDER', 'IMMEDIATE', 'MANUFACTURE'],
    ['IMMEDIATE', 'SPECIAL_ORDER', 'MANUFACTURE', 'MANUFACTURE'],
    ['IMMEDIATE', 'SPECIAL_ORDER', 'IMMEDIATE'],
    ['MANUFACTURE', 'SPECIAL_ORDER', 'IMMEDIATE', 'MANUFACTURE'],
    ['IMMEDIATE', 'SPECIAL_ORDER', 'MANUFACTURE'],
  ];

  return pick(pick(matrix, dayIndex), saleIndex);
}

function saleStatusByPosition(dayIndex, saleType, saleIndex) {
  const oldDay = dayIndex <= 1;
  const midDay = dayIndex <= 3;

  if (oldDay) {
    if (saleType === 'MANUFACTURE') return pick(['ENTREGADA', 'LISTO_PARA_ENTREGAR'], saleIndex);
    return pick(['ENTREGADA', 'EN_REPARTO', 'CANCELADA'], saleIndex);
  }

  if (midDay) {
    if (saleType === 'MANUFACTURE') return pick(['EN_FABRICACION', 'LISTO_PARA_ENTREGAR', 'EN_REPARTO'], saleIndex);
    return pick(['EN_PROCESO', 'EN_REPARTO', 'ENTREGADA'], saleIndex);
  }

  if (saleType === 'MANUFACTURE') return pick(['EN_FABRICACION', 'EN_PROCESO', 'LISTO_PARA_ENTREGAR'], saleIndex);
  return pick(['PENDIENTE', 'EN_PROCESO', 'EN_REPARTO'], saleIndex);
}

function paymentStatusByPosition(dayIndex, saleIndex) {
  if (dayIndex <= 1) return pick(['PAID', 'PAID', 'PARTIAL'], saleIndex);
  if (dayIndex <= 4) return pick(['PARTIAL', 'PAID', 'PENDING'], saleIndex);
  return pick(['PENDING', 'PARTIAL', 'PENDING'], saleIndex);
}

function buildBusinessPlans(multiplier) {
  return [
    { dayOffset: 6, salesTarget: toMoney(420000 * multiplier), salesCount: 3, purchaseTarget: toMoney(210000 * multiplier), purchaseCount: 1 },
    { dayOffset: 5, salesTarget: toMoney(980000 * multiplier), salesCount: 5, purchaseTarget: toMoney(640000 * multiplier), purchaseCount: 3 },
    { dayOffset: 4, salesTarget: toMoney(590000 * multiplier), salesCount: 4, purchaseTarget: toMoney(340000 * multiplier), purchaseCount: 2 },
    { dayOffset: 3, salesTarget: toMoney(1310000 * multiplier), salesCount: 6, purchaseTarget: toMoney(910000 * multiplier), purchaseCount: 4 },
    { dayOffset: 2, salesTarget: toMoney(760000 * multiplier), salesCount: 4, purchaseTarget: toMoney(280000 * multiplier), purchaseCount: 2 },
    { dayOffset: 1, salesTarget: toMoney(1680000 * multiplier), salesCount: 7, purchaseTarget: toMoney(760000 * multiplier), purchaseCount: 3 },
    { dayOffset: 0, salesTarget: toMoney(1040000 * multiplier), salesCount: 5, purchaseTarget: toMoney(430000 * multiplier), purchaseCount: 2 },
  ];
}

async function ensureBusinessMirror(db, businessDoc) {
  await db.collection('businesses').updateOne(
    { _id: businessDoc._id },
    {
      $setOnInsert: {
        _id: businessDoc._id,
        accountId: businessDoc.accountId,
        ownerId: businessDoc.ownerId,
        name: businessDoc.name,
        address: businessDoc.address || '',
        phone: businessDoc.phone || '',
        type: businessDoc.type,
        settlementType: businessDoc.settlementType,
        totalPuestos: businessDoc.totalPuestos || 0,
        isActive: true,
        createdAt: businessDoc.createdAt || new Date(),
        updatedAt: businessDoc.updatedAt || new Date(),
      },
    },
    { upsert: true },
  );
}

async function run() {
  await mongoose.connect(readMongoUri());
  const db = mongoose.connection.db;

  const accountIdInput = process.argv[2] || DEFAULT_ACCOUNT_ID;
  const accountId = new mongoose.Types.ObjectId(accountIdInput);

  const account = await db.collection('accounts').findOne({ _id: accountId, isActive: true });
  if (!account) {
    throw new Error(`Account not found or inactive: ${accountIdInput}`);
  }

  const ownerUser = await db.collection('users').findOne({ accountId, role: 'OWNER', isActive: true });
  if (!ownerUser) {
    throw new Error(`No OWNER user found for account ${accountIdInput}`);
  }

  const now = new Date();
  let businesses = await db.collection('businesses').find({ accountId, isActive: true }).sort({ createdAt: 1 }).toArray();

  const existingNames = new Set(businesses.map((b) => b.name));
  const toCreate = Math.max(0, TARGET_BUSINESSES - businesses.length);
  let createdBusinesses = 0;

  for (const name of BUSINESS_NAME_POOL) {
    if (createdBusinesses >= toCreate) break;
    if (existingNames.has(name)) continue;

    const doc = {
      accountId,
      ownerId: ownerUser._id,
      name,
      address: '',
      phone: '',
      type: 'LAND',
      settlementType: 'POSITIONS',
      totalPuestos: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const inserted = await db.collection('businesses').insertOne(doc);
    await db.collection('businessmemberships').updateOne(
      { businessId: inserted.insertedId, userId: ownerUser._id },
      {
        $setOnInsert: {
          businessId: inserted.insertedId,
          userId: ownerUser._id,
          role: 'OWNER',
          puestoCount: 1,
          isInside: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    await ensureBusinessMirror(db, { ...doc, _id: inserted.insertedId });
    createdBusinesses += 1;
  }

  businesses = await db.collection('businesses').find({ accountId, isActive: true }).sort({ createdAt: 1 }).toArray();

  for (const business of businesses) {
    await db.collection('businessmemberships').updateOne(
      { businessId: business._id, userId: ownerUser._id },
      {
        $setOnInsert: {
          businessId: business._id,
          userId: ownerUser._id,
          role: 'OWNER',
          puestoCount: 1,
          isInside: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    await ensureBusinessMirror(db, business);
  }

  const selectedBusinesses = businesses.slice(0, TARGET_BUSINESSES);
  const selectedBusinessIds = selectedBusinesses.map((b) => b._id);

  await db.collection('sales').deleteMany({
    businessId: { $in: selectedBusinessIds },
    $or: [{ description: { $regex: TAG_REGEX } }, { observations: { $regex: TAG_REGEX } }],
  });

  await db.collection('purchases').deleteMany({
    accountId,
    businessId: { $in: selectedBusinessIds },
    invoiceGroupId: { $regex: '^SIMSEM-' },
  });

  await db.collection('inventoryadjustments').deleteMany({
    accountId,
    businessId: { $in: selectedBusinessIds },
    reason: { $regex: TAG_REGEX },
  });

  const products = await db
    .collection('products')
    .find({
      accountId,
      isActive: true,
      $or: [{ businessIds: { $size: 0 } }, { businessIds: { $in: selectedBusinessIds } }],
    })
    .project({ _id: 1, name: 1, salePrice: 1, purchasePrice: 1, stock: 1 })
    .toArray();

  if (!products.length) {
    throw new Error('No active products found for this account/business scope');
  }

  const baseCustomers = [
    { name: 'Laura Acosta', phone: '3215468524', address: 'Calle 12 #18-21' },
    { name: 'Carlos Velez', phone: '3207789012', address: 'Cra 22 #10-50' },
    { name: 'Diana Moya', phone: '3134429011', address: 'Barrio Centro' },
    { name: 'Jaime Torres', phone: '3009001122', address: 'Vereda Norte' },
    { name: 'Patricia Rojas', phone: '3117834501', address: 'Calle 7 #3-11' },
    { name: 'Andres Mejia', phone: '3157780099', address: 'Barrio Vista' },
  ];

  const customersByBusiness = new Map();
  for (let bIndex = 0; bIndex < selectedBusinesses.length; bIndex += 1) {
    const business = selectedBusinesses[bIndex];

    for (let cIndex = 0; cIndex < baseCustomers.length; cIndex += 1) {
      const c = baseCustomers[cIndex];
      const phone = `${String(3100000000 + bIndex * 10000 + cIndex * 137).slice(0, 10)}`;
      await db.collection('customers').updateOne(
        { businessId: business._id, phone, isActive: true },
        {
          $setOnInsert: {
            businessId: business._id,
            createdByUserId: ownerUser._id,
            name: `${c.name} ${bIndex + 1}`,
            phone,
            address: c.address,
            lifecycle: 'ACTIVE',
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      );
    }

    const businessCustomers = await db
      .collection('customers')
      .find({ businessId: business._id, isActive: true })
      .project({ _id: 1, name: 1, phone: 1, address: 1 })
      .toArray();

    customersByBusiness.set(business._id.toString(), businessCustomers);
  }

  const employeesByBusiness = new Map();
  for (let bIndex = 0; bIndex < selectedBusinesses.length; bIndex += 1) {
    const business = selectedBusinesses[bIndex];

    const employeeSeeds = [
      {
        name: `Vendedor${bIndex + 1}`,
        lastName: 'Rios',
        phone: `${String(3205000000 + bIndex * 111).slice(0, 10)}`,
        role: 'SELLER',
      },
      {
        name: `Vendedor${bIndex + 1}`,
        lastName: 'Pardo',
        phone: `${String(3206000000 + bIndex * 111).slice(0, 10)}`,
        role: 'SELLER',
      },
      {
        name: `Fabricante${bIndex + 1}`,
        lastName: 'Suarez',
        phone: `${String(3207000000 + bIndex * 111).slice(0, 10)}`,
        role: 'MANUFACTURER',
      },
    ];

    for (const employee of employeeSeeds) {
      await db.collection('employees').updateOne(
        { accountId, normalizedPhone: employee.phone.replace(/\D/g, ''), isActive: true },
        {
          $set: {
            accountId,
            businessIds: [business._id],
            name: employee.name,
            lastName: employee.lastName,
            phone: employee.phone,
            normalizedPhone: employee.phone.replace(/\D/g, ''),
            role: employee.role,
            isSystemUser: false,
            createdByUserId: ownerUser._id,
            isActive: true,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }

    const employees = await db
      .collection('employees')
      .find({
        accountId,
        isActive: true,
        $or: [{ businessIds: { $size: 0 } }, { businessIds: business._id }],
        role: { $in: ['SELLER', 'MANUFACTURER'] },
      })
      .project({ _id: 1, name: 1, lastName: 1, phone: 1, role: 1 })
      .toArray();

    employeesByBusiness.set(business._id.toString(), employees);
  }

  const currentStock = new Map(products.map((p) => [p._id.toString(), Math.max(0, Math.round(Number(p.stock || 0)))]));
  const stockWrites = new Map();

  const multipliers = [0.95, 1.2, 0.78, 1.35];
  const todayStart = startOfDayUtc(new Date());

  const report = {
    accountId: accountId.toString(),
    tag: TAG,
    businesses: selectedBusinesses.map((b) => ({ id: b._id.toString(), name: b.name })),
    createdBusinesses,
    insertedSales: 0,
    insertedPurchases: 0,
    perBusiness: [],
  };

  for (let bIndex = 0; bIndex < selectedBusinesses.length; bIndex += 1) {
    const business = selectedBusinesses[bIndex];
    const businessIdString = business._id.toString();
    const customers = customersByBusiness.get(businessIdString) || [];
    const employees = employeesByBusiness.get(businessIdString) || [];

    const plans = buildBusinessPlans(pick(multipliers, bIndex));
    const businessDaily = [];
    let businessSalesTotal = 0;
    let businessPurchasesTotal = 0;
    let businessSalesCount = 0;
    let businessPurchasesCount = 0;

    for (let dayIndex = 0; dayIndex < plans.length; dayIndex += 1) {
      const plan = plans[dayIndex];
      const dayDate = addDays(todayStart, -plan.dayOffset);

      let daySalesTotal = 0;
      for (let saleIndex = 0; saleIndex < plan.salesCount; saleIndex += 1) {
        const product = pick(products, bIndex * 31 + dayIndex * 7 + saleIndex);
        const customer = customers.length ? pick(customers, dayIndex * 5 + saleIndex) : null;
        const responsible = employees.length ? pick(employees, dayIndex + saleIndex) : null;

        const saleType = saleTypeByPosition(dayIndex, saleIndex);
        const status = saleStatusByPosition(dayIndex, saleType, saleIndex);
        const paymentStatus = paymentStatusByPosition(dayIndex, saleIndex);

        const share = 1 + (saleIndex - (plan.salesCount - 1) / 2) * 0.17;
        const amountCop = toMoney((plan.salesTarget / plan.salesCount) * share);
        const paidAmountCop =
          paymentStatus === 'PAID'
            ? amountCop
            : paymentStatus === 'PARTIAL'
              ? toMoney(amountCop * (0.35 + ((saleIndex % 3) * 0.2)))
              : 0;
        const remainingAmountCop = Math.max(0, amountCop - paidAmountCop);

        const deliveryOffset = saleType === 'MANUFACTURE' ? (saleIndex % 4) - 1 : saleIndex % 3;
        const deliveryDate = addDays(dayDate, deliveryOffset);
        const closed = status === 'ENTREGADA' || status === 'CANCELADA';
        const isDelayed = !closed && deliveryDate < todayStart;
        const delayedDays = isDelayed ? Math.floor((todayStart.getTime() - deliveryDate.getTime()) / 86400000) : 0;
        const eventDate = addMinutes(dayDate, 8 * 60 + saleIndex * 70);

        const saleDoc = {
          businessId: business._id,
          amountCop,
          date: eventDate,
          paymentMethod: pick(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'NEQUI'], bIndex + saleIndex),
          description: `Venta semanal multi negocio ${TAG}`,
          status,
          saleType,
          deliveryType: saleType === 'MANUFACTURE' ? 'MANUFACTURE' : 'IMMEDIATE',
          deliveryDate,
          isDelayed,
          delayedDays,
          delayedAt: isDelayed ? addMinutes(eventDate, 130) : undefined,
          delayReason: isDelayed ? 'Demora en disponibilidad de materiales' : undefined,
          priority: isDelayed ? 'URGENT' : saleIndex % 3 === 0 ? 'HIGH' : 'NORMAL',
          paymentStatus,
          productId: product._id.toString(),
          responsibleEmployeeId: responsible ? responsible._id.toString() : undefined,
          paidAmountCop,
          remainingAmountCop,
          client: {
            id: customer ? customer._id.toString() : undefined,
            name: customer ? customer.name : undefined,
            phone: customer ? customer.phone : undefined,
            address: customer ? customer.address : undefined,
          },
          product: {
            id: product._id.toString(),
            name: product.name,
            details: `Producto existente para simulacion ${TAG}`,
            dimensions: pick(['80x200', '120x180', '140x200'], dayIndex + saleIndex),
          },
          responsibleEmployee: responsible
            ? {
                id: responsible._id.toString(),
                name: responsible.name,
                lastName: responsible.lastName,
                phone: responsible.phone,
              }
            : undefined,
          observations: `Semana operativa multi negocio ${TAG}`,
          events: [
            {
              type: 'SALE_CREATED',
              message: `Venta registrada por ${amountCop.toLocaleString('es-CO')} COP`,
              createdAt: addMinutes(eventDate, 5),
              createdBy: ownerUser._id.toString(),
              createdByName: ownerUser.name || ownerUser.phone || 'Owner',
              statusSnapshot: status,
              statusLabel: status,
              statusColor: statusColor(status),
              photos: [],
            },
            {
              type: 'STATUS_CHANGED',
              message: `Estado actual ${status}`,
              createdAt: addMinutes(eventDate, 7),
              createdBy: ownerUser._id.toString(),
              createdByName: ownerUser.name || ownerUser.phone || 'Owner',
              statusSnapshot: status,
              statusLabel: status,
              statusColor: statusColor(status),
              photos: [],
            },
          ],
          createdByUserId: ownerUser._id,
          isActive: true,
          createdAt: addMinutes(eventDate, 4),
          updatedAt: addMinutes(eventDate, 15),
        };

        const saleResult = await db.collection('sales').insertOne(saleDoc);

        const stockBefore = currentStock.get(product._id.toString()) || 0;
        const stockAfter = Math.max(0, stockBefore - 1);
        currentStock.set(product._id.toString(), stockAfter);
        stockWrites.set(product._id.toString(), { _id: product._id, stock: stockAfter });

        await db.collection('inventoryadjustments').insertOne({
          accountId,
          businessId: business._id,
          productId: product._id,
          eventType: 'SALE_EVENT',
          previousStock: stockBefore,
          newStock: stockAfter,
          delta: -1,
          reason: `Ajuste por venta simulada ${TAG}`,
          sourceType: 'SALE',
          sourceId: saleResult.insertedId.toString(),
          createdByUserId: ownerUser._id,
          createdAt: addMinutes(eventDate, 16),
          updatedAt: addMinutes(eventDate, 16),
        });

        daySalesTotal += amountCop;
        businessSalesTotal += amountCop;
        businessSalesCount += 1;
        report.insertedSales += 1;
      }

      let dayPurchasesTotal = 0;
      for (let pIndex = 0; pIndex < plan.purchaseCount; pIndex += 1) {
        const product = pick(products, bIndex * 37 + dayIndex * 9 + pIndex + 2);
        const provider = pick(PROVIDERS, bIndex + dayIndex + pIndex);

        const baseCost = plan.purchaseTarget / plan.purchaseCount;
        const factor = 1 + (pIndex - (plan.purchaseCount - 1) / 2) * 0.22;
        const totalAmount = toMoney(baseCost * factor);

        const refPrice = Math.max(500, Math.round(Number(product.purchasePrice || product.salePrice || 5000)));
        const quantity = Math.max(2, Math.round(totalAmount / refPrice));
        const unitPrice = Math.max(300, Math.round(totalAmount / quantity));
        const normalizedTotal = quantity * unitPrice;

        const paymentType = pIndex % 3 === 0 ? 'CONTADO' : 'CREDITO';
        const status = paymentType === 'CONTADO' ? 'PAGADA' : pIndex % 2 === 0 ? 'PENDIENTE' : 'PAGADA';
        const paidAmountCop = status === 'PAGADA' ? normalizedTotal : toMoney(normalizedTotal * 0.45);
        const remainingAmountCop = Math.max(0, normalizedTotal - paidAmountCop);

        const invoiceDate = addMinutes(dayDate, 7 * 60 + pIndex * 85);
        const invoiceGroupId = `SIMSEM-${invoiceDate.toISOString().slice(0, 10)}-B${bIndex + 1}-${pIndex}`;

        const purchaseDoc = {
          accountId,
          businessId: business._id,
          productId: product._id,
          provider,
          quantity,
          unitPrice,
          totalAmount: normalizedTotal,
          invoiceDate,
          invoiceGroupId,
          status,
          paymentType,
          paidAmountCop,
          remainingAmountCop,
          createdByUserId: ownerUser._id,
          isActive: true,
          createdAt: addMinutes(invoiceDate, 3),
          updatedAt: addMinutes(invoiceDate, 8),
        };

        const purchaseResult = await db.collection('purchases').insertOne(purchaseDoc);

        const stockBefore = currentStock.get(product._id.toString()) || 0;
        const stockAfter = stockBefore + quantity;
        currentStock.set(product._id.toString(), stockAfter);
        stockWrites.set(product._id.toString(), {
          _id: product._id,
          stock: stockAfter,
          purchasePrice: unitPrice,
        });

        await db.collection('inventoryadjustments').insertOne({
          accountId,
          businessId: business._id,
          productId: product._id,
          eventType: 'PURCHASE_EVENT',
          previousStock: stockBefore,
          newStock: stockAfter,
          delta: quantity,
          reason: `Ajuste por compra simulada ${TAG}`,
          sourceType: 'PURCHASE',
          sourceId: purchaseResult.insertedId.toString(),
          createdByUserId: ownerUser._id,
          createdAt: addMinutes(invoiceDate, 9),
          updatedAt: addMinutes(invoiceDate, 9),
        });

        dayPurchasesTotal += normalizedTotal;
        businessPurchasesTotal += normalizedTotal;
        businessPurchasesCount += 1;
        report.insertedPurchases += 1;
      }

      businessDaily.push({
        day: dayDate.toISOString().slice(0, 10),
        salesCount: plan.salesCount,
        salesTotal: daySalesTotal,
        purchaseCount: plan.purchaseCount,
        purchasesTotal: dayPurchasesTotal,
      });
    }

    report.perBusiness.push({
      businessId: businessIdString,
      businessName: business.name,
      salesCount: businessSalesCount,
      salesTotal: businessSalesTotal,
      purchasesCount: businessPurchasesCount,
      purchasesTotal: businessPurchasesTotal,
      daily: businessDaily,
    });
  }

  if (stockWrites.size) {
    const bulk = Array.from(stockWrites.values()).map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $set: {
            stock: item.stock,
            ...(item.purchasePrice ? { purchasePrice: item.purchasePrice } : {}),
            updatedByUserId: ownerUser._id,
            updatedAt: new Date(),
          },
        },
      },
    }));

    await db.collection('products').bulkWrite(bulk);
  }

  const weekStart = addDays(todayStart, -6);
  const weekEnd = addMinutes(addDays(todayStart, 1), -1);

  const salesWeeklyAgg = await db
    .collection('sales')
    .aggregate([
      {
        $match: {
          businessId: { $in: selectedBusinessIds },
          isActive: true,
          date: { $gte: weekStart, $lte: weekEnd },
        },
      },
      {
        $group: {
          _id: '$businessId',
          total: { $sum: '$amountCop' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ])
    .toArray();

  const purchaseWeeklyAgg = await db
    .collection('purchases')
    .aggregate([
      {
        $match: {
          accountId,
          businessId: { $in: selectedBusinessIds },
          isActive: true,
          invoiceDate: { $gte: weekStart, $lte: weekEnd },
        },
      },
      {
        $group: {
          _id: '$businessId',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ])
    .toArray();

  report.salesWeeklyAgg = salesWeeklyAgg.map((item) => ({
    businessId: item._id.toString(),
    count: item.count,
    total: item.total,
  }));
  report.purchaseWeeklyAgg = purchaseWeeklyAgg.map((item) => ({
    businessId: item._id.toString(),
    count: item.count,
    total: item.total,
  }));

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
