import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(3),
  price: z.number().positive(),
  description: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, sku, price, description, imageUrl } = parsed.data;

    // Check unique SKU except current product
    const existing = await prisma.product.findFirst({
      where: {
        sku,
        id: { not: productId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Another product with this SKU already exists." },
        { status: 409 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        sku,
        price,
        description,
        imageUrl: imageUrl || undefined,
      },
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error("PUT Admin Product CRUD Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    // Delete product. Foreign key cascades will handle inventories, reservations, and audit logs
    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true, message: "Product deleted successfully." });
  } catch (error) {
    console.error("DELETE Admin Product CRUD Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
