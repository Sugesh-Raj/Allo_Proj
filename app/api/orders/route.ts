import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const orders = await prisma.reservation.findMany({
      where: {
        status: {
          in: ["CONFIRMED", "SHIPPED"],
        },
      },
      select: {
        id: true,
        productId: true,
        quantity: true,
        status: true,
        createdAt: true,
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            name: true,
            region: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // limit to last 50 orders
    });

    // Format audit logs for shipping updates
    const shippingLogs = await prisma.inventoryAuditLog.findMany({
      where: {
        type: {
          in: ["STOCK_TRANSFER", "RESERVATION_CONFIRM"],
        },
      },
      select: {
        id: true,
        quantity: true,
        type: true,
        notes: true,
        createdAt: true,
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        productName: o.product.name,
        productSku: o.product.sku,
        warehouseName: o.warehouse.name,
        region: o.warehouse.region,
        quantity: o.quantity,
        status: o.status,
        createdAt: o.createdAt,
      })),
      shippingLogs: shippingLogs.map((log) => ({
        id: log.id,
        productName: log.product.name,
        quantity: log.quantity,
        type: log.type,
        notes: log.notes,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET Public Orders Queue Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch global fulfillment queue." },
      { status: 500 }
    );
  }
}
