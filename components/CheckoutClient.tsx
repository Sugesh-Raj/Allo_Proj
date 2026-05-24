"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Clock, ShieldAlert, CheckCircle2, XCircle, ArrowLeft, RefreshCw, CreditCard } from "lucide-react";

interface Reservation {
  id: string;
  quantity: number;
  status: string;
  expiresAt: string;
  createdAt?: string;
  product: {
    name: string;
    sku: string;
    price: number;
    imageUrl: string | null;
  };
  warehouse: {
    name: string;
    location: string;
  };
}

interface CheckoutClientProps {
  initialReservation: Reservation;
}

export default function CheckoutClient({ initialReservation }: CheckoutClientProps) {
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation>(initialReservation);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Initialize and tick countdown
  useEffect(() => {
    if (reservation.status !== "PENDING") return;

    const calculateTimeLeft = () => {
      const difference = new Date(reservation.expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(difference / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const nextTime = calculateTimeLeft();
      setTimeLeft(nextTime);

      if (nextTime <= 0) {
        clearInterval(timer);
        setReservation((prev) => ({ ...prev, status: "RELEASED" }));
        setActionError("410 Gone: Your stock reservation has expired. The held units have been returned to the available inventory pool.");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [reservation.expiresAt, reservation.status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleConfirm = async () => {
    setActionError(null);
    setLoading(true);

    try {
      const idempotencyKey = crypto.randomUUID();

      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          // Explicitly handle and expose 410 Gone (expired)
          setReservation((prev) => ({ ...prev, status: "RELEASED" }));
          throw new Error("410 Gone: Reservation has expired. Payment failed to secure inventory.");
        }
        throw new Error(data.error || "Confirmation failed");
      }

      // Confirmed successfully!
      setReservation((prev) => ({ ...prev, status: "CONFIRMED" }));
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel reservation");
      }

      // Released successfully, redirect back to storefront catalog
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel hold.");
      setLoading(false);
    }
  };

  const isPending = reservation.status === "PENDING" && timeLeft > 0;

  // Calculate hold type duration to show corresponding badge
  let holdTypeBadge = null;
  if (isPending && reservation.createdAt) {
    const totalDurationSecs = Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - new Date(reservation.createdAt).getTime()) / 1000));
    const totalDurationMins = Math.round(totalDurationSecs / 60);

    if (totalDurationMins <= 4) {
      holdTypeBadge = (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-500" />
          <span>⚡ High Demand Pressure: 3-minute critical hold applied.</span>
        </div>
      );
    } else if (totalDurationMins <= 8) {
      holdTypeBadge = (
        <div className="bg-amber-50 border border-amber-250 text-amber-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 shrink-0 text-amber-500" />
          <span>⚠️ Moderate Demand: 7-minute stock hold applied.</span>
        </div>
      );
    } else {
      holdTypeBadge = (
        <div className="bg-indigo-50 border border-indigo-150 text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 shrink-0 text-indigo-500" />
          <span>✅ Standard Hold: 15-minute standard allocation applied.</span>
        </div>
      );
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to Catalog
      </button>

      {/* Main Reservation Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        {/* Reservation Status Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-250 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Secure Your Order</h1>
            <p className="text-xs text-slate-500 mt-1">
              Reservation Reference ID: <span className="font-mono text-indigo-600 font-semibold">{reservation.id}</span>
            </p>
          </div>

          {/* Status Badge */}
          <div>
            {reservation.status === "CONFIRMED" && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-250 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Purchase Confirmed
              </span>
            )}
            {reservation.status === "RELEASED" && (
              <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                <XCircle className="h-3.5 w-3.5" />
                Hold Released
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-250 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                <Clock className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "3s" }} />
                Pending Checkout
              </span>
            )}
          </div>
        </div>

        {/* State A: Reservation is Confirmed */}
        {reservation.status === "CONFIRMED" && (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Confirmed Successfully!</h2>
            <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
              Thank you for your purchase. Your payment succeeded and the inventory has been permanently allocated from the **{reservation.warehouse.name}**. Your health pack will ship shortly.
            </p>
            <button
              onClick={() => router.push("/")}
              className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              Back to Storefront
            </button>
          </div>
        )}

        {/* State B: Reservation is Released / Expired */}
        {reservation.status === "RELEASED" && (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-red-150 text-red-650 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Hold Expired or Cancelled</h2>
            <p className="text-sm text-slate-550 max-w-md leading-relaxed mb-6">
              The temporary reservation window has elapsed, or the hold was cancelled. The stock units have been released and returned to the global supply chain inventory.
            </p>
            <button
              onClick={() => router.push("/")}
              className="py-2 px-6 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              View Available Catalog
            </button>
          </div>
        )}

        {/* State C: Active Checkout */}
        {isPending && (
          <div className="p-6 space-y-6">
            {holdTypeBadge}
            {/* Live Visual Countdown Timer */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Your stock is reserved for
              </span>
              <div className="text-5xl font-black font-mono tracking-tight text-indigo-600 mb-2">
                {formatTime(timeLeft)}
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Complete your checkout before the countdown hits zero. If the timer expires, this stock hold will release automatically to ensure global availability.
              </p>
            </div>

            {/* Error notifications */}
            {actionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-semibold flex items-start gap-1.5 leading-relaxed">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Item Details */}
            <div className="flex gap-4 p-4 border border-slate-100 rounded-xl">
              <div className="relative h-20 w-20 bg-slate-50 rounded-lg overflow-hidden shrink-0">
                {reservation.product.imageUrl ? (
                  <Image
                    src={reservation.product.imageUrl}
                    alt={reservation.product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-xs bg-slate-100">
                    A
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-mono px-2 py-0.5 rounded uppercase font-semibold">
                  {reservation.product.sku}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{reservation.product.name}</h3>
                <div className="flex justify-between items-center text-xs mt-2 text-slate-600">
                  <span>Warehouse Hub:</span>
                  <span className="font-semibold text-slate-800">{reservation.warehouse.name}</span>
                </div>
              </div>
            </div>

            {/* Billing Summary */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Quantity Reserved:</span>
                <span className="font-semibold text-slate-800">{reservation.quantity} unit</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Unit Price:</span>
                <span className="font-semibold text-slate-800">${reservation.product.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200/50 font-bold text-slate-900 text-sm">
                <span>Total Cost:</span>
                <span>${(reservation.product.price * reservation.quantity).toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-3.5 w-3.5" />
                    Simulate Payment & Confirm
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="py-2.5 px-4 rounded-lg text-slate-600 hover:text-red-600 hover:bg-slate-50 border border-slate-350 hover:border-red-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel Hold
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
