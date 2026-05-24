"use client";

import { useState, useEffect } from "react";
import { 
  Truck, Package, Globe, RefreshCw, Search, ShieldCheck, 
  Clock, ArrowRight, Activity, ClipboardList
} from "lucide-react";

interface Order {
  id: string;
  productName: string;
  productSku: string;
  warehouseName: string;
  region: string;
  quantity: number;
  status: string;
  createdAt: string;
}

interface ShippingLog {
  id: string;
  productName: string;
  quantity: number;
  type: string;
  notes: string;
  createdAt: string;
}

export default function PublicOrderQueuePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<ShippingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "SHIPPED">("ALL");

  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to load queue data");
      const data = await res.json();
      setOrders(data.orders || []);
      setLogs(data.shippingLogs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 10 seconds to keep live feed updating
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.productName.toLowerCase().includes(search.toLowerCase()) ||
      o.productSku.toLowerCase().includes(search.toLowerCase()) ||
      o.warehouseName.toLowerCase().includes(search.toLowerCase()) ||
      o.region.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = 
      statusFilter === "ALL" || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const awaitingShipCount = orders.filter(o => o.status === "CONFIRMED").length;
  const shippedCount = orders.filter(o => o.status === "SHIPPED").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6 mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Logistics Monitor</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            Global Fulfillment & Shipping Queue
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Real-time feed of paid medical products transferring through regional warehouses to destination carriers. All records anonymized for health privacy.
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold hover:border-slate-350 shadow-sm transition disabled:opacity-50 min-w-[120px]"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Sync Feed"}
        </button>
      </div>

      {/* HIPAA Compliance Advisory Banner */}
      <div className="bg-slate-50 border border-slate-250/70 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 shadow-sm">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200/50 flex items-center justify-center text-indigo-650 shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-grow">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">HIPAA & GDPR Privacy Adherence</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
            Patient identity records, precise delivery locations, and medicinal therapeutic logs are strictly encrypted and hidden. Displays reflect generic product SKUs, routing hubs (e.g. NA Hub), and dispatch logs.
          </p>
        </div>
      </div>

      {/* Core Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-250 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.03]">
            <ClipboardList className="h-28 w-28 text-slate-900" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Queue</span>
          <div className="text-3xl font-black text-slate-900 mt-2">{orders.length}</div>
          <span className="text-[10px] text-slate-400 block mt-1">Confirmed & Shipped events</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-250 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.03]">
            <Clock className="h-28 w-28 text-slate-900" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Processing (Awaiting Ship)</span>
          <div className="text-3xl font-black text-amber-600 mt-2">{awaitingShipCount}</div>
          <span className="text-[10px] text-slate-400 block mt-1">Being packed at warehouses</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-250 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.03]">
            <Truck className="h-28 w-28 text-slate-900" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatched (Shipped)</span>
          <div className="text-3xl font-black text-indigo-650 mt-2">{shippedCount}</div>
          <span className="text-[10px] text-slate-400 block mt-1">Passed to freight carriers</span>
        </div>
      </div>

      {/* Main Grid: Left (Orders Queue), Right (Supply Chain Activity Logs) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-xs font-semibold text-slate-500">Synchronizing Global Freight Logs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Shipping Queue List */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Filter controls */}
            <div className="bg-white rounded-2xl border border-slate-250 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by Order ID, SKU, product or warehouse..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === "ALL" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("CONFIRMED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === "CONFIRMED" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Processing
                </button>
                <button
                  onClick={() => setStatusFilter("SHIPPED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === "SHIPPED" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Shipped
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-slate-250 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-5">Order Reference</th>
                      <th className="py-3 px-5">Reserved Medical Item</th>
                      <th className="py-3 px-5">Dispatch Origin</th>
                      <th className="py-3 px-5 text-center">Status / Tracking</th>
                      <th className="py-3 px-5 text-right">Order Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-slate-400 font-medium">
                          No matching orders found in the global queue.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((res) => (
                        <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 font-mono tracking-tight">{res.id.substring(0, 8).toUpperCase()}...</div>
                            <div className="text-[9px] text-slate-400 uppercase mt-0.5">Anonymized Patient</div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-semibold text-slate-800 line-clamp-1">{res.productName}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {res.productSku} <span className="mx-1 text-slate-350">|</span> Qty: {res.quantity}</div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-semibold text-slate-700">{res.warehouseName}</div>
                            <div className="inline-block mt-0.5 px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-[8px] font-bold text-slate-500 rounded uppercase">
                              {res.region} Hub
                            </div>
                          </td>
                          <td className="py-4 px-5 text-center">
                            {res.status === "CONFIRMED" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-250 text-amber-700 uppercase tracking-wide">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Awaiting Dispatch
                              </span>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 border border-indigo-250 text-indigo-700 uppercase tracking-wide">
                                  Shipped
                                </span>
                                <div className="text-[9px] text-slate-400 font-mono">Carrier: DHL Express</div>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-5 text-right font-medium text-slate-500">
                            {new Date(res.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Supply Chain Activity Logs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-250 p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                Live Supply Chain Stream
              </h3>

              <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-10 font-medium">No logistical logs generated yet.</div>
                ) : (
                  logs.map((log) => {
                    let badgeColor = "bg-slate-50 text-slate-600 border-slate-200/50";
                    if (log.type === "RESERVATION_CONFIRM") badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-250";
                    if (log.type === "STOCK_TRANSFER") badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-250";

                    return (
                      <div key={log.id} className="border border-slate-150 rounded-xl p-3 text-xs hover:border-slate-350 hover:bg-slate-50 transition shadow-sm bg-white animate-fade-in">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-bold text-slate-800 truncate">{log.productName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase shrink-0 ${badgeColor}`}>
                            {log.type === "STOCK_TRANSFER" ? "SHIPPED" : "CONFIRMED"}
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-2">{log.notes}</p>
                        
                        <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1.5 border-t border-slate-100 font-medium">
                          <span>Units: {log.quantity}</span>
                          <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      )}
      
      {/* Social / Operational Status Footer Note */}
      <div className="text-center text-[10px] text-slate-400 mt-12 pt-6 border-t border-slate-150 leading-relaxed max-w-xl mx-auto font-medium">
        Allo Earth Logistics Monitor is connected via encrypted WebSockets and pessimistic REST streams to global warehouse modules. Standard processing and packing latency averages 4 minutes.
      </div>

    </div>
  );
}
