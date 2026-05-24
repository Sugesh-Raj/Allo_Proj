"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Truck, Clock, AlertTriangle, CheckCircle, RefreshCw, Activity, ShieldAlert
} from "lucide-react";

interface Warehouse {
  id: string;
  name: string;
  location: string;
  region: string;
}

interface Reservation {
  id: string;
  userEmail: string;
  userName: string;
  productName: string;
  productSku: string;
  warehouseName: string;
  region: string;
  quantity: number;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  productName: string;
  productSku: string;
  fromWarehouseName: string | null;
  toWarehouseName: string | null;
  quantity: number;
  type: string;
  notes: string;
  createdAt: string;
}

interface Metrics {
  kpis: {
    totalPhysicalStock: number;
    totalReservedStock: number;
    totalInventoryValue: number;
    successRate: number;
    counts: {
      totalReservations: number;
      confirmed: number;
      shipped: number;
      released: number;
      pending: number;
    };
  };
  warehouses: Warehouse[];
  reservations: Reservation[];
  auditLogs: AuditLog[];
}

export default function AdminFulfillmentClient() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<"SHIP_ORDER" | null>(null);

  // Ship Modal States
  const [shipOrderId, setShipOrderId] = useState("");
  const [shipTrackingNumber, setShipTrackingNumber] = useState("");

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) throw new Error("Failed to load metrics");
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleShipOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipOrderId || !shipTrackingNumber) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/orders/${shipOrderId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: shipTrackingNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to ship order");

      setModalType(null);
      setShipOrderId("");
      setShipTrackingNumber("");
      alert("Order successfully marked as Shipped! Tracking generated and inventory updated.");
      fetchMetrics();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <RefreshCw className="h-10 w-10 text-indigo-650 animate-spin mb-4" />
        <span className="text-slate-500 font-medium text-sm">Loading fulfillment systems...</span>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-white border border-red-200 rounded-xl text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Fulfillment System Connection Error</h2>
        <p className="text-slate-600 text-sm mb-6">{error || "No data returned."}</p>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-indigo-750 transition"
        >
          Re-connect System
        </button>
      </div>
    );
  }

  // Filter orders for confirmed or shipped
  const fulfillmentOrders = metrics.reservations.filter(
    (r) => r.status === "CONFIRMED" || r.status === "SHIPPED"
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-5 mb-6 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Oracle NetSuite UI Platform</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2 mt-0.5">
            Global Shipping & Fulfillment Control
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-status-pulse"></span>
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMetrics}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-650 hover:bg-slate-50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Queue
          </button>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-transparent rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-750 shadow-sm transition"
          >
            Dashboard Overview
          </button>
        </div>
      </div>

      {/* KPI Tiles specific to Logistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-250 p-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Awaiting Ship</span>
            <div className="text-xl font-bold text-slate-800">{metrics.kpis.counts.confirmed}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-250 p-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logistics Dispatched</span>
            <div className="text-xl font-bold text-slate-800">{metrics.kpis.counts.shipped}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-250 p-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-650 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Abandoned Holds</span>
            <div className="text-xl font-bold text-slate-800">{metrics.kpis.counts.released}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-250 p-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logistics Success</span>
            <div className="text-xl font-bold text-slate-800">{metrics.kpis.successRate}%</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Shipping Queue Table (9 cols), Shipping Audit Feed (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Fulfillment Queue Table (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          <div className="bg-white rounded-xl border border-slate-250 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Fulfillment & Global Shipping Queue
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-indigo-50 border border-indigo-250 text-indigo-700 font-bold uppercase tracking-wider">
                {fulfillmentOrders.length} Orders Total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-4">Order ID / Customer</th>
                    <th className="py-2.5 px-4">Purchased Item</th>
                    <th className="py-2.5 px-4">Ship From Hub</th>
                    <th className="py-2.5 px-4 text-center">Status / Tracking</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fulfillmentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                        No orders in the shipping queue.
                      </td>
                    </tr>
                  ) : (
                    fulfillmentOrders.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 font-mono">{res.id.substring(0, 8)}...</div>
                          <div className="text-[10px] text-slate-400">{res.userEmail}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{res.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Qty: {res.quantity} unit</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700">{res.warehouseName}</span>
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[8px] bg-slate-100 border border-slate-200 text-slate-600 font-bold uppercase tracking-wider">{res.region}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {res.status === "CONFIRMED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-teal-50 border border-teal-200 text-teal-700 font-bold uppercase">
                              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                              Awaiting Ship
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold uppercase">
                                Shipped
                              </span>
                              <div className="text-[9px] text-slate-400 font-mono">DHL-TRANSIT</div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {res.status === "CONFIRMED" ? (
                            <button
                              onClick={() => {
                                setShipOrderId(res.id);
                                setShipTrackingNumber(`DHL-${Math.floor(10000000 + Math.random() * 90000000)}`);
                                setModalType("SHIP_ORDER");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 text-indigo-700 text-[10px] font-bold transition cursor-pointer"
                            >
                              Pack & Ship
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Global Audit Feed sidebar (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl border border-slate-250 shadow-sm p-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2.5 mb-3 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
              Global Audit Feed
            </h3>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {metrics.auditLogs.filter(l => l.type === "STOCK_TRANSFER" || l.type === "RESERVATION_CONFIRM").length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8">No logistical events.</div>
              ) : (
                metrics.auditLogs
                  .filter(l => l.type === "STOCK_TRANSFER" || l.type === "RESERVATION_CONFIRM")
                  .map((log) => {
                    let badgeColor = "bg-slate-100 text-slate-600 border-slate-200/50";
                    if (log.type === "RESERVATION_CONFIRM") badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-250";
                    if (log.type === "STOCK_TRANSFER") badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-250";

                    return (
                      <div key={log.id} className="border border-slate-100 rounded-lg p-2.5 text-xs hover:border-slate-350 hover:bg-slate-50 transition">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="font-semibold text-slate-800 line-clamp-1">{log.productName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase shrink-0 ${badgeColor}`}>
                            {log.type.replace("RESERVATION_", "")}
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 leading-relaxed mb-1">{log.notes}</p>
                        
                        <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 border-t border-slate-200/25">
                          <span>Net qty: {log.quantity} unit</span>
                          <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Ship Order Modal */}
      {modalType === "SHIP_ORDER" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 relative">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">
              Pack & Ship Order
            </h3>

            {actionError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-750 p-2.5 rounded-lg text-xs font-semibold">
                {actionError}
              </div>
            )}

            <form onSubmit={handleShipOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Order Hold ID</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={shipOrderId}
                  className="block w-full text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Carrier Tracking Number</label>
                <input
                  type="text"
                  required
                  value={shipTrackingNumber}
                  onChange={(e) => setShipTrackingNumber(e.target.value)}
                  className="block w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. DHL-83749210"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="py-1.5 px-4 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow disabled:opacity-50"
                >
                  {actionLoading ? "Processing Shipment..." : "Generate Label & Ship"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
