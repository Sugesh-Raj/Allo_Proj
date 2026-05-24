import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id;
    const body = await req.json();
    const { trackingNumber } = body;

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "Tracking number is required to ship the order." },
        { status: 400 }
      );
    }

    // Process order shipment inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find the order reservation
      const res = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          product: true,
          warehouse: true,
        },
      });

      if (!res) {
        throw new Error("ORDER_NOT_FOUND");
      }

      // Check if it is already shipped
      if (res.status === "SHIPPED") {
        return res;
      }

      // Verify that the order has been paid/confirmed first
      if (res.status !== "CONFIRMED") {
        throw new Error("ORDER_NOT_READY_FOR_SHIPPING");
      }

      // Update reservation status to SHIPPED
      const updatedRes = await tx.reservation.update({
        where: { id: res.id },
        data: { status: "SHIPPED" },
      });

      // Write Audit Log entry
      await tx.inventoryAuditLog.create({
        data: {
          productId: res.productId,
          fromWarehouseId: res.warehouseId,
          quantity: res.quantity,
          type: "STOCK_TRANSFER",
          notes: `Order shipped from ${res.warehouse.name}. Tracking ID: ${trackingNumber}. Carrier: DHL Express.`,
        },
      });

      return updatedRes;
    });

    return NextResponse.json({
      success: true,
      reservation: result,
    });
  } catch (error: any) {
    if (error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }
    if (error.message === "ORDER_NOT_READY_FOR_SHIPPING") {
      return NextResponse.json(
        { error: "Only paid (confirmed) orders can be shipped." },
        { status: 400 }
      );
    }

    console.error("POST Ship Order Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
