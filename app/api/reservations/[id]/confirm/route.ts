import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id;

    // 1. Authenticate user
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Handle Idempotency Key (Optional Bonus)
    const idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey) {
      const existingRecord = await prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (existingRecord) {
        return new NextResponse(existingRecord.responseBody, {
          status: existingRecord.responseStatus,
          headers: {
            "Content-Type": "application/json",
            "X-Cache-Lookup": "HIT - Idempotency",
          },
        });
      }
    }

    // 3. Process confirmation transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find the reservation
      const res = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!res) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      // If already confirmed, return success immediately (idempotence)
      if (res.status === "CONFIRMED") {
        return res;
      }

      // If released or expired, return 410 Gone
      const isExpired = new Date() > res.expiresAt;
      if (res.status === "RELEASED" || isExpired) {
        // If expired but still marked PENDING in DB, release it first
        if (res.status === "PENDING" && isExpired) {
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
              notes: `Lazy-released during attempt to confirm expired reservation.`,
            },
          });
        }
        throw new Error("RESERVATION_EXPIRED");
      }

      // 4. Update Inventory: Decrement total physical stock and reserved hold count
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: res.productId,
            warehouseId: res.warehouseId,
          },
        },
      });

      if (!inventory) {
        throw new Error("INVENTORY_CORRUPT");
      }

      const nextTotal = Math.max(0, inventory.total - res.quantity);
      const nextReserved = Math.max(0, inventory.reserved - res.quantity);

      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: res.productId,
            warehouseId: res.warehouseId,
          },
        },
        data: {
          total: nextTotal,
          reserved: nextReserved,
        },
      });

      // 5. Update reservation status to CONFIRMED
      const confirmedRes = await tx.reservation.update({
        where: { id: res.id },
        data: { status: "CONFIRMED" },
      });

      // 6. Write Audit Log
      await tx.inventoryAuditLog.create({
        data: {
          productId: res.productId,
          fromWarehouseId: res.warehouseId,
          quantity: res.quantity,
          type: "RESERVATION_CONFIRM",
          notes: `Reservation confirmed (Payment Succeeded). Physical stock decremented by ${res.quantity} units.`,
        },
      });

      return confirmedRes;
    });

    const successResponse = {
      success: true,
      reservation: result,
    };

    const responseStatus = 200;
    const responseBodyString = JSON.stringify(successResponse);

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
    if (error.message === "RESERVATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 }
      );
    }
    if (error.message === "RESERVATION_EXPIRED") {
      return NextResponse.json(
        { error: "Reservation hold expired. Stock has been returned to pool." },
        { status: 410 } // 410 Gone (as specified in take-home instructions)
      );
    }
    if (error.message === "INVENTORY_CORRUPT") {
      return NextResponse.json(
        { error: "Internal Inventory Inconsistency." },
        { status: 500 }
      );
    }

    console.error("POST Confirm Reservation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
