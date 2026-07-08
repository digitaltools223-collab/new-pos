import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Receipt, 
  MapPin, 
  Phone, 
  BookOpen, 
  RefreshCw,
  ShoppingBag,
  ArrowLeftRight,
  Undo2
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { Customer, Sale, Exchange, ReturnRecord } from "../types";

interface CustomerStats extends Customer {
  totalSpent: number;
  billsCount: number;
  exchangesCount: number;
  returnsCount: number;
}

export default function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const custData = await apiFetch<Customer[]>("/api/customers");
      setCustomers(custData);

      // We will aggregate stats from sales, exchanges, and returns
      const salesData = await apiFetch<Sale[]>("/api/bills");
      setSales(salesData);

      const exchangeData = await apiFetch<Exchange[]>("/api/exchange");
      setExchanges(exchangeData);

      const returnData = await apiFetch<ReturnRecord[]>("/api/returns");
      setReturns(returnData);
    } catch (err: any) {
      setError(err.message || "Failed to load customer profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute full metrics for each customer
  const getCustomerMetrics = (c: Customer): CustomerStats => {
    const customerSales = sales.filter((s) => s.customerId === c.id);
    const billsCount = customerSales.length;
    const totalSpent = customerSales.reduce((acc, curr) => acc + curr.total, 0);

    // Filter exchanges against sales associated to this customer
    const exchangesCount = exchanges.filter((e) => e.customerName === c.name).length;
    const returnsCount = returns.filter((r) => r.customerName === c.name).length;

    return {
      ...c,
      totalSpent,
      billsCount,
      exchangesCount,
      returnsCount,
    };
  };

  const filteredCustomers = customers
    .map(getCustomerMetrics)
    .filter((c) => {
      const query = searchQuery.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query)
      );
    });

  const getCustomerSalesHistory = (customerId: string) => {
    return sales.filter((s) => s.customerId === customerId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Customer Relations Ledger
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Auto-saves customer info on billing; tracks full metrics on purchases, exchanges, and returns.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 flex items-center gap-1.5 text-xs font-mono transition cursor-pointer shadow-sm"
        >
          <RefreshCw size={14} className="text-blue-500" />
          Refresh Ledger
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Grid: Left Column Customer List | Right Column Purchase History Profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-14rem)]">
        {/* Customer Directory */}
        <div className="lg:col-span-5 flex flex-col h-full bg-white border border-slate-200 rounded-2xl p-4 overflow-hidden shadow-sm justify-between">
          <div className="flex flex-col flex-grow overflow-hidden">
            <div className="pb-3 border-b border-slate-100 mb-3 flex-shrink-0">
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Customer Name or Phone Number..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic text-xs">
                  No registered customers found.
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomer(cust)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all select-none ${
                        isSelected
                          ? "bg-blue-600 border-blue-500 text-white shadow-md"
                          : "bg-slate-50 border-slate-200/60 hover:bg-slate-100/50 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-sm truncate">{cust.name}</h4>
                          <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${isSelected ? "text-slate-100" : "text-slate-500"}`}>
                            <Phone size={11} />
                            <span className="font-mono">{cust.phone}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            isSelected 
                              ? "bg-white/10 border-white/20 text-white" 
                              : "bg-white border-slate-200 text-slate-500"
                          }`}>
                            {cust.billsCount} bills
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Selected Customer profile history details */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden justify-between">
          {!selectedCustomer ? (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-400 text-sm italic">
              <Users size={44} className="text-slate-200 mb-2" />
              Select a customer from directory to view metrics and history.
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden justify-between">
              {/* Profile Card Header */}
              <div className="border-b border-slate-100 pb-4 mb-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-display font-bold text-lg shadow-md">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-800">{selectedCustomer.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1 font-mono"><Phone size={12} className="text-slate-400" /> {selectedCustomer.phone}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {selectedCustomer.address || "N/A"}</span>
                    </p>
                  </div>
                </div>

                {/* KPI Sub Grid */}
                <div className="grid grid-cols-4 gap-3 mt-4 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Bills</span>
                    <span className="font-mono font-bold text-sm text-slate-800">{selectedCustomer.billsCount}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Paid</span>
                    <span className="font-mono font-bold text-sm text-emerald-600">Rs {selectedCustomer.totalSpent.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Exchanges</span>
                    <span className="font-mono font-bold text-sm text-blue-600">{selectedCustomer.exchangesCount}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Returns</span>
                    <span className="font-mono font-bold text-sm text-rose-600">{selectedCustomer.returnsCount}</span>
                  </div>
                </div>
              </div>

              {/* Sales history details list */}
              <div className="flex-grow overflow-y-auto pr-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Receipt size={14} className="text-blue-500" />
                  Bill Receipts History
                </h4>

                {getCustomerSalesHistory(selectedCustomer.id).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-xs">
                    No historic receipts found for this customer.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {getCustomerSalesHistory(selectedCustomer.id).map((sale) => (
                      <div
                        key={sale.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition flex justify-between items-center text-slate-700"
                      >
                        <div>
                          <p className="text-xs font-mono font-bold text-slate-800">{sale.billNumber}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Date: {new Date(sale.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-emerald-600">
                            Rs {sale.total.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {sale.paymentMethod}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
