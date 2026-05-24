import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { releaseExpiredReservations } from "@/lib/expiry";

export async function GET() {
  try {
    // 1. Run lazy cleanup of expired reservations before displaying stock
    await releaseExpiredReservations();

    // 2. Fetch all products with their global warehouses & stocks
    const products = await prisma.product.findMany({
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format products response for consumption on catalog page
    const formattedProducts = products.map((prod) => {
      const warehouses = prod.inventories.map((inv) => ({
        warehouseId: inv.warehouseId,
        name: inv.warehouse.name,
        location: inv.warehouse.location,
        region: inv.warehouse.region,
        totalStock: inv.total,
        reservedStock: inv.reserved,
        availableStock: Math.max(0, inv.total - inv.reserved),
      }));

      return {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        price: Number(prod.price),
        imageUrl: prod.imageUrl,
        description: prod.description,
        warehouses,
      };
    });

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("GET Products API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
