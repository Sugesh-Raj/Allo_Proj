import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { releaseExpiredReservations } from "@/lib/expiry";

export async function GET(req: NextRequest) {
  try {
    // 1. Run lazy cleanup of expired holds first
    await releaseExpiredReservations();

    // 2. Fetch all products, warehouses, and inventories
    const products = await prisma.product.findMany({
      include: {
        inventories: true,
      },
    });

    const warehouses = await prisma.warehouse.findMany({
      include: {
        inventories: true,
      },
    });

    const reservations = await prisma.reservation.findMany({
      include: {
        product: true,
        warehouse: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const auditLogs = await prisma.inventoryAuditLog.findMany({
      include: {
        product: true,
        fromWarehouse: true,
        toWarehouse: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // Only fetch the last 20 events for the real-time activity feed
    });

    // 3. Compute KPI Metrics
    let totalPhysicalStock = 0;
    let totalReservedStock = 0;
    let totalInventoryValue = 0;

    products.forEach((prod) => {
      prod.inventories.forEach((inv) => {
        totalPhysicalStock += inv.total;
        totalReservedStock += inv.reserved;
        totalInventoryValue += inv.total * Number(prod.price);
      });
    });

    // Compute checkout success vs abandonment metrics
    const confirmedCount = reservations.filter((r) => r.status === "CONFIRMED").length;
    const shippedCount = reservations.filter((r) => r.status === "SHIPPED").length;
    const releasedCount = reservations.filter((r) => r.status === "RELEASED").length;
    const pendingCount = reservations.filter((r) => r.status === "PENDING").length;
    const totalReservationsCount = reservations.length;
    const successRate = totalReservationsCount > 0 
      ? Math.round(((confirmedCount + shippedCount) / (confirmedCount + shippedCount + releasedCount || 1)) * 100) 
      : 100;

    // 4. Format detailed stock levels grid
    const stockMatrix = products.map((prod) => {
      const warehouseStocks = warehouses.map((wh) => {
        const inv = prod.inventories.find((i) => i.warehouseId === wh.id);
        return {
          warehouseId: wh.id,
          warehouseName: wh.name,
          region: wh.region,
          total: inv ? inv.total : 0,
          reserved: inv ? inv.reserved : 0,
          available: inv ? Math.max(0, inv.total - inv.reserved) : 0,
        };
      });

      return {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        price: Number(prod.price),
        warehouseStocks,
      };
    });

    return NextResponse.json({
      kpis: {
        totalPhysicalStock,
        totalReservedStock,
        totalInventoryValue,
        successRate,
        counts: {
          totalReservations: totalReservationsCount,
          confirmed: confirmedCount,
          shipped: shippedCount,
          released: releasedCount,
          pending: pendingCount,
        },
      },
      warehouses: warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        location: w.location,
        region: w.region,
      })),
      reservations: reservations.map((r) => ({
        id: r.id,
        userEmail: r.user.email,
        userName: r.user.name,
        productName: r.product.name,
        productSku: r.product.sku,
        warehouseName: r.warehouse.name,
        region: r.warehouse.region,
        quantity: r.quantity,
        status: r.status,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
      })),
      stockMatrix,
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        productName: log.product.name,
        productSku: log.product.sku,
        fromWarehouseName: log.fromWarehouse?.name || null,
        toWarehouseName: log.toWarehouse?.name || null,
        quantity: log.quantity,
        type: log.type,
        notes: log.notes,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET Admin Metrics API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin metrics" },
      { status: 500 }
    );
  }
}
