import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const adjustSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  total: z.number().int().nonnegative(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = adjustSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, total } = parsed.data;

    // Process adjustment inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find current stock
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
      });

      if (!inventory) {
        throw new Error("INVENTORY_NOT_FOUND");
      }

      // Check if new physical stock is less than currently active reservations
      // This is a business validation: you cannot reduce physical stock below what is currently held!
      if (total < inventory.reserved) {
        throw new Error("STOCK_BELOW_RESERVED");
      }

      const prevTotal = inventory.total;
      const difference = total - prevTotal;

      // Update total
      const updated = await tx.inventory.update({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
        data: {
          total,
        },
      });

      // Write Audit Log
      await tx.inventoryAuditLog.create({
        data: {
          productId,
          toWarehouseId: warehouseId,
          quantity: Math.abs(difference),
          type: "STOCK_ADJUSTMENT",
          notes: `Stock count adjusted from ${prevTotal} to ${total} units. Net change of ${difference >= 0 ? "+" : ""}${difference} units.`,
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, inventory: result });
  } catch (error: any) {
    if (error.message === "INVENTORY_NOT_FOUND") {
      return NextResponse.json(
        { error: "Inventory slot not initialized." },
        { status: 404 }
      );
    }
    if (error.message === "STOCK_BELOW_RESERVED") {
      return NextResponse.json(
        { error: "Cannot reduce physical stock below the count of active reservations/holds." },
        { status: 400 }
      );
    }

    console.error("POST Inventory Adjust Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
