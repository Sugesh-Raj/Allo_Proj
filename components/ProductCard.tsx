"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AlertCircle, ShoppingCart, RefreshCw, CheckCircle2 } from "lucide-react";

interface WarehouseStock {
  warehouseId: string;
  name: string;
  location: string;
  region: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  imageUrl: string | null;
  description: string | null;
  warehouses: WarehouseStock[];
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    product.warehouses[0]?.warehouseId || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWarehouse = product.warehouses.find(
    (w) => w.warehouseId === selectedWarehouseId
  );

  const handleReserve = async () => {
    if (!selectedWarehouseId) {
      setError("Please select a distribution center.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Generate a unique idempotency key for this reservation attempt
      const idempotencyKey = crypto.randomUUID();

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouseId,
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Correctly handle and expose 409 Conflict error to user
        if (res.status === 409) {
          throw new Error(
            `409 Conflict: Insufficient stock available at ${
              selectedWarehouse?.name || "selected warehouse"
            }. Another shopper may have just completed checkout.`
          );
        }
        throw new Error(data.error || "Failed to create reservation");
      }

      // Success - redirect to checkout holding screen
      router.push(`/checkout/${data.reservation.id}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-350 transition-all flex flex-col overflow-hidden h-full">
      {/* Product Image */}
      <div className="relative h-48 w-full bg-slate-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50 font-medium">
            No Image Available
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-0.5 rounded text-[10px] font-bold text-slate-800 border border-slate-200 uppercase tracking-wider">
          {product.sku}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-grow flex flex-col">
        <h3 className="font-bold text-slate-900 text-base mb-1.5 leading-snug">
          {product.name}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
          {product.description || "Medical-grade clinical formulation."}
        </p>

        <div className="mt-auto pt-4 border-t border-slate-100 flex items-baseline justify-between mb-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</span>
          <span className="text-xl font-bold text-slate-900">${product.price.toFixed(2)}</span>
        </div>

        {/* Warehouse Selection & Stock Status */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Select Distribution Hub
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => {
                setSelectedWarehouseId(e.target.value);
                setError(null);
              }}
              disabled={loading}
              className="block w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              {product.warehouses.map((wh) => (
                <option key={wh.warehouseId} value={wh.warehouseId}>
                  {wh.name} ({wh.region})
                </option>
              ))}
            </select>
          </div>

          {/* Local Stock Summary */}
          {selectedWarehouse && (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-slate-600">
                <span>Location:</span>
                <span className="font-semibold text-slate-800">{selectedWarehouse.location}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Physical Stock:</span>
                <span className="font-semibold text-slate-800">{selectedWarehouse.totalStock} units</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Active holds:</span>
                <span className="font-semibold text-amber-600">{selectedWarehouse.reservedStock} held</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                <span className="font-medium text-slate-700">Available:</span>
                <span
                  className={`font-bold ${
                    selectedWarehouse.availableStock > 0 ? "text-emerald-600" : "text-red-500 font-bold"
                  }`}
                >
                  {selectedWarehouse.availableStock > 0
                    ? `${selectedWarehouse.availableStock} available`
                    : "Out of Stock"}
                </span>
              </div>
            </div>
          )}

          {/* Regional Shipping Notice */}
          {selectedWarehouse && (
            <div className="text-[10px] text-slate-400 font-semibold px-1 mt-1 flex items-center gap-1">
              <span>🚚</span>
              <span>
                {selectedWarehouse.region === "APAC" && "Local Asia-Pacific Shipping: 1-2 days | Int'l: 5-7 days"}
                {selectedWarehouse.region === "NA" && "Local Americas Shipping: 1-2 days | Int'l: 5-7 days"}
                {selectedWarehouse.region === "EU" && "Local European Shipping: 1-2 days | Int'l: 5-7 days"}
              </span>
            </div>
          )}
        </div>

        {/* Errors & Alerts */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs font-semibold flex items-start gap-1.5 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Reserve Button */}
        <button
          onClick={handleReserve}
          disabled={loading || !selectedWarehouse || selectedWarehouse.availableStock <= 0}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Securing Reservation...
            </>
          ) : selectedWarehouse && selectedWarehouse.availableStock > 0 ? (
            <>
              <ShoppingCart className="h-3.5 w-3.5" />
              Reserve Item (Adaptive Hold)
            </>
          ) : (
            "Unavailable in this Hub"
          )}
        </button>
      </div>
    </div>
  );
}
