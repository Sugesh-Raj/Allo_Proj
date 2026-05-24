import { prisma } from "@/lib/db";
import { releaseExpiredReservations } from "@/lib/expiry";
import ProductCard from "@/components/ProductCard";
import { Globe2, Activity, Layers, RotateCcw } from "lucide-react";

export const revalidate = 0; // Disable server rendering caching to fetch fresh stock numbers on every visit

async function getProductsData() {
  // 1. Trigger lazy expiry sweeps before rendering catalogs
  await releaseExpiredReservations();

  // 2. Fetch products and stock
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

  return products.map((prod) => ({
    id: prod.id,
    name: prod.name,
    sku: prod.sku,
    price: Number(prod.price),
    imageUrl: prod.imageUrl,
    description: prod.description,
    warehouses: prod.inventories.map((inv) => ({
      warehouseId: inv.warehouseId,
      name: inv.warehouse.name,
      location: inv.warehouse.location,
      region: inv.warehouse.region,
      totalStock: inv.total,
      reservedStock: inv.reserved,
      availableStock: Math.max(0, inv.total - inv.reserved),
    })),
  }));
}

export default async function StorefrontPage() {
  const products = await getProductsData();

  // Calculate high-level stats for visual enrichment
  const totalWarehouses = 3; 
  let totalAvailableUnits = 0;
  products.forEach(p => {
    p.warehouses.forEach(w => {
      totalAvailableUnits += w.availableStock;
    });
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Visual Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-10 text-white mb-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <Globe2 className="h-96 w-96 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1 bg-indigo-500/25 border border-indigo-500/35 px-3 py-1 rounded-full text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-4">
            <Activity className="h-3 w-3 animate-pulse" />
            Active Inventory Guard
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Allo Earth Pharmacy Logistics
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Real-time global allocation and checkout lock confirmation. Select a nearby regional fulfillment center to reserve medical supplies with a 10-minute price and stock hold guarantee.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Logistics Regions
            </div>
            <div className="text-lg font-bold text-slate-800">
              NA, EU, APAC Hubs
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Stock Available
            </div>
            <div className="text-lg font-bold text-slate-800">
              {totalAvailableUnits} Clinical Units
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Stock Protection
            </div>
            <div className="text-lg font-bold text-slate-800">
              100% Race Condition Free
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span>Medical Inventory Offerings</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 border border-indigo-200/50 text-indigo-700">
            {products.length} Items Available
          </span>
        </h2>

        {products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-12 text-center text-slate-500">
            No medical products have been seeded in the database. Please visit the admin dashboard to seed data.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
