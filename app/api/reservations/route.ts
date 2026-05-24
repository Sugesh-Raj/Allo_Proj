import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { releaseExpiredReservations } from "@/lib/expiry";
import { z } from "zod";

const createReservationSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate request body
    const body = await req.json();
    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // 3. Handle Idempotency Key (Optional Bonus)
    const idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey) {
      const existingRecord = await prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (existingRecord) {
        // Return original response
        return new NextResponse(existingRecord.responseBody, {
          status: existingRecord.responseStatus,
          headers: {
            "Content-Type": "application/json",
            "X-Cache-Lookup": "HIT - Idempotency",
          },
        });
      }
    }

    // 4. Run database transaction with pessimistic locking
    const result = await prisma.$transaction(async (tx) => {
      // Perform lazy cleanup of expired reservations inside this transaction first
      // to ensure available stock numbers are perfectly current.
      // Since it runs inside the same transaction, it shares the locking scope.
      const now = new Date();
      const expiredReservations = await tx.reservation.findMany({
        where: {
          status: "PENDING",
          expiresAt: { lt: now },
        },
      });

      for (const res of expiredReservations) {
        const inv = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId: res.productId,
              warehouseId: res.warehouseId,
            },
          },
        });
        if (inv) {
          await tx.inventory.update({
            where: {
              productId_warehouseId: {
                productId: res.productId,
                warehouseId: res.warehouseId,
              },
            },
            data: {
              reserved: Math.max(0, inv.reserved - res.quantity),
            },
          });
        }
        await tx.reservation.update({
          where: { id: res.id },
          data: { status: "RELEASED" },
        });
        await tx.inventoryAuditLog.create({
          data: {
            productId: res.productId,
            fromWarehouseId: res.warehouseId,
            quantity: res.quantity,
            type: "RESERVATION_RELEASE",
            notes: `Auto expiry release during new reservation request.`,
          },
        });
      }

      // 5. Select inventory row using FOR UPDATE (Pessimistic row-level locking)
      // This locks the matching inventory row until this transaction commits or rolls back,
      // guaranteeing absolute serializability and avoiding race conditions under concurrency.
      const inventoryRows = await tx.$queryRaw<any[]>`
        SELECT * FROM "Inventory" 
        WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId} 
        FOR UPDATE
      `;

      if (!inventoryRows || inventoryRows.length === 0) {
        throw new Error("INVENTORY_NOT_FOUND");
      }

      const inventory = inventoryRows[0];
      const available = inventory.total - inventory.reserved;

      // 6. Check stock availability
      if (available < quantity) {
        throw new Error("OUT_OF_STOCK");
      }

      // 7. Deduct/Reserve Stock
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
        data: {
          reserved: {
            increment: quantity,
          },
        },
      });

      // 8. Create Reservation with Adaptive Hold Timers (Dynamic Expiry)
      let expiryWindowMinutes = 15; // Standard hold for high stock
      if (available <= 5) {
        expiryWindowMinutes = 3;  // Critical stock pressure (3 mins)
      } else if (available <= 20) {
        expiryWindowMinutes = 7;  // Medium stock pressure (7 mins)
      }
      const expiresAt = new Date(Date.now() + expiryWindowMinutes * 60 * 1000);

      const reservation = await tx.reservation.create({
        data: {
          userId: user.id,
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt,
          idempotencyKey,
        },
      });

      // 9. Write audit log
      await tx.inventoryAuditLog.create({
        data: {
          productId,
          fromWarehouseId: warehouseId,
          quantity,
          type: "RESERVATION_HOLD",
          notes: `Created hold reservation ${reservation.id.substring(0, 8)}... for ${quantity} units. Stock held until ${expiresAt.toLocaleTimeString()}.`,
        },
      });

      return {
        id: reservation.id,
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
        quantity: reservation.quantity,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
      };
    });

    const successResponse = {
      success: true,
      reservation: result,
    };

    const responseStatus = 201;
    const responseBodyString = JSON.stringify(successResponse);

    // Save response to idempotency records if key was provided
    if (idempotencyKey) {
      await prisma.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          responseStatus,
          responseBody: responseBodyString,
        },
      });
    }

    return new NextResponse(responseBodyString, {
      status: responseStatus,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    if (error.message === "INVENTORY_NOT_FOUND") {
      return NextResponse.json(
        { error: "Product not stocked in selected warehouse." },
        { status: 404 }
      );
    }
    if (error.message === "OUT_OF_STOCK") {
      return NextResponse.json(
        { error: "Insufficient stock available in this warehouse." },
        { status: 409 } // 409 Conflict (standard response for take-home specifications)
      );
    }

    console.error("POST Reservation API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
