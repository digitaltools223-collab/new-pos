import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Receipt, 
  AlertOctagon, 
  Coins, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  ShoppingBag
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { ReportsResponse, Sale, Product } from "../types";

interface DashboardViewProps {
  onViewReceipt: (saleId: string) => void;
  onNavigateToView: (viewName: string) => void;
}

export default function DashboardView({ onViewReceipt, onNavigateToView }: DashboardViewProps) {
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch stats from consolidated reports API
      const repData = await apiFetch<ReportsResponse>("/api/reports");
      setReports(repData);

      // Fetch all bills to list recent transactions
      const bills = await apiFetch<Sale[]>("/api/bills");
      setRecentSales(bills.slice(0, 10)); // Top 10

      // Fetch products to find low stock
      const prods = await apiFetch<Product[]>("/api/products");
      setLowStockItems(prods.filter((p) => p.stock <= 3));
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <span className="text-sm font-mono text-slate-500">Syncing with store database...</span>
        </div>
      </div>
    );
  }

  const summary = reports?.summary || {
    totalBills: 0,
    todayBills: 0,
    grossSales: 0,
    todayGrossSales: 0,
    discount: 0,
    todayDiscount: 0,
    netSales: 0,
    todayNetSales: 0,
    lowStockCount: 0,
    totalProfit: 0,
    todayProfit: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Store Performance Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time sales, inventory alerts, and transaction overview.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 flex items-center gap-1.5 text-xs font-mono transition cursor-pointer shadow-sm"
        >
          <RefreshCw size={14} className="text-blue-500" />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800">
          {error}
        </div>
      )}

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-8 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Today's Sales
            </span>
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg border border-blue-100">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-blue-600">
              Rs {summary.todayNetSales.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Gross: Rs {summary.todayGrossSales.toLocaleString()} | Disc: Rs {summary.todayDiscount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* KPI 2: Today's Bills */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-8 bg-slate-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Today's Bills
            </span>
            <div className="bg-slate-50 text-slate-600 p-2 rounded-lg border border-slate-200">
              <Receipt size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800">
              {summary.todayBills}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Average: Rs {(summary.todayBills > 0 ? Math.round(summary.todayNetSales / summary.todayBills) : 0).toLocaleString()} / bill
            </p>
          </div>
        </div>

        {/* KPI 3: Today's Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-8 bg-emerald-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Today's Profit
            </span>
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg border border-emerald-100">
              <Coins size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-600">
              Rs {summary.todayProfit.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Net Margin: {summary.todayNetSales > 0 ? Math.round((summary.todayProfit / summary.todayNetSales) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* KPI 4: Low Stock Alerts */}
        <div className={`p-5 rounded-xl border shadow-sm relative overflow-hidden group transition-colors ${summary.lowStockCount > 0 ? "bg-white border-l-4 border-l-red-500 border-slate-200" : "bg-white border-slate-200"}`}>
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-8 bg-rose-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider mb-1 ${summary.lowStockCount > 0 ? "text-red-600" : "text-slate-500"}`}>
              Low Stock Alert
            </span>
            <div className={`p-2 rounded-lg ${summary.lowStockCount > 0 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-50 text-slate-500 border border-slate-200"}`}>
              <AlertOctagon size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`text-2xl font-black text-slate-800`}>
              {summary.lowStockCount} Items
            </h3>
            <p className="text-[10px] text-red-500 font-bold underline cursor-pointer hover:text-red-600 uppercase tracking-tighter" onClick={() => onNavigateToView("inventory")}>
              View Alerts
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Transactions & Low Stock Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="p-5 flex-grow">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Receipt className="text-blue-500" size={18} />
                Recent Transactions
              </h2>
              <button
                onClick={() => onNavigateToView("history")}
                className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
              >
                See All History
              </button>
            </div>

            {recentSales.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm italic">
                <ShoppingBag size={32} className="text-slate-200 mb-2" />
                No transactions recorded today yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Bill #</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Method</th>
                      <th className="px-4 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{sale.billNumber}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800">{sale.customerName}</span>
                          {sale.customerPhone !== "0000000000" && (
                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{sale.customerPhone}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          Rs {sale.total.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase tracking-tighter ${
                            sale.paymentMethod === "Cash" 
                              ? "bg-green-100 text-green-700" 
                              : sale.paymentMethod === "Card" 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-orange-100 text-orange-700"
                          }`}>
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 text-right">
                          {new Date(sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock alerts panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <AlertOctagon className="text-red-500" size={18} />
                Low Stock Alerts
              </h2>
              <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2.5 py-0.5 rounded border border-red-100">
                Critical
              </span>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm italic">
                <Sparkles size={32} className="text-emerald-500/30 mb-2" />
                All product stocks are healthy!
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                {lowStockItems.map((prod) => (
                  <div
                    key={prod.id}
                    className={`flex items-center justify-between p-2.5 rounded border ${
                      prod.stock === 0 
                        ? "bg-red-50 border-red-100 text-slate-800" 
                        : "bg-orange-50 border-orange-100 text-slate-800"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[160px]">{prod.name}</p>
                      <p className={`text-[10px] font-mono mt-0.5 ${prod.stock === 0 ? "text-red-600" : "text-orange-600"}`}>
                        {prod.stock === 0 ? "Out of stock" : `Only ${prod.stock} left`}
                      </p>
                    </div>
                    <button 
                      onClick={() => onNavigateToView("inventory")}
                      className={`px-2 py-1 bg-white border text-[10px] font-bold rounded cursor-pointer transition hover:bg-slate-50 ${
                        prod.stock === 0 
                          ? "border-red-200 text-red-700" 
                          : "border-orange-200 text-orange-700"
                      }`}
                    >
                      RESTOCK
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {lowStockItems.length > 0 && (
            <button
              onClick={() => onNavigateToView("inventory")}
              className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-bold mt-4 transition cursor-pointer"
            >
              Adjust Stocks in Inventory
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
