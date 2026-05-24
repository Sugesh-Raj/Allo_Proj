import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const transferSchema = z.object({
  productId: z.string().uuid(),
  fromWarehouseId: z.string().uuid(),
  toWarehouseId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = transferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { productId, fromWarehouseId, toWarehouseId, quantity } = parsed.data;

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { error: "Source and destination warehouses must be different." },
        { status: 400 }
      );
    }

    // Process inter-warehouse stock transfer inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch source inventory
      const sourceInv = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId: fromWarehouseId },
        },
      });

      if (!sourceInv) {
        throw new Error("SOURCE_INVENTORY_NOT_FOUND");
      }

      // Check available stock at source (total - reserved)
      const sourceAvailable = sourceInv.total - sourceInv.reserved;
      if (sourceAvailable < quantity) {
        throw new Error("INSUFFICIENT_SOURCE_STOCK");
      }

      // 2. Fetch or create destination inventory slot
      let destInv = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId: toWarehouseId },
        },
      });

      if (!destInv) {
        // If not initialized, initialize it
        destInv = await tx.inventory.create({
          data: {
            productId,
            warehouseId: toWarehouseId,
            total: 0,
            reserved: 0,
          },
        });
      }

      // 3. Perform transfer: decrement source, increment destination
      const updatedSource = await tx.inventory.update({
        where: {
          productId_warehouseId: { productId, warehouseId: fromWarehouseId },
        },
        data: {
          total: { decrement: quantity },
        },
      });

      const updatedDest = await tx.inventory.update({
        where: {
          productId_warehouseId: { productId, warehouseId: toWarehouseId },
        },
        data: {
          total: { increment: quantity },
        },
      });

      // 4. Log to Audit System
      const audit = await tx.inventoryAuditLog.create({
        data: {
          productId,
          fromWarehouseId,
          toWarehouseId,
          quantity,
          type: "STOCK_TRANSFER",
          notes: `Transferred ${quantity} units across global supply chain.`,
        },
      });

      return { source: updatedSource, destination: updatedDest, audit };
    });

    return NextResponse.json({ success: true, transfer: result });
  } catch (error: any) {
    if (error.message === "SOURCE_INVENTORY_NOT_FOUND") {
      return NextResponse.json(
        { error: "Source warehouse does not stock this product." },
        { status: 404 }
      );
    }
    if (error.message === "INSUFFICIENT_SOURCE_STOCK") {
      return NextResponse.json(
        { error: "Insufficient available stock (excluding reserved holds) at the source location to perform this transfer." },
        { status: 400 }
      );
    }

    console.error("POST Inventory Transfer Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
