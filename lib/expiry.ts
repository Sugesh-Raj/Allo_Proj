import { prisma } from "./db";

/**
 * Sweeps the database for expired pending reservations, marks them as RELEASED,
 * decrements their reserved stocks, and logs transaction audits.
 * Returns the count of released reservations.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  // Find all expired pending reservations
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lt: now,
      },
    },
  });

  if (expiredReservations.length === 0) {
    return 0;
  }

  // Process each cleanup in a transaction
  await prisma.$transaction(async (tx) => {
    for (const res of expiredReservations) {
      // Double check inventory row exists before updating (defensive programming)
      const inv = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: res.productId,
            warehouseId: res.warehouseId,
          },
        },
      });

      if (inv) {
        // Calculate new reserved amount ensuring it doesn't drop below 0
        const newReserved = Math.max(0, inv.reserved - res.quantity);
        
        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: res.productId,
              warehouseId: res.warehouseId,
            },
          },
          data: {
            reserved: newReserved,
          },
        });
      }

      // Update reservation status to RELEASED
      await tx.reservation.update({
        where: { id: res.id },
        data: { status: "RELEASED" },
      });

      // Write an audit log entry for this automatic stock return
      await tx.inventoryAuditLog.create({
        data: {
          productId: res.productId,
          fromWarehouseId: res.warehouseId,
          quantity: res.quantity,
          type: "RESERVATION_RELEASE",
          notes: `System Expiry sweep: reservation ${res.id.substring(0, 8)}... held for ${res.quantity} units expired and was automatically released.`,
        },
      });
    }
  });

  return expiredReservations.length;
}
