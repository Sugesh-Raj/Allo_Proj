const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed script...");

  // 1. Clean existing data
  await prisma.idempotencyRecord.deleteMany();
  await prisma.inventoryAuditLog.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing database entries.");

  // 2. Create Users
  const userPasswordHash = await bcrypt.hash("user123", 10);
  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  const regularUser = await prisma.user.create({
    data: {
      email: "user@allo.earth",
      name: "Jane Doe",
      passwordHash: userPasswordHash,
      role: "USER",
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@allo.earth",
      name: "Nick Singh",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  console.log(`Created default users:
  - User: ${regularUser.email} (password: user123)
  - Admin: ${adminUser.email} (password: admin123)`);

  // 3. Create Warehouses
  const warehouses = [
    {
      name: "North America Logistics Hub",
      location: "New York, USA",
      region: "NA",
    },
    {
      name: "Europe Fulfillment Center",
      location: "Frankfurt, Germany",
      region: "EU",
    },
    {
      name: "APAC Distribution Hub",
      location: "Singapore",
      region: "APAC",
    },
  ];

  const createdWarehouses = [];
  for (const wh of warehouses) {
    const created = await prisma.warehouse.create({ data: wh });
    createdWarehouses.push(created);
    console.log(`Created Warehouse: ${created.name} (${created.region})`);
  }

  // 4. Create Medical Products
  const products = [
    {
      name: "Allo Daily Vitality Supplements",
      sku: "ALLO-VIT-001",
      price: 34.99,
      description: "Medical-grade formulation of essential daily nutrients, minerals, and adaptogens optimized for longevity, mental clarity, and metabolic health.",
      imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Allo At-Home Diagnostics Kit",
      sku: "ALLO-DIAG-002",
      price: 129.00,
      description: "Comprehensive dried blood spot and biomarker collection kit mapping 45 clinical health markers including hormones, metabolic speed, and lipid panels.",
      imageUrl: "https://images.unsplash.com/photo-1579154204601-01588f351166?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Allo Telehealth Wellness Pack",
      sku: "ALLO-TEL-003",
      price: 79.50,
      description: "Includes a medical consultation voucher, prescription-only wellness creams, and clinical guidance notes from board-certified medical practitioners.",
      imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Allo Sleep Restoration Patch",
      sku: "ALLO-SLP-004",
      price: 24.50,
      description: "Transdermal night patches delivering time-released melatonin, L-theanine, and magnesium to optimize deep sleep cycles and morning cognitive performance.",
      imageUrl: "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Allo Hydration Optimizer Powder",
      sku: "ALLO-HYD-005",
      price: 19.99,
      description: "Clinical-grade electrolyte and hydration optimization formula designed to speed up muscle recovery, cellular hydration, and fluid balance.",
      imageUrl: "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Allo Longevity NMN Booster",
      sku: "ALLO-NMN-006",
      price: 89.00,
      description: "Pure Nicotinamide Mononucleotide (NMN) capsules formulated with resveratrol to support cellular energy production, DNA repair, and anti-aging pathways.",
      imageUrl: "https://images.unsplash.com/photo-1626716493137-b67fe9501e76?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Allo Focus Nootropic Complex",
      sku: "ALLO-FOC-007",
      price: 45.00,
      description: "Fast-acting cognitive enhancement capsules blending Lion's Mane, Bacopa Monnieri, and natural caffeine to elevate focus, memory retention, and mental drive.",
      imageUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Allo Clinical Digital Thermometer",
      sku: "ALLO-THERM-008",
      price: 29.99,
      description: "Infrared non-contact medical-grade thermometer with high-precision microchips for instantaneous body temperature mapping.",
      imageUrl: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Allo Cardiovascular Pulse Oximeter",
      sku: "ALLO-OXIM-009",
      price: 39.00,
      description: "Fingertip blood oxygen saturation (SpO2) and heart rate monitor designed for quick clinical diagnostics and fitness assessment.",
      imageUrl: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Allo Probiotic Gut-Health Shield",
      sku: "ALLO-PRO-010",
      price: 42.50,
      description: "Broad-spectrum multi-strain daily probiotic containing 50 billion CFU to support digestive function, gut barrier strength, and immune system resilience.",
      imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&auto=format&fit=crop&q=80",
    },
  ];

  const createdProducts = [];
  for (const prod of products) {
    const created = await prisma.product.create({ data: prod });
    createdProducts.push(created);
    console.log(`Created Product: ${created.name}`);
  }

  // 5. Create Inventory Levels
  // We'll set different stock levels across global hubs to simulate supply chain discrepancies
  const inventoryConfigurations = [
    // Product 1 (Supplements)
    { productIdx: 0, warehouseIdx: 0, total: 150 }, // NA
    { productIdx: 0, warehouseIdx: 1, total: 80 },  // EU
    { productIdx: 0, warehouseIdx: 2, total: 200 }, // APAC

    // Product 2 (Diagnostics Kit)
    { productIdx: 1, warehouseIdx: 0, total: 35 },  // NA
    { productIdx: 1, warehouseIdx: 1, total: 15 },  // EU
    { productIdx: 1, warehouseIdx: 2, total: 40 },  // APAC

    // Product 3 (Telehealth Pack)
    { productIdx: 2, warehouseIdx: 0, total: 75 },  // NA
    { productIdx: 2, warehouseIdx: 1, total: 95 },  // EU
    { productIdx: 2, warehouseIdx: 2, total: 10 },  // APAC (Critical Stock!)

    // Product 4 (Sleep Patches)
    { productIdx: 3, warehouseIdx: 0, total: 120 }, // NA
    { productIdx: 3, warehouseIdx: 1, total: 60 },  // EU
    { productIdx: 3, warehouseIdx: 2, total: 90 },  // APAC

    // Product 5 (Hydration Optimizer)
    { productIdx: 4, warehouseIdx: 0, total: 300 }, // NA
    { productIdx: 4, warehouseIdx: 1, total: 200 }, // EU
    { productIdx: 4, warehouseIdx: 2, total: 150 }, // APAC

    // Product 6 (Longevity NMN)
    { productIdx: 5, warehouseIdx: 0, total: 45 },  // NA
    { productIdx: 5, warehouseIdx: 1, total: 25 },  // EU
    { productIdx: 5, warehouseIdx: 2, total: 5 },   // APAC (Critical stock)

    // Product 7 (Focus Nootropic)
    { productIdx: 6, warehouseIdx: 0, total: 85 },  // NA
    { productIdx: 6, warehouseIdx: 1, total: 100 }, // EU
    { productIdx: 6, warehouseIdx: 2, total: 70 },  // APAC

    // Product 8 (Clinical Thermometer)
    { productIdx: 7, warehouseIdx: 0, total: 60 },  // NA
    { productIdx: 7, warehouseIdx: 1, total: 40 },  // EU
    { productIdx: 7, warehouseIdx: 2, total: 50 },  // APAC

    // Product 9 (Pulse Oximeter)
    { productIdx: 8, warehouseIdx: 0, total: 30 },  // NA
    { productIdx: 8, warehouseIdx: 1, total: 20 },  // EU
    { productIdx: 8, warehouseIdx: 2, total: 15 },  // APAC

    // Product 10 (Probiotic)
    { productIdx: 9, warehouseIdx: 0, total: 140 }, // NA
    { productIdx: 9, warehouseIdx: 1, total: 90 },  // EU
    { productIdx: 9, warehouseIdx: 2, total: 110 }, // APAC
  ];

  for (const config of inventoryConfigurations) {
    const prod = createdProducts[config.productIdx];
    const wh = createdWarehouses[config.warehouseIdx];
    
    await prisma.inventory.create({
      data: {
        productId: prod.id,
        warehouseId: wh.id,
        total: config.total,
        reserved: 0,
      },
    });

    // Write initial seed audit logs
    await prisma.inventoryAuditLog.create({
      data: {
        productId: prod.id,
        toWarehouseId: wh.id,
        quantity: config.total,
        type: "STOCK_ADJUSTMENT",
        notes: `Initial warehouse seeding. Initial physical stock count set to ${config.total} units.`,
      },
    });

    console.log(`Seeded Stock: ${prod.name} at ${wh.name} = ${config.total} units`);
  }

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
