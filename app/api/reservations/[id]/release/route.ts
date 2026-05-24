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

    // 2. Process release transaction
    const result = await prisma.$transaction(async (tx) => {
      const res = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!res) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      // If already released, return success (idempotent)
      if (res.status === "RELEASED") {
        return res;
      }

      // Cannot release a confirmed reservation
      if (res.status === "CONFIRMED") {
        throw new Error("CANNOT_RELEASE_CONFIRMED");
      }

      // 3. Decrement reserved hold count in Inventory
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: res.productId,
            warehouseId: res.warehouseId,
          },
        },
      });

      if (inventory) {
        const nextReserved = Math.max(0, inventory.reserved - res.quantity);
        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: res.productId,
              warehouseId: res.warehouseId,
            },
          },
          data: {
            reserved: nextReserved,
          },
        });
      }

      // 4. Update reservation status to RELEASED
      const releasedRes = await tx.reservation.update({
        where: { id: res.id },
        data: { status: "RELEASED" },
      });

      // 5. Write Audit Log
      await tx.inventoryAuditLog.create({
        data: {
          productId: res.productId,
          fromWarehouseId: res.warehouseId,
          quantity: res.quantity,
          type: "RESERVATION_RELEASE",
          notes: `Reservation early release by user / client cancellation.`,
        },
      });

      return releasedRes;
    });

    return NextResponse.json({
      success: true,
      reservation: result,
    });
  } catch (error: any) {
    if (error.message === "RESERVATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 }
      );
    }
    if (error.message === "CANNOT_RELEASE_CONFIRMED") {
      return NextResponse.json(
        { error: "Cannot release an already confirmed purchase." },
        { status: 400 }
      );
    }

    console.error("POST Release Reservation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
