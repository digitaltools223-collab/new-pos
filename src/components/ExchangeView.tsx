import React, { useState, useEffect } from "react";
import { 
  ArrowLeftRight, 
  Search, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  ShoppingBag, 
  Layers, 
  RefreshCw,
  RefreshCcw,
  Undo2
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { Sale, SaleItem, Product, Settings } from "../types";

interface ExchangeViewProps {
  onExchangeCompleted: (exchangeData: any) => void;
}

export default function ExchangeView({ onExchangeCompleted }: ExchangeViewProps) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  
  // Loaded records
  const [foundSales, setFoundSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  
  // Selected old item to return in exchange
  const [selectedOldItem, setSelectedOldItem] = useState<any | null>(null);

  // Replacement items states
  const [products, setProducts] = useState<Product[]>([]);
  const [replacementQuery, setReplacementQuery] = useState("");
  const [selectedNewProduct, setSelectedNewProduct] = useState<Product | null>(null);
  const [newQty, setNewQty] = useState(1);

  // UI States
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

  const fetchProducts = async () => {
    try {
      const data = await apiFetch<Product[]>("/api/products");
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchProducts();
  }, []);

  const handleSearchBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFoundSales([]);
    setSelectedSale(null);
    setSaleItems([]);
    setSelectedOldItem(null);
    setSelectedNewProduct(null);
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

  const handleSelectOldItem = (item: any) => {
    setError("");
    
    // Validation
    if (item.isReturned) {
      setError("This item has already been Returned. Cannot exchange.");
      return;
    }
    if (item.isExchanged) {
      setError("This item has already been Exchanged. It can only be exchanged once.");
      return;
    }

    // Days validation
    const limitDays = settings?.exchangeDays || 3;
    const daysPassed = Math.floor(
      (Date.now() - new Date(selectedSale!.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysPassed > limitDays) {
      setError(`Exchange limit has expired. Bill was generated ${daysPassed} days ago (limit: ${limitDays} days).`);
      return;
    }

    setSelectedOldItem(item);
    setStep(3);
  };

  const handleSelectNewProduct = (prod: Product) => {
    setError("");
    if (prod.stock <= 0) {
      setError("Replacement product is OUT OF STOCK!");
      return;
    }
    setSelectedNewProduct(prod);
    setNewQty(1);
  };

  const handleSaveExchange = async () => {
    setError("");
    if (!selectedOldItem || !selectedNewProduct) return;

    setLoading(true);
    try {
      const difference = (selectedNewProduct.salePrice * newQty) - (selectedOldItem.price * 1);
      let payType: "PAY" | "REFUND" | "EVEN" = "EVEN";
      if (difference > 0) payType = "PAY";
      else if (difference < 0) payType = "REFUND";

      const payload = {
        oldSaleItemId: selectedOldItem.id,
        newProductId: selectedNewProduct.id,
        newQty,
      };

      await apiFetch("/api/exchange", {
        method: "POST",
        body: payload,
      });

      setSuccess("Exchange processed successfully!");
      
      // Trigger callback to print receipt
      onExchangeCompleted({
        originalBillNumber: selectedSale!.billNumber,
        customerName: selectedSale!.customerName,
        customerPhone: selectedSale!.customerPhone,
        oldItemName: `${selectedOldItem.name} (${selectedOldItem.size}/${selectedOldItem.color})`,
        oldPrice: selectedOldItem.price,
        newItemName: `${selectedNewProduct.name} (${selectedNewProduct.size}/${selectedNewProduct.color})`,
        newPrice: selectedNewProduct.salePrice,
        difference,
        type: payType,
      });

      // Reset
      setTimeout(resetWizard, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to process exchange.");
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
    setSelectedOldItem(null);
    setSelectedNewProduct(null);
    setReplacementQuery("");
    setNewQty(1);
  };

  // Difference calculator
  const getDifference = () => {
    if (!selectedOldItem || !selectedNewProduct) return 0;
    return (selectedNewProduct.salePrice * newQty) - (selectedOldItem.price * 1);
  };

  // Filter replacement products
  const filteredReplacements = products.filter((p) => {
    const q = replacementQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.color.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="text-blue-500" />
            Smart Garments Exchange Engine
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Process item returns and size swap adjustments seamlessly. (Exchange limit: {settings?.exchangeDays || 3} Days)
          </p>
        </div>
        {step > 1 && (
          <button
            onClick={resetWizard}
            className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition border border-slate-200 shadow-sm"
          >
            <RefreshCcw size={14} className="text-blue-500" />
            Reset Exchange Wizard
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

      {/* Progress Stepper Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-500 shadow-sm">
        <span className={`${step === 1 ? "text-blue-600 font-bold" : "text-slate-400"}`}>1. Search Receipt</span>
        <ArrowRight size={12} className="text-slate-300" />
        <span className={`${step === 2 ? "text-blue-600 font-bold" : "text-slate-400"}`}>2. Select Bill Item</span>
        <ArrowRight size={12} className="text-slate-300" />
        <span className={`${step === 3 ? "text-blue-600 font-bold" : "text-slate-400"}`}>3. Select Swap Item</span>
        <ArrowRight size={12} className="text-slate-300" />
        <span className={`${step === 4 ? "text-blue-600 font-bold" : "text-slate-400"}`}>4. Adjust & Complete</span>
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
            <h3 className="font-display font-semibold text-slate-800 text-base">Select Item to Exchange</h3>
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
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-700 font-bold">Rs {item.price}</td>
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
                          onClick={() => handleSelectOldItem(item)}
                          disabled={!eligible}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:opacity-45 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <ArrowLeftRight size={12} />
                          Exchange Item
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

      {/* STEP 3: Choose New swap item */}
      {step === 3 && selectedOldItem && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Search replacements */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-[450px]">
            <div className="flex flex-col flex-grow overflow-hidden">
              <div className="pb-3 border-b border-slate-100 mb-3 flex-shrink-0">
                <h3 className="font-display font-semibold text-slate-800 text-sm mb-2">Select Replacement Product</h3>
                <div className="relative w-full">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={replacementQuery}
                    onChange={(e) => setReplacementQuery(e.target.value)}
                    placeholder="Search replacement garments name or barcode..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* Replacements List scroll */}
              <div className="flex-grow overflow-y-auto pr-1 space-y-2">
                {filteredReplacements.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isSelected = selectedNewProduct?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && handleSelectNewProduct(p)}
                      className={`p-3 border rounded-xl flex items-center justify-between transition-all select-none ${
                        isOutOfStock 
                          ? "bg-slate-50 border-slate-200 opacity-40 cursor-not-allowed" 
                          : isSelected
                          ? "bg-blue-600 border-blue-500 text-white shadow-sm cursor-pointer"
                          : "bg-slate-50 border-slate-100 hover:border-slate-300 cursor-pointer text-slate-700"
                      }`}
                    >
                      <div>
                        <h4 className="font-semibold text-xs truncate">{p.name}</h4>
                        <p className={`text-[10px] mt-0.5 ${isSelected ? "text-slate-100" : "text-slate-400"}`}>
                          Size: <b className="font-mono">{p.size}</b> | Col: {p.color} | Barcode: {p.barcode}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold block">Rs {p.salePrice.toLocaleString()}</span>
                        <span className={`text-[9px] font-mono block mt-0.5 ${isSelected ? "text-slate-100" : "text-slate-500"}`}>
                          {p.stock} left
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right panel: Sizing, qty & review */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-[450px]">
            <div>
              <h3 className="font-display font-semibold text-slate-800 border-b border-slate-100 pb-3 text-sm">
                Swap Confirmation Details
              </h3>

              {/* Old item panel */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4">
                <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block mb-1">Old Item Returned</span>
                <h4 className="text-xs font-semibold text-slate-800">{selectedOldItem.name}</h4>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Size: {selectedOldItem.size} | Color: {selectedOldItem.color}</p>
                <p className="text-xs text-slate-950 font-bold font-mono mt-1 text-right">Refund Value: Rs {selectedOldItem.price}</p>
              </div>

              {/* Selected replacement */}
              {!selectedNewProduct ? (
                <div className="mt-4 p-6 border border-dashed border-slate-200 text-center rounded-xl text-xs text-slate-400 italic">
                  Select a replacement product from the list.
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4 space-y-3">
                  <div>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">New Item Selected</span>
                    <h4 className="text-xs font-semibold text-slate-800">{selectedNewProduct.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Size: {selectedNewProduct.size} | Color: {selectedNewProduct.color}</p>
                    <p className="text-xs text-slate-950 font-bold font-mono mt-1 text-right">Value: Rs {selectedNewProduct.salePrice}</p>
                  </div>

                  {/* Replacement Qty */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                    <span className="text-xs font-bold text-slate-500 uppercase">Quantity</span>
                    <div className="flex items-center gap-2 bg-white rounded-lg p-0.5 border border-slate-200">
                      <button
                        onClick={() => setNewQty(prev => Math.max(1, prev - 1))}
                        className="p-1 hover:bg-slate-50 text-slate-500 rounded transition font-bold"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs text-slate-800 w-4 text-center">{newQty}</span>
                      <button
                        onClick={() => {
                          if (newQty + 1 > selectedNewProduct.stock) {
                            setError(`Only ${selectedNewProduct.stock} units available.`);
                            return;
                          }
                          setNewQty(prev => prev + 1);
                        }}
                        className="p-1 hover:bg-slate-50 text-slate-500 rounded transition font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedNewProduct && (
              <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                {/* Save action */}
                <button
                  onClick={() => setStep(4)}
                  className="w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Proceed to Calculation
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: Checkout & Auto calculation layout */}
      {step === 4 && selectedOldItem && selectedNewProduct && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-display font-semibold text-slate-800 text-base">Exchange Balance Invoice</h3>
            <p className="text-xs text-slate-500 mt-0.5">Please review pricing adjustments below.</p>
          </div>

          <div className="space-y-4">
            {/* Bill Summary List */}
            <div className="divide-y divide-slate-100 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Old Item: {selectedOldItem.name} ({selectedOldItem.size})</span>
                <span className="text-red-600 font-bold">-Rs {selectedOldItem.price}</span>
              </div>
              <div className="flex justify-between pt-3.5">
                <span className="text-slate-500 font-sans">New Item: {selectedNewProduct.name} ({selectedNewProduct.size}) x{newQty}</span>
                <span className="text-emerald-600 font-bold">+Rs {selectedNewProduct.salePrice * newQty}</span>
              </div>

              {/* Adjustments */}
              <div className="flex justify-between font-bold text-sm text-slate-800 pt-4">
                <span className="font-sans">Difference Amount:</span>
                <span>Rs {getDifference()}</span>
              </div>
            </div>

            {/* Adjustment Outcome notification */}
            {getDifference() > 0 ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 leading-relaxed text-center">
                👉 Balance is positive. <b>Collect Rs {getDifference()}</b> from customer.
              </div>
            ) : getDifference() < 0 ? (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-relaxed text-center">
                👉 Balance is negative. <b>Refund Rs {Math.abs(getDifference())}</b> to customer.
              </div>
            ) : (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed text-center">
                👉 Even exchange. <b>No financial adjustments required.</b>
              </div>
            )}

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200"
              >
                Go Back
              </button>
              <button
                onClick={handleSaveExchange}
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition shadow cursor-pointer flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                Complete & Print Exchange Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
