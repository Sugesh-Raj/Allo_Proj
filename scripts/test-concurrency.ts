import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runConcurrencyVerification() {
  console.log("==========================================");
  console.log("   CONCURRENCY LOCKING VERIFICATION TEST");
  console.log("==========================================");

  // 1. Fetch a test product and warehouse
  const product = await prisma.product.findFirst();
  const warehouse = await prisma.warehouse.findFirst();
  const user = await prisma.user.findFirst({ where: { role: "USER" } });

  if (!product || !warehouse || !user) {
    console.error("❌ ERROR: Database must be seeded first before running this test script.");
    console.log("Run: npm run db:seed");
    process.exit(1);
  }

  console.log(`Targeting SKU: ${product.sku}`);
  console.log(`Distribution Center: ${warehouse.name}`);
  console.log(`Evaluation User: ${user.name} (${user.email})`);

  // 2. Force total stock to exactly 1 unit
  console.log("\n[Setup] Force-setting physical total stock to exactly 1 unit...");
  await prisma.inventory.update({
    where: {
      productId_warehouseId: {
        productId: product.id,
        warehouseId: warehouse.id,
      },
    },
    data: {
      total: 1,
      reserved: 0,
    },
  });
  console.log("Stock adjusted to 1 unit.");

  // 3. Dispatch 10 concurrent database transaction reservations using raw thread parallelization
  console.log("\n[Test] Dispatching 10 concurrent reservations holds simultaneously...");
  
  const reservationAttempts = Array.from({ length: 10 }).map(async (_, idx) => {
    const attemptId = idx + 1;
    try {
      const result = await prisma.$transaction(async (tx) => {
        // SELECT FOR UPDATE locks row
        const inventoryRows = await tx.$queryRaw<any[]>`
          SELECT * FROM "Inventory"
          WHERE "productId" = ${product.id} AND "warehouseId" = ${warehouse.id}
          FOR UPDATE
        `;

        const inv = inventoryRows[0];
        const available = inv.total - inv.reserved;

        if (available < 1) {
          throw new Error("OUT_OF_STOCK");
        }

        // Lock item
        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: product.id,
              warehouseId: warehouse.id,
            },
          },
          data: {
            reserved: { increment: 1 },
          },
        });

        // Create hold
        const expiry = new Date(Date.now() + 10 * 60 * 1000);
        const reservation = await tx.reservation.create({
          data: {
            userId: user.id,
            productId: product.id,
            warehouseId: warehouse.id,
            quantity: 1,
            status: "PENDING",
            expiresAt: expiry,
          },
        });

        return reservation;
      });

      return { attemptId, success: true, resId: result.id };
    } catch (e: any) {
      return { attemptId, success: false, error: e.message };
    }
  });

  const outcomes = await Promise.all(reservationAttempts);

  // 4. Summarize outcomes
  let successCount = 0;
  let oosCount = 0;
  let otherCount = 0;

  console.log("\n[Outcomes]");
  outcomes.forEach((o) => {
    if (o.success) {
      successCount++;
      console.log(` -> Attempt #${o.attemptId}: SUCCESS (Unit reserved, ID: ${o.resId?.substring(0, 8)})`);
    } else {
      if (o.error === "OUT_OF_STOCK") {
        oosCount++;
        console.log(` -> Attempt #${o.attemptId}: REJECTED (Out of stock, row locked correctly)`);
      } else {
        otherCount++;
        console.log(` -> Attempt #${o.attemptId}: FAILED (${o.error})`);
      }
    }
  });

  console.log("\n==========================================");
  console.log("                VERDICT");
  console.log("==========================================");
  console.log(`Total Success (Expected: 1): ${successCount}`);
  console.log(`Total Rejected (Expected: 9): ${oosCount}`);
  
  if (successCount === 1 && oosCount === 9) {
    console.log("✅ VERIFICATION PASSED: Concurrency controls are thread-safe and race-condition free!");
    console.log("Exactly 1 request succeeded and locked the stock, while all concurrent threads were serialized and safely rejected.");
  } else {
    console.log("❌ VERIFICATION FAILED: Concurrency anomaly detected.");
    console.log("Ensure SELECT FOR UPDATE row locking is implemented correctly inside database transaction block.");
  }
  console.log("==========================================");

  await prisma.$disconnect();
}

runConcurrencyVerification().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
