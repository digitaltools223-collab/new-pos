import React, { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  Download, 
  Eye, 
  ArrowLeftRight, 
  Undo2, 
  Receipt,
  RefreshCw,
  Calendar
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { Sale, Exchange, ReturnRecord } from "../types";

interface HistoryViewProps {
  onViewReceipt: (saleId: string) => void;
  onViewReturnReceipt: (returnData: any) => void;
  onViewExchangeReceipt: (exchangeData: any) => void;
}

export default function HistoryView({
  onViewReceipt,
  onViewReturnReceipt,
  onViewExchangeReceipt,
}: HistoryViewProps) {
  const [activeTab, setActiveTab] = useState<"sales" | "exchanges" | "returns">("sales");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD
  
  // States
  const [sales, setSales] = useState<Sale[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const salesData = await apiFetch<Sale[]>("/api/bills");
      setSales(salesData);

      const exchangeData = await apiFetch<Exchange[]>("/api/exchange");
      setExchanges(exchangeData);

      const returnData = await apiFetch<ReturnRecord[]>("/api/returns");
      setReturns(returnData);
    } catch (err: any) {
      setError(err.message || "Failed to sync transaction archives.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pure JavaScript CSV Exporter
  const handleExportCSV = () => {
    let rows: any[] = [];
    let filename = "";

    if (activeTab === "sales") {
      filename = `sales_report_${new Date().toISOString().slice(0, 10)}.csv`;
      rows = sales.map((s) => ({
        "Bill Number": s.billNumber,
        "Customer Name": s.customerName,
        "Customer Phone": s.customerPhone,
        "Subtotal": s.subtotal,
        "Discount": s.discount,
        "Grand Total": s.total,
        "Payment Method": s.paymentMethod,
        "Amount Received": s.amountReceived,
        "Change Return": s.changeAmount,
        "Date": new Date(s.createdAt).toLocaleDateString(),
        "Time": new Date(s.createdAt).toLocaleTimeString(),
      }));
    } else if (activeTab === "exchanges") {
      filename = `exchanges_report_${new Date().toISOString().slice(0, 10)}.csv`;
      rows = exchanges.map((e) => ({
        "Exchange ID": e.id,
        "Original Bill": e.originalBillNumber,
        "Customer": e.customerName,
        "Old Item Returned": e.oldItemName,
        "New Item Selected": e.newItemName,
        "Difference Amount": e.differenceAmount,
        "Settlement Type": e.type,
        "Date": new Date(e.createdAt).toLocaleDateString(),
      }));
    } else if (activeTab === "returns") {
      filename = `returns_report_${new Date().toISOString().slice(0, 10)}.csv`;
      rows = returns.map((r) => ({
        "Return ID": r.id,
        "Original Bill": r.originalBillNumber,
        "Customer": r.customerName,
        "Returned Item": r.productName,
        "Refund Paid": r.refundAmount,
        "Refund Reason": r.reason,
        "Refund Channel": r.refundMethod,
        "Date": new Date(r.createdAt).toLocaleDateString(),
      }));
    }

    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const csvContent =
      headers.join(",") +
      "\n" +
      rows
        .map((row) =>
          headers
            .map((h) => {
              let cell = row[h] === null || row[h] === undefined ? "" : row[h];
              cell = cell.toString().replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
              return cell;
            })
            .join(",")
        )
        .join("\n");

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

  // Filtration logic
  const getFilteredSales = () => {
    return sales.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        s.billNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.customerPhone.includes(q);
      const matchesDate = !dateFilter || s.createdAt.startsWith(dateFilter);
      return matchesSearch && matchesDate;
    });
  };

  const getFilteredExchanges = () => {
    return exchanges.filter((e) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        (e.originalBillNumber && e.originalBillNumber.toLowerCase().includes(q)) ||
        (e.customerName && e.customerName.toLowerCase().includes(q)) ||
        (e.oldItemName && e.oldItemName.toLowerCase().includes(q)) ||
        (e.newItemName && e.newItemName.toLowerCase().includes(q));
      const matchesDate = !dateFilter || e.createdAt.startsWith(dateFilter);
      return matchesSearch && matchesDate;
    });
  };

  const getFilteredReturns = () => {
    return returns.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        (r.originalBillNumber && r.originalBillNumber.toLowerCase().includes(q)) ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.productName && r.productName.toLowerCase().includes(q)) ||
        r.reason.toLowerCase().includes(q);
      const matchesDate = !dateFilter || r.createdAt.startsWith(dateFilter);
      return matchesSearch && matchesDate;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="text-blue-500" />
            Transaction Logs & Reprint
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Audit logs for all completed sales, smart exchanges, and tag returns.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 flex items-center gap-1.5 text-xs font-mono transition cursor-pointer shadow-sm"
        >
          <RefreshCw size={14} className="text-blue-500" />
          Refresh Registry
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Grid: Search bar filters & Export buttons */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        {/* Search Input */}
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab} by Bill, Customer, Phone or Item...`}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        {/* Date Filter Input */}
        <div className="relative flex-shrink-0 w-full sm:w-44">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Calendar size={13} />
          </span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono focus:outline-none"
          />
        </div>

        {/* CSV download button */}
        <button
          onClick={handleExportCSV}
          className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 transition cursor-pointer shadow-sm"
        >
          <Download size={13} className="text-emerald-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Segmented Tab Selectors */}
      <div className="bg-slate-100 p-1 border border-slate-200 rounded-xl max-w-md flex">
        <button
          onClick={() => { setActiveTab("sales"); setSearchQuery(""); }}
          className={`flex-grow py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === "sales"
              ? "bg-blue-600 text-white shadow"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Receipt size={14} />
          Sales Receipts ({sales.length})
        </button>
        <button
          onClick={() => { setActiveTab("exchanges"); setSearchQuery(""); }}
          className={`flex-grow py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === "exchanges"
              ? "bg-blue-600 text-white shadow"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ArrowLeftRight size={14} />
          Exchanges ({exchanges.length})
        </button>
        <button
          onClick={() => { setActiveTab("returns"); setSearchQuery(""); }}
          className={`flex-grow py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === "returns"
              ? "bg-blue-600 text-white shadow"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Undo2 size={14} />
          Returns ({returns.length})
        </button>
      </div>

      {/* Main Grid View */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div>
            {/* Sales Tab */}
            {activeTab === "sales" && (
              <div className="overflow-x-auto">
                {getFilteredSales().length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic text-sm">No sales records matched your criteria.</div>
                ) : (
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="text-xs uppercase font-mono tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Bill Number</th>
                        <th className="py-3 px-4">Customer Details</th>
                        <th className="py-3 px-4 text-right">Subtotal</th>
                        <th className="py-3 px-4 text-right">Discount</th>
                        <th className="py-3 px-4 text-right">Total Paid</th>
                        <th className="py-3 px-4 text-center">Date</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getFilteredSales().map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{sale.billNumber}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-700">{sale.customerName}</p>
                            {sale.customerPhone !== "0000000000" && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sale.customerPhone}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-500">Rs {sale.subtotal.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-red-500">-Rs {sale.discount.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600">Rs {sale.total.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-center text-xs font-mono text-slate-500">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => onViewReceipt(sale.id)}
                              className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-200 transition flex items-center gap-1 mx-auto font-mono shadow-sm"
                            >
                              <Eye size={12} className="text-blue-500" />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Exchanges Tab */}
            {activeTab === "exchanges" && (
              <div className="overflow-x-auto">
                {getFilteredExchanges().length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic text-sm">No exchanges matches found.</div>
                ) : (
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="text-xs uppercase font-mono tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Bill #</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Old Returned Item</th>
                        <th className="py-3 px-4">New Selected Item</th>
                        <th className="py-3 px-4 text-right">Adjustment</th>
                        <th className="py-3 px-4 text-center">Settlement</th>
                        <th className="py-3 px-4 text-center">Date</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getFilteredExchanges().map((ex) => (
                        <tr key={ex.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{ex.originalBillNumber}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">{ex.customerName}</td>
                          <td className="py-3.5 px-4 text-xs text-red-600 font-medium max-w-[130px] truncate">{ex.oldItemName}</td>
                          <td className="py-3.5 px-4 text-xs text-emerald-600 font-medium max-w-[130px] truncate">{ex.newItemName}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">Rs {Math.abs(ex.differenceAmount)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                              ex.type === "PAY"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : ex.type === "REFUND"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}>
                              {ex.type === "PAY" ? "Cust Paid" : ex.type === "REFUND" ? "Refunded" : "Even Swap"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs font-mono text-slate-500">
                            {new Date(ex.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => onViewExchangeReceipt(ex)}
                              className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-200 transition flex items-center gap-1 mx-auto font-mono shadow-sm"
                            >
                              <Eye size={12} className="text-blue-500" />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Returns Tab */}
            {activeTab === "returns" && (
              <div className="overflow-x-auto">
                {getFilteredReturns().length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic text-sm">No return records found.</div>
                ) : (
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="text-xs uppercase font-mono tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Bill #</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Returned Product</th>
                        <th className="py-3 px-4 text-right">Refund Amount</th>
                        <th className="py-3 px-4 text-center">Reason</th>
                        <th className="py-3 px-4 text-center">Refund Method</th>
                        <th className="py-3 px-4 text-center">Date</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getFilteredReturns().map((ret) => (
                        <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{ret.originalBillNumber}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">{ret.customerName}</td>
                          <td className="py-3.5 px-4 text-xs font-medium max-w-[130px] truncate text-slate-600">{ret.productName}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-red-500">Rs {ret.refundAmount.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-center text-xs text-slate-500">{ret.reason}</td>
                          <td className="py-3.5 px-4 text-center text-xs font-mono font-medium text-slate-600">{ret.refundMethod}</td>
                          <td className="py-3.5 px-4 text-center text-xs font-mono text-slate-500">
                            {new Date(ret.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => onViewReturnReceipt(ret)}
                              className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-200 transition flex items-center gap-1 mx-auto font-mono shadow-sm"
                            >
                              <Eye size={12} className="text-blue-500" />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
