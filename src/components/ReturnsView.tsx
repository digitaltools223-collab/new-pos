import React, { useState, useEffect } from "react";
import { 
  Undo2, 
  Search, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw,
  RefreshCcw
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { Sale, SaleItem, Product, Settings } from "../types";

interface ReturnsViewProps {
  onReturnCompleted: (returnData: any) => void;
}

export default function ReturnsView({ onReturnCompleted }: ReturnsViewProps) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);

  // Loaded bills directory
  const [foundSales, setFoundSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);

  // Selected item to return
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Return details form
  const [tagAttached, setTagAttached] = useState<boolean | null>(null); // YES/NO toggle
  const [reason, setReason] = useState<
    "Size Issue" | "Color Issue" | "Defective" | "Wrong Product" | "Other"
  >("Size Issue");
  const [refundMethod, setRefundMethod] = useState<"Cash" | "Bank" | "EasyPaisa" | "JazzCash">("Cash");

  // UX states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSettings = async () => {
    try {
      const data = await apiFetch<Settings>("/api/settings");
      setSettings(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSearchBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFoundSales([]);
    setSelectedSale(null);
    setSaleItems([]);
    setSelectedItem(null);
    setTagAttached(null);
    setStep(1);

    if (!searchQuery.trim()) {
      setError("Please enter a Bill Number or Phone.");
      return;
    }

    setLoading(true);
    try {
      const salesList = await apiFetch<any[]>("/api/bills");
      const matched = salesList.filter((s) => {
        const query = searchQuery.trim().toLowerCase();
        return (
          s.billNumber.toLowerCase().includes(query) ||
          s.customerPhone.includes(query)
        );
      });

      if (matched.length === 0) {
        setError("No matching sale bill receipts found.");
      } else {
        setFoundSales(matched);
      }
    } catch (err: any) {
      setError(err.message || "Failed to query receipt directory.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSale = async (sale: Sale) => {
    setLoading(true);
    setError("");
    try {
      setSelectedSale(sale);
      const data = await apiFetch<any>(`/api/bills/${sale.id}`);
      setSaleItems(data.items);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to load bill items.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: any) => {
    setError("");

    // Verification
    if (item.isReturned) {
      setError("This product has already been Returned.");
      return;
    }
    if (item.isExchanged) {
      setError("This item has already been Exchanged. It cannot be returned.");
      return;
    }

    // Days validation
    const limitDays = settings?.returnDays || 3;
    const daysPassed = Math.floor(
      (Date.now() - new Date(selectedSale!.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysPassed > limitDays) {
      setError(`Return limit has expired. Bill was generated ${daysPassed} days ago (limit: ${limitDays} days).`);
      return;
    }

    setSelectedItem(item);
    setStep(3);
  };

  const handleSaveReturn = async () => {
    setError("");
    if (!selectedItem) return;

    if (tagAttached !== true) {
      setError("Cannot continue return processing if the brand tag is not attached.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        saleItemId: selectedItem.id,
        reason,
        refundMethod,
        tagAttached: true,
      };

      await apiFetch("/api/returns", {
        method: "POST",
        body: payload,
      });

      setSuccess("Return transaction processed successfully!");

      onReturnCompleted({
        originalBillNumber: selectedSale!.billNumber,
        customerName: selectedSale!.customerName,
        customerPhone: selectedSale!.customerPhone,
        itemName: `${selectedItem.name} (${selectedItem.size}/${selectedItem.color})`,
        refundAmount: selectedItem.price * selectedItem.qty,
        reason,
        refundMethod,
      });

      // Delay reset to allow receipt modal to capture state
      setTimeout(resetWizard, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to process return.");
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSearchQuery("");
    setFoundSales([]);
    setSelectedSale(null);
    setSaleItems([]);
    setSelectedItem(null);
    setTagAttached(null);
    setReason("Size Issue");
    setRefundMethod("Cash");
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Undo2 className="text-blue-500" />
            Product Returns Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Process client refunds and restock returns. (Return limit: {settings?.returnDays || 3} Days)
          </p>
        </div>
        {step > 1 && (
          <button
            onClick={resetWizard}
            className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition border border-slate-200 shadow-sm"
          >
            <RefreshCcw size={14} className="text-blue-500" />
            Reset Return Wizard
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800 flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Stepper Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-500 shadow-sm">
        <span className={`${step === 1 ? "text-blue-600 font-bold" : "text-slate-400"}`}>1. Search Receipt</span>
        <ArrowRight size={12} className="text-slate-300" />
        <span className={`${step === 2 ? "text-blue-600 font-bold" : "text-slate-400"}`}>2. Select Bill Item</span>
        <ArrowRight size={12} className="text-slate-300" />
        <span className={`${step === 3 ? "text-blue-600 font-bold" : "text-slate-400"}`}>3. Return & Refund details</span>
      </div>

      {/* STEP 1: Search Original Bill Receipt */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <form onSubmit={handleSearchBill} className="max-w-xl mx-auto space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
              Enter Original Receipt Metadata
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Bill Number (e.g. SLG-20260707-0001) or Phone..."
                className="flex-grow pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                Search
              </button>
            </div>
          </form>

          {/* Found results */}
          {foundSales.length > 0 && (
            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Matching Receipts Directory ({foundSales.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {foundSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => handleSelectSale(sale)}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-500 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <p className="font-mono text-sm font-bold text-slate-800">{sale.billNumber}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Customer: <b className="text-slate-700 font-medium">{sale.customerName}</b>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Date: {new Date(sale.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-600 block">
                        Rs {sale.total.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 block mt-1">
                        {sale.itemsCount} items
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Show Bill items and choose which to return */}
      {step === 2 && selectedSale && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-display font-semibold text-slate-800 text-base">Select Item to Return</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Receipt: <span className="font-mono text-slate-800 font-bold">{selectedSale.billNumber}</span> ({selectedSale.customerName})
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs uppercase font-mono tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="py-2.5 px-4">Product Details</th>
                  <th className="py-2.5 px-4 text-center">Qty Purchased</th>
                  <th className="py-2.5 px-4 text-right">Sold Rate</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {saleItems.map((item) => {
                  const eligible = !item.isReturned && !item.isExchanged;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Size: {item.size} | Color: {item.color} | Barcode: {item.barcode}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{item.qty}</td>
                      <td className="py-3 px-4 text-right font-mono">Rs {item.price}</td>
                      <td className="py-3 px-4 text-center">
                        {item.isReturned ? (
                          <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 font-bold uppercase">
                            Returned
                          </span>
                        ) : item.isExchanged ? (
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold uppercase">
                            Exchanged
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold uppercase">
                            Eligible
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleSelectItem(item)}
                          disabled={!eligible}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white border border-transparent transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
                        >
                          <Undo2 size={12} />
                          Return Item
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 3: Return details form & brand tag YES/NO check */}
      {step === 3 && selectedItem && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-display font-semibold text-slate-800 text-base">Process Refund & Return Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">Please fill details below for stock recovery.</p>
          </div>

          <div className="space-y-4">
            {/* Returned summary panel */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block mb-1">Returning Item</span>
              <h4 className="text-sm font-semibold text-slate-800">{selectedItem.name}</h4>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Size: {selectedItem.size} | Color: {selectedItem.color} | Purchased Qty: {selectedItem.qty}</p>
              <div className="flex justify-between items-center border-t border-slate-200 mt-3 pt-2.5 font-mono">
                <span className="text-xs text-slate-500">Total Refund Value:</span>
                <span className="text-base font-bold text-red-600">Rs {selectedItem.price * selectedItem.qty}</span>
              </div>
            </div>

            {/* MANDATORY: Brand Tag Attached (Toggle YES/NO) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Is Brand Tag Still Attached to the Product? *
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTagAttached(true)}
                  className={`w-1/2 py-2.5 rounded-xl border font-bold text-center text-sm transition cursor-pointer ${
                    tagAttached === true
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"
                  }`}
                >
                  YES, attached
                </button>
                <button
                  type="button"
                  onClick={() => setTagAttached(false)}
                  className={`w-1/2 py-2.5 rounded-xl border font-bold text-center text-sm transition cursor-pointer ${
                    tagAttached === false
                      ? "bg-red-50 border-red-200 text-red-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"
                  }`}
                >
                  NO, detached
                </button>
              </div>
              {tagAttached === false && (
                <p className="text-xs text-red-600 font-medium font-mono leading-tight mt-1.5">
                  ⚠ Returns are strictly forbidden without Brand Tag attached. Cannot process.
                </p>
              )}
            </div>

            {/* Reason dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Reason for Return
              </label>
              <select
                value={reason}
                onChange={(e: any) => setReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              >
                <option value="Size Issue">Size Issue</option>
                <option value="Color Issue">Color Issue</option>
                <option value="Defective">Defective / Damaged Piece</option>
                <option value="Wrong Product">Wrong Product Shipped</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Refund Method selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Refund Payment Channel
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                {(["Cash", "Bank", "EasyPaisa", "JazzCash"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setRefundMethod(method)}
                    className={`py-2 rounded-lg border text-center font-bold transition cursor-pointer ${
                      refundMethod === method
                        ? "bg-blue-600 border-blue-500 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4 mt-6">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200"
              >
                Go Back
              </button>
              <button
                onClick={handleSaveReturn}
                disabled={loading || tagAttached !== true}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-45 disabled:cursor-not-allowed rounded-xl transition shadow cursor-pointer flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <Undo2 size={14} />}
                Complete & Print Return Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
