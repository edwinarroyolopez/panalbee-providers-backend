const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const ACCOUNT_ID = process.argv[2] || '69add5f1df09e809bb8c29d8';
const SEED_TAG = '[seed-analytics-v1]';

function readMongoUri() {
  const envPath = path.resolve(__dirname, '..', '.env');
  const envRaw = fs.readFileSync(envPath, 'utf8');
  const match = envRaw.match(/^MONGO_URI=(.*)$/m);
  if (!match) throw new Error('MONGO_URI not found');

  let uri = match[1].trim();
  const sq = String.fromCharCode(39);
  if ((uri[0] === '"' && uri[uri.length - 1] === '"') || (uri[0] === sq && uri[uri.length - 1] === sq)) {
    uri = uri.slice(1, -1);
  }

  return uri;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function diffDays(fromDate, toDate) {
  const from = Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate());
  const to = Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate());
  return Math.floor((to - from) / 86400000);
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildEvents({
  baseDate,
  status,
  saleType,
  amountCop,
  paidAmountCop,
  remainingAmountCop,
  deliveryDate,
  createdBy,
  createdByName,
  isDelayed,
  delayedDays,
  manualNote,
  reason,
}) {
  const events = [
    {
      type: 'SALE_CREATED',
      message: `Venta registrada por ${amountCop.toLocaleString('es-CO')} COP`,
      createdAt: addMinutes(baseDate, 5),
      createdBy,
      createdByName,
      photos: [],
    },
    {
      type: 'STATUS_CHANGED',
      message: `Estado inicial: ${status}`,
      createdAt: addMinutes(baseDate, 6),
      createdBy,
      createdByName,
      photos: [],
      metadata: {
        from: null,
        to: status,
        saleType,
      },
    },
  ];

  if (paidAmountCop > 0) {
    events.push({
      type: 'PAYMENT_RECORDED',
      message: `Abono inicial por ${paidAmountCop.toLocaleString('es-CO')} COP`,
      createdAt: addMinutes(baseDate, 7),
      createdBy,
      createdByName,
      photos: [],
      metadata: {
        amountCop: paidAmountCop,
        remainingAmountCop,
      },
    });
  }

  if (deliveryDate) {
    events.push({
      type: 'DELIVERY_DATE_SET',
      message: `Fecha de entrega definida para ${deliveryDate.toISOString().slice(0, 10)}`,
      createdAt: addMinutes(baseDate, 8),
      createdBy,
      createdByName,
      photos: [],
    });
  }

  if (saleType === 'MANUFACTURE') {
    events.push({
      type: 'MANUFACTURE_STARTED',
      message: 'Se inició proceso de fabricación',
      createdAt: addMinutes(baseDate, 50),
      createdBy,
      createdByName,
      photos: [],
    });

    if (status === 'EN_FABRICACION' || status === 'EN_REPARTO' || status === 'ENTREGADA') {
      events.push({
        type: 'STRUCTURE_ASSEMBLED',
        message: 'Estructura armada y validada',
        createdAt: addMinutes(baseDate, 180),
        createdBy,
        createdByName,
        photos: [],
      });
    }

    if (reason) {
      events.push({
        type: 'MATERIAL_DELAY',
        message: reason,
        createdAt: addMinutes(baseDate, 220),
        createdBy,
        createdByName,
        photos: [],
      });
    }
  }

  if (isDelayed) {
    events.push({
      type: 'SYSTEM_DELAY_MARKED',
      message: 'Venta marcada como retrasada automáticamente',
      createdAt: addMinutes(baseDate, 300),
      createdBy: 'system',
      createdByName: 'Sistema',
      photos: [],
      metadata: {
        delayedDays,
        overdueDate: deliveryDate,
        priorityUpdatedTo: 'URGENT',
      },
    });
  }

  if (manualNote) {
    events.push({
      type: 'IMPORTANT_NOTE',
      message: manualNote,
      createdAt: addMinutes(baseDate, 360),
      createdBy,
      createdByName,
      photos: [],
    });
  }

  return events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function run() {
  await mongoose.connect(readMongoUri());

  const db = mongoose.connection.db;
  const accountId = new mongoose.Types.ObjectId(ACCOUNT_ID);

  const ownerUser = await db.collection('users').findOne({ accountId, role: 'OWNER', isActive: true });
  if (!ownerUser) {
    throw new Error(`No OWNER found for account ${ACCOUNT_ID}`);
  }

  const now = new Date();
  const todayStart = startOfDay(now);

  const businessNames = ['Ela', 'Troncal'];
  for (const name of businessNames) {
    const exists = await db.collection('businesses').findOne({ accountId, name, isActive: true });
    if (!exists) {
      const businessDoc = {
        accountId,
        ownerId: ownerUser._id,
        name,
        type: 'LAND',
        settlementType: 'POSITIONS',
        totalPuestos: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const insertBusiness = await db.collection('businesses').insertOne(businessDoc);
      await db.collection('businessmemberships').updateOne(
        { businessId: insertBusiness.insertedId, userId: ownerUser._id },
        {
          $setOnInsert: {
            businessId: insertBusiness.insertedId,
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
    }
  }

  const businesses = await db.collection('businesses').find({ accountId, isActive: true }).project({ _id: 1, name: 1 }).toArray();
  const businessMap = new Map(businesses.map((m) => [m.name, m]));

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
  }

  let products = await db.collection('products').find({ accountId, isActive: true }).toArray();
  const extraProducts = ['Reja decorativa', 'División de baño'];
  if (products.length < 4) {
    for (const name of extraProducts) {
      const normalizedName = normalizeName(name);
      const exists = await db.collection('products').findOne({ accountId, normalizedName, isActive: true });
      if (!exists) {
        await db.collection('products').insertOne({
          accountId,
          businessIds: [],
          name,
          normalizedName,
          rating: 3,
          isActive: true,
          createdByUserId: ownerUser._id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    products = await db.collection('products').find({ accountId, isActive: true }).toArray();
  }

  const customerSeeds = {
    Chelsea: [
      { name: 'Laura Acosta', phone: '3215468524', address: 'Calle 12' },
      { name: 'Carlos Vélez', phone: '3207789012', address: 'Cra 22 #10-50' },
      { name: 'Diana Moya', phone: '3134429011', address: 'Barrio Centro' },
      { name: 'Jaime Torres', phone: '3009001122', address: 'Vereda Norte' },
    ],
    'La tercera': [
      { name: 'Patricia Rojas', phone: '3117834501', address: 'Calle 7 #3-11' },
      { name: 'Andrés Mejía', phone: '3157780099', address: 'Barrio Vista' },
      { name: 'Nora Salazar', phone: '3120094411', address: 'Sector Sur' },
      { name: 'Hugo Cabrera', phone: '3209987712', address: 'Zona Industrial' },
    ],
    Ela: [
      { name: 'Marlon Cifuentes', phone: '3145512233', address: 'Av Principal 18' },
      { name: 'Sandra Vallejo', phone: '3014427711', address: 'Urbanización El Lago' },
      { name: 'Felipe Rendón', phone: '3189021100', address: 'Centro Histórico' },
      { name: 'Lina Garzón', phone: '3106623388', address: 'Calle 30 #16-89' },
    ],
    Troncal: [
      { name: 'Miguel Ospina', phone: '3201107733', address: 'Troncal Km 4' },
      { name: 'Verónica Ruiz', phone: '3174408899', address: 'Diagonal 11 #5-20' },
      { name: 'Orlando Peña', phone: '3002206611', address: 'Sector Portal' },
      { name: 'Kelly Contreras', phone: '3115509988', address: 'Conjunto Alameda' },
    ],
  };

  const customerByBusiness = new Map();
  for (const business of businesses) {
    const seeds = customerSeeds[business.name] || customerSeeds.Chelsea;
    for (const c of seeds) {
      await db.collection('customers').updateOne(
        { businessId: business._id, phone: c.phone, isActive: true },
        {
          $setOnInsert: {
            businessId: business._id,
            createdByUserId: ownerUser._id,
            name: c.name,
            phone: c.phone,
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

    const customers = await db.collection('customers').find({ businessId: business._id, isActive: true }).toArray();
    customerByBusiness.set(business.name, customers);
  }

  const manufacturersSeed = [
    { name: 'Fabian', lastName: 'Andrade', phone: '3198801122' },
    { name: 'Luisa', lastName: 'Mendoza', phone: '3207712233' },
  ];

  for (const person of manufacturersSeed) {
    await db.collection('employees').updateOne(
      { accountId, normalizedPhone: person.phone.replace(/\D/g, ''), isActive: true },
      {
        $setOnInsert: {
          accountId,
          businessIds: [],
          name: person.name,
          lastName: person.lastName,
          phone: person.phone,
          normalizedPhone: person.phone.replace(/\D/g, ''),
          role: 'MANUFACTURER',
          isSystemUser: false,
          createdByUserId: ownerUser._id,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }

  const manufacturers = await db.collection('employees').find({ accountId, role: 'MANUFACTURER', isActive: true }).toArray();
  const fab1 = manufacturers[0];
  const fab2 = manufacturers[1] || manufacturers[0];

  await db.collection('sales').deleteMany({
    businessId: { $in: businesses.map((m) => m._id) },
    observations: { $regex: '\\[seed-analytics-v1\\]' },
  });

  const templates = [
    // Chelsea (mejor hoy)
    { b: 'Chelsea', d: 0, h: 9, m: 20, amount: 1900000, type: 'IMMEDIATE', status: 'ENTREGADA', pr: 'NORMAL', pay: 'PAID', paid: 1900000, del: 0, emp: null, note: 'Entrega directa mostrador' },
    { b: 'Chelsea', d: 0, h: 11, m: 10, amount: 1250000, type: 'SPECIAL_ORDER', status: 'EN_PROCESO', pr: 'HIGH', pay: 'PARTIAL', paid: 500000, del: 1, emp: null, note: 'Cliente solicita ajuste de color' },
    { b: 'Chelsea', d: 1, h: 10, m: 0, amount: 920000, type: 'IMMEDIATE', status: 'ENTREGADA', pr: 'NORMAL', pay: 'PAID', paid: 920000, del: 0, emp: null, note: 'Venta cerrada y entregada' },
    { b: 'Chelsea', d: 2, h: 14, m: 40, amount: 680000, type: 'SPECIAL_ORDER', status: 'EN_REPARTO', pr: 'HIGH', pay: 'PARTIAL', paid: 300000, del: 0, emp: null, note: 'Pedido sale a ruta de reparto' },
    { b: 'Chelsea', d: 4, h: 16, m: 5, amount: 460000, type: 'IMMEDIATE', status: 'CANCELADA', pr: 'NORMAL', pay: 'PENDING', paid: 0, del: 0, emp: null, note: 'Cancelada por cambio de referencia' },
    { b: 'Chelsea', d: 6, h: 9, m: 45, amount: 1550000, type: 'MANUFACTURE', status: 'ENTREGADA', pr: 'HIGH', pay: 'PAID', paid: 1550000, del: -1, emp: 'fab1', note: 'Fabricación completada sin novedades' },

    // La tercera (mejor ayer que hoy)
    { b: 'La tercera', d: 0, h: 13, m: 15, amount: 430000, type: 'IMMEDIATE', status: 'PENDIENTE', pr: 'NORMAL', pay: 'PENDING', paid: 0, del: 0, emp: null, note: 'A espera de confirmación final' },
    { b: 'La tercera', d: 1, h: 9, m: 30, amount: 2100000, type: 'SPECIAL_ORDER', status: 'EN_PROCESO', pr: 'HIGH', pay: 'PARTIAL', paid: 900000, del: 2, emp: null, note: 'Aprobado anticipo y materiales' },
    { b: 'La tercera', d: 1, h: 15, m: 20, amount: 980000, type: 'IMMEDIATE', status: 'ENTREGADA', pr: 'NORMAL', pay: 'PAID', paid: 980000, del: 0, emp: null, note: 'Cliente recoge en tienda' },
    { b: 'La tercera', d: 3, h: 10, m: 45, amount: 760000, type: 'SPECIAL_ORDER', status: 'EN_REPARTO', pr: 'HIGH', pay: 'PARTIAL', paid: 400000, del: 0, emp: null, note: 'Despacho confirmado al mediodía' },
    { b: 'La tercera', d: 5, h: 11, m: 50, amount: 520000, type: 'IMMEDIATE', status: 'CANCELADA', pr: 'NORMAL', pay: 'PENDING', paid: 0, del: 0, emp: null, note: 'Cancelada por duplicidad de pedido' },
    { b: 'La tercera', d: 6, h: 14, m: 35, amount: 890000, type: 'MANUFACTURE', status: 'EN_FABRICACION', pr: 'URGENT', pay: 'PARTIAL', paid: 250000, del: -2, emp: 'fab2', note: 'Retraso por falta de vidrio', reason: 'Falta vidrio templado para ternegocior' },

    // Ela (cargada en fabricación y retrasos)
    { b: 'Ela', d: 0, h: 8, m: 40, amount: 1350000, type: 'MANUFACTURE', status: 'EN_FABRICACION', pr: 'URGENT', pay: 'PARTIAL', paid: 450000, del: -1, emp: 'fab1', note: 'Fabricación activa, prioritaria', reason: 'Atraso en suministro de perfilería' },
    { b: 'Ela', d: 0, h: 15, m: 5, amount: 780000, type: 'SPECIAL_ORDER', status: 'EN_PROCESO', pr: 'HIGH', pay: 'PENDING', paid: 0, del: 1, emp: null, note: 'Pendiente confirmar medidas finales' },
    { b: 'Ela', d: 1, h: 12, m: 25, amount: 1660000, type: 'MANUFACTURE', status: 'EN_FABRICACION', pr: 'URGENT', pay: 'PARTIAL', paid: 700000, del: -3, emp: 'fab1', note: 'Trabajo en soldadura fina', reason: 'Se retrasó por re-trabajo de marco' },
    { b: 'Ela', d: 2, h: 9, m: 10, amount: 540000, type: 'IMMEDIATE', status: 'ENTREGADA', pr: 'NORMAL', pay: 'PAID', paid: 540000, del: 0, emp: null, note: 'Entrega express realizada' },
    { b: 'Ela', d: 4, h: 16, m: 50, amount: 920000, type: 'MANUFACTURE', status: 'EN_REPARTO', pr: 'HIGH', pay: 'PARTIAL', paid: 500000, del: 0, emp: 'fab2', note: 'Listo para despacho en ruta' },
    { b: 'Ela', d: 6, h: 10, m: 15, amount: 1210000, type: 'MANUFACTURE', status: 'EN_FABRICACION', pr: 'URGENT', pay: 'PENDING', paid: 0, del: -4, emp: 'fab2', note: 'Pendiente cierre de accesorios', reason: 'Atraso por llegada parcial de herrajes' },

    // Troncal (mixto y carga media)
    { b: 'Troncal', d: 0, h: 10, m: 35, amount: 610000, type: 'IMMEDIATE', status: 'ENTREGADA', pr: 'NORMAL', pay: 'PAID', paid: 610000, del: 0, emp: null, note: 'Venta rápida mostrador' },
    { b: 'Troncal', d: 0, h: 17, m: 5, amount: 980000, type: 'MANUFACTURE', status: 'EN_FABRICACION', pr: 'HIGH', pay: 'PARTIAL', paid: 350000, del: 0, emp: 'fab2', note: 'En armado de estructura' },
    { b: 'Troncal', d: 1, h: 8, m: 55, amount: 730000, type: 'SPECIAL_ORDER', status: 'EN_PROCESO', pr: 'NORMAL', pay: 'PARTIAL', paid: 200000, del: 0, emp: null, note: 'Cliente solicitó cambio menor' },
    { b: 'Troncal', d: 3, h: 13, m: 40, amount: 450000, type: 'IMMEDIATE', status: 'ENTREGADA', pr: 'NORMAL', pay: 'PAID', paid: 450000, del: 0, emp: null, note: 'Factura y entrega cerrada' },
    { b: 'Troncal', d: 5, h: 9, m: 35, amount: 1120000, type: 'MANUFACTURE', status: 'EN_FABRICACION', pr: 'URGENT', pay: 'PARTIAL', paid: 480000, del: -2, emp: 'fab1', note: 'Se prioriza por fecha de compromiso', reason: 'Retraso por corte especial pendiente' },
    { b: 'Troncal', d: 6, h: 15, m: 10, amount: 840000, type: 'SPECIAL_ORDER', status: 'PENDIENTE', pr: 'HIGH', pay: 'PENDING', paid: 0, del: 1, emp: null, note: 'Pendiente confirmación de abono inicial' },
  ];

  const salesToInsert = [];
  const paymentMethods = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

  for (let i = 0; i < templates.length; i += 1) {
    const t = templates[i];
    const business = businessMap.get(t.b);
    if (!business) continue;

    const customers = customerByBusiness.get(t.b) || [];
    const customer = customers[i % customers.length] || null;
    const product = products[i % products.length];
    const saleDate = addMinutes(addDays(todayStart, -t.d), t.h * 60 + t.m);
    const deliveryDate = addDays(saleDate, t.del || 0);

    let paidAmountCop = t.paid;
    if (t.pay === 'PAID') paidAmountCop = t.amount;
    if (t.pay === 'PENDING') paidAmountCop = 0;

    const remainingAmountCop = Math.max(t.amount - paidAmountCop, 0);
    const closed = t.status === 'ENTREGADA' || t.status === 'CANCELADA';
    const delayedDays = !closed && deliveryDate < todayStart ? diffDays(deliveryDate, todayStart) : 0;
    const isDelayed = delayedDays > 0;
    const assigned = t.emp === 'fab1' ? fab1 : t.emp === 'fab2' ? fab2 : null;

    const events = buildEvents({
      baseDate: saleDate,
      status: t.status,
      saleType: t.type,
      amountCop: t.amount,
      paidAmountCop,
      remainingAmountCop,
      deliveryDate,
      createdBy: ownerUser._id.toString(),
      createdByName: ownerUser.name || 'Sistema',
      isDelayed,
      delayedDays,
      manualNote: `${t.note} ${SEED_TAG}`,
      reason: t.reason,
    });

    salesToInsert.push({
      businessId: business._id,
      amountCop: t.amount,
      date: saleDate,
      paymentMethod: paymentMethods[i % paymentMethods.length],
      description: `${t.note} ${SEED_TAG}`,
      status: t.status,
      saleType: t.type,
      deliveryType: t.type === 'MANUFACTURE' ? 'MANUFACTURE' : 'IMMEDIATE',
      deliveryDate,
      isDelayed,
      delayedDays,
      delayedAt: isDelayed ? addMinutes(saleDate, 310) : undefined,
      delayReason: isDelayed ? (t.reason || 'Entrega vencida y venta aun abierta') : undefined,
      priority: t.pr,
      paymentStatus: t.pay,
      productId: product ? product._id.toString() : undefined,
      responsibleEmployeeId: assigned ? assigned._id.toString() : undefined,
      paidAmountCop,
      remainingAmountCop,
      client: customer
        ? {
          id: customer._id.toString(),
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
        }
        : undefined,
      product: product
        ? {
          id: product._id.toString(),
          name: product.name,
          details: `${product.name} ${SEED_TAG}`,
          dimensions: i % 3 === 0 ? '120x180' : i % 3 === 1 ? '140x200' : '90x210',
        }
        : undefined,
      responsibleEmployee: assigned
        ? {
          id: assigned._id.toString(),
          name: assigned.name,
          lastName: assigned.lastName,
          phone: assigned.phone,
        }
        : undefined,
      observations: `${t.note}. ${SEED_TAG}`,
      events,
      createdByUserId: ownerUser._id,
      isActive: true,
      createdAt: addMinutes(saleDate, 4),
      updatedAt: addMinutes(saleDate, 380),
    });
  }

  if (salesToInsert.length) {
    await db.collection('sales').insertMany(salesToInsert);
  }

  const businessIds = businesses.map((m) => m._id);
  const thisWeekStart = addDays(todayStart, -6);
  const thisWeekSales = await db.collection('sales').countDocuments({
    businessId: { $in: businessIds },
    date: { $gte: thisWeekStart, $lte: addDays(todayStart, 1) },
    isActive: true,
  });

  const statusAgg = await db.collection('sales').aggregate([
    {
      $match: {
        businessId: { $in: businessIds },
        date: { $gte: thisWeekStart, $lte: addDays(todayStart, 1) },
        isActive: true,
      },
    },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray();

  const paymentAgg = await db.collection('sales').aggregate([
    {
      $match: {
        businessId: { $in: businessIds },
        date: { $gte: thisWeekStart, $lte: addDays(todayStart, 1) },
        isActive: true,
      },
    },
    { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray();

  const delayedCount = await db.collection('sales').countDocuments({
    businessId: { $in: businessIds },
    isActive: true,
    isDelayed: true,
    status: { $nin: ['ENTREGADA', 'CANCELADA'] },
  });

  const manufactureCount = await db.collection('sales').countDocuments({
    businessId: { $in: businessIds },
    isActive: true,
    saleType: 'MANUFACTURE',
  });

  const dueTodayCount = await db.collection('sales').countDocuments({
    businessId: { $in: businessIds },
    isActive: true,
    deliveryDate: { $gte: todayStart, $lt: addDays(todayStart, 1) },
  });

  console.log(
    JSON.stringify(
      {
        accountId: ACCOUNT_ID,
        businesses: businesses.map((m) => ({ id: m._id.toString(), name: m.name })),
        productsReused: products.length,
        manufacturers: manufacturers.map((m) => ({ id: m._id.toString(), name: `${m.name} ${m.lastName}` })),
        insertedSales: salesToInsert.length,
        thisWeekSales,
        delayedCount,
        manufactureCount,
        dueTodayCount,
        statusAgg,
        paymentAgg,
      },
      null,
      2,
    ),
  );

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
