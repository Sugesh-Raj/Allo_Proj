import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { releaseExpiredReservations } from "@/lib/expiry";
import CheckoutClient from "@/components/CheckoutClient";

interface CheckoutPageProps {
  params: {
    id: string;
  };
}

export const revalidate = 0; // Disable server rendering caching to fetch fresh details

async function getReservationData(id: string) {
  // 1. Run lazy expiration sweeps
  await releaseExpiredReservations();

  // 2. Query reservation
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  });

  return reservation;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const reservation = await getReservationData(params.id);

  if (!reservation) {
    notFound();
  }

  // Format to JSON-serializable structure to pass to client component
  const formattedReservation = {
    id: reservation.id,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    product: {
      name: reservation.product.name,
      sku: reservation.product.sku,
      price: Number(reservation.product.price),
      imageUrl: reservation.product.imageUrl,
    },
    warehouse: {
      name: reservation.warehouse.name,
      location: reservation.warehouse.location,
    },
  };

  return <CheckoutClient initialReservation={formattedReservation} />;
}
