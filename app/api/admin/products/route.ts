import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(3),
  price: z.number().positive(),
  description: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, sku, price, description, imageUrl } = parsed.data;

    // Check unique SKU
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return NextResponse.json(
        { error: "Product with this SKU already exists." },
        { status: 409 }
      );
    }

    // Process product creation and warehouse inventory initialization in transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          sku,
          price,
          description,
          imageUrl: imageUrl || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80",
        },
      });

      // Get all existing warehouses to initialize empty stock counts
      const warehouses = await tx.warehouse.findMany();
      
      for (const wh of warehouses) {
        await tx.inventory.create({
          data: {
            productId: product.id,
            warehouseId: wh.id,
            total: 0,
            reserved: 0,
          },
        });

        await tx.inventoryAuditLog.create({
          data: {
            productId: product.id,
            toWarehouseId: wh.id,
            quantity: 0,
            type: "STOCK_ADJUSTMENT",
            notes: `Initialized inventory slot for new SKU in ${wh.name}.`,
          },
        });
      }

      return product;
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error) {
    console.error("POST Admin Product CRUD Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
