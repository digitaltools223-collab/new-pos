import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Undo2, 
  ArrowLeftRight, 
  Coins, 
  Receipt,
  Download,
  RefreshCw,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { ReportsResponse } from "../types";

export default function ReportsView() {
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<ReportsResponse>("/api/reports");
      setReports(data);
    } catch (err: any) {
      setError(err.message || "Failed to load store reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExportCSV = (reportType: string) => {
    if (!reports) return;

    let filename = `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`;
    let csvContent = "";

    if (reportType === "overview_metrics") {
      const s = reports.summary;
      const data = [
        { Metric: "Total Bills Count", Value: s.totalBills },
        { Metric: "Today's Bills Count", Value: s.todayBills },
        { Metric: "Cumulative Gross Sales", Value: `Rs ${s.grossSales}` },
        { Metric: "Today's Gross Sales", Value: `Rs ${s.todayGrossSales}` },
        { Metric: "Applied Discounts", Value: `Rs ${s.discount}` },
        { Metric: "Today's Discounts", Value: `Rs ${s.todayDiscount}` },
        { Metric: "Cumulative Net Sales", Value: `Rs ${s.netSales}` },
        { Metric: "Today's Net Sales", Value: `Rs ${s.todayNetSales}` },
        { Metric: "Cumulative Net Profit", Value: `Rs ${s.totalProfit}` },
        { Metric: "Today's Profit", Value: `Rs ${s.todayProfit}` },
        { Metric: "Low Stock Alert Count", Value: s.lowStockCount },
      ];
      
      const keys = Object.keys(data[0]);
      csvContent = keys.join(",") + "\n" + data.map((d: any) => keys.map((k) => `"${d[k]}"`).join(",")).join("\n");
    } else if (reportType === "product_performance") {
      csvContent = "Type,Product Name,Barcode,Qty Sold,Sale Price\n";
      reports.productPerformance.topSelling.forEach((item) => {
        csvContent += `Top Selling,"${item.name}","${item.barcode}",${item.qty},Rs ${item.salePrice}\n`;
      });
      reports.productPerformance.leastSelling.forEach((item) => {
        csvContent += `Least Selling,"${item.name}","${item.barcode}",${item.qty},Rs ${item.salePrice}\n`;
      });
    } else if (reportType === "returns_exchanges") {
      csvContent = "Metric,Value\n";
      csvContent += `Total Exchanges,${reports.exchangeAnalytics.totalExchanges}\n`;
      csvContent += `Exchange Collected (Pay),Rs ${reports.exchangeAnalytics.amountCollected}\n`;
      csvContent += `Exchange Refunded (Refund),Rs ${reports.exchangeAnalytics.amountRefunded}\n`;
      csvContent += `Total Returns,${reports.returnAnalytics.totalReturns}\n`;
      csvContent += `Refund Value Paid,Rs ${reports.returnAnalytics.refundValue}\n`;
      
      reports.returnAnalytics.reasonsBreakdown.forEach((r) => {
        csvContent += `Return Reason (${r.reason}),${r.count}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <span className="text-sm font-mono text-slate-500">Compiling financial charts...</span>
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

  const performance = reports?.productPerformance || { topSelling: [], leastSelling: [] };
  const exchangeStats = reports?.exchangeAnalytics || { totalExchanges: 0, amountCollected: 0, amountRefunded: 0 };
  const returnStats = reports?.returnAnalytics || { totalReturns: 0, refundValue: 0, reasonsBreakdown: [] };

  // Calculate highest count for bar percentages
  const maxSoldQty = Math.max(1, ...performance.topSelling.map((p) => p.qty));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="text-blue-500" />
            Shop Analytics & Financial Audits
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Audit cumulative earnings, margin profits, exchanges, returns and stock metrics.
          </p>
        </div>
        <button
          onClick={loadReports}
          className="p-2 bg-white hover:bg-slate-50 text-slate-750 rounded-lg border border-slate-200 flex items-center gap-1.5 text-xs font-mono transition cursor-pointer shadow-sm"
        >
          <RefreshCw size={14} className="text-blue-500" />
          Re-Calculate
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Grid: Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Sales Overview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
            <h3 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Receipt className="text-blue-500" size={16} />
              Revenue Statement
            </h3>
            <button
              onClick={() => handleExportCSV("overview_metrics")}
              title="Download CSV"
              className="p-1 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <Download size={13} />
            </button>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Today's Net Sales:</span>
              <span className="text-slate-900 font-bold">Rs {summary.todayNetSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Today's Discounts:</span>
              <span className="text-red-500">-Rs {summary.todayDiscount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
              <span>Cumulative Gross:</span>
              <span className="text-slate-600">Rs {summary.grossSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-900 font-bold pt-1 border-t border-slate-200">
              <span>CUMULATIVE NET:</span>
              <span className="text-blue-600">Rs {summary.netSales.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
            <h3 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Coins className="text-amber-500" size={16} />
              Profitability Margin
            </h3>
            <button
              onClick={() => handleExportCSV("overview_metrics")}
              title="Download CSV"
              className="p-1 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <Download size={13} />
            </button>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Today's Retail Profit:</span>
              <span className="text-amber-600 font-bold">Rs {summary.todayProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Cumulative Profit:</span>
              <span className="text-slate-800 font-semibold">Rs {summary.totalProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
              <span>Avg Retail Profit Margin:</span>
              <span className="text-slate-600 font-semibold">
                {summary.netSales > 0 ? `${Math.round((summary.totalProfit / summary.netSales) * 100)}%` : "0%"}
              </span>
            </div>
          </div>
        </div>

        {/* Returns & Exchanges Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
            <h3 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <ArrowLeftRight className="text-blue-500" size={16} />
              Return/Exchange Ratios
            </h3>
            <button
              onClick={() => handleExportCSV("returns_exchanges")}
              title="Download CSV"
              className="p-1 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <Download size={13} />
            </button>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Total Exchanges:</span>
              <span className="text-blue-600 font-bold">{exchangeStats.totalExchanges}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Exchange Bal Collected:</span>
              <span className="text-slate-700">Rs {exchangeStats.amountCollected.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500 border-t border-slate-100 pt-1">
              <span>Total Returns:</span>
              <span className="text-red-500 font-bold">{returnStats.totalReturns}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Total Refund Value:</span>
              <span className="text-red-500">-Rs {returnStats.refundValue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual performance charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products performance chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-display font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-blue-500" size={18} />
              Top Selling Garments
            </h2>
            <button
              onClick={() => handleExportCSV("product_performance")}
              className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded border border-slate-200 transition text-xs font-mono cursor-pointer flex items-center gap-1.5 px-2.5 shadow-sm"
            >
              <Download size={12} /> List
            </button>
          </div>

          {performance.topSelling.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm italic">
              <ShoppingBag size={32} className="text-slate-300 mb-2" />
              No sales logged yet to measure performance.
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {performance.topSelling.map((prod, idx) => {
                const percentage = Math.max(6, Math.min(100, Math.round((prod.qty / maxSoldQty) * 100)));
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate">{prod.name}</span>
                      <span className="font-mono text-blue-600 flex-shrink-0 ml-2">{prod.qty} units</span>
                    </div>
                    {/* Visual custom chart progress bar */}
                    <div className="h-3.5 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Return analytics & Reason breakdown panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-display font-bold text-slate-800 flex items-center gap-2">
              <Undo2 className="text-red-500" size={18} />
              Return Reasons Breakdown
            </h2>
            <button
              onClick={() => handleExportCSV("returns_exchanges")}
              className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded border border-slate-200 transition text-xs font-mono cursor-pointer flex items-center gap-1.5 px-2.5 shadow-sm"
            >
              <Download size={12} /> List
            </button>
          </div>

          {returnStats.reasonsBreakdown.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm italic">
              <Sparkles size={32} className="text-blue-500/10 mb-2" />
              No returns logged yet. Excellent!
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {returnStats.reasonsBreakdown.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition"
                >
                  <div className="text-xs font-semibold text-slate-700">{r.reason}</div>
                  <div className="text-right">
                    <span className="inline-block font-mono font-bold text-xs px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                      {r.count} returns
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
