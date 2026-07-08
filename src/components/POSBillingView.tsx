import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  UserPlus, 
  Receipt, 
  CreditCard, 
  Calculator, 
  Sparkles, 
  ChevronDown,
  FolderOpen,
  Keyboard,
  Archive,
  X
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { Product, Customer } from "../types";

interface CartItem {
  product: Product;
  qty: number;
}

interface POSBillingViewProps {
  onBillSaved: (saleId: string) => void;
}

export default function POSBillingView({ onBillSaved }: POSBillingViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Cart & Customer States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [custName, setCustName] = useState("Walk-In Customer");
  const [custPhone, setCustPhone] = useState("0000000000");
  const [custAddress, setCustAddress] = useState("");

  // Totals States
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "Cash" | "Card" | "EasyPaisa" | "JazzCash" | "Bank Transfer"
  >("Cash");
  const [amountReceived, setAmountReceived] = useState<number>(0);

  // Hold Carts Queue
  const [heldCarts, setHeldCarts] = useState<{ id: string; time: string; customer: string; cart: CartItem[] }[]>([]);
  const [showHeldDropdown, setShowHeldDropdown] = useState(false);

  // UI Helpers
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [scannerMode, setScannerMode] = useState(true); // Default true for instant scanner
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load products on mount
  const loadProducts = async () => {
    try {
      const data = await apiFetch<Product[]>("/api/products");
      setProducts(data);
      // Unique categories
      const cats = Array.from(new Set(data.map((p) => p.category)));
      setCategories(cats);
    } catch (err: any) {
      showFeedback("error", "Error loading products: " + err.message);
    }
  };

  useEffect(() => {
    loadProducts();
    // Load held carts from local storage
    const saved = localStorage.getItem("mdr_held_bills");
    if (saved) {
      setHeldCarts(JSON.parse(saved));
    }
    // Auto-focus search input
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
        showFeedback("info", "F1 triggered: Search bar focused");
      } else if (e.key === "F2" || e.key === "F3") {
        e.preventDefault();
        handleCheckout();
      } else if (e.key === "Escape") {
        e.preventDefault();
        clearCart();
        showFeedback("info", "ESC triggered: Cart cleared");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, custName, custPhone, custAddress, discountType, discountValue, paymentMethod, amountReceived]);

  const showFeedback = (type: "success" | "error" | "info", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: "", message: "" }), 4000);
  };

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showFeedback("error", "Product is OUT OF STOCK!");
      return;
    }

    const existingIdx = cart.findIndex((item) => item.product.id === product.id);

    if (existingIdx > -1) {
      const currentQty = cart[existingIdx].qty;
      if (currentQty + 1 > product.stock) {
        showFeedback("error", `Only ${product.stock} pieces available.`);
        return;
      }
      const updated = [...cart];
      updated[existingIdx].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }

    showFeedback("success", `Added "${product.name} (${product.size})" to cart.`);
    
    // Auto focus search box again
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const updateCartQty = (productId: string, delta: number) => {
    const idx = cart.findIndex((item) => item.product.id === productId);
    if (idx === -1) return;

    const item = cart[idx];
    const newQty = item.qty + delta;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.product.stock) {
      showFeedback("error", `Only ${item.product.stock} pieces available.`);
      return;
    }

    const updated = [...cart];
    updated[idx].qty = newQty;
    setCart(updated);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
    showFeedback("info", "Item removed from cart.");
  };

  const clearCart = () => {
    setCart([]);
    setCustName("Walk-In Customer");
    setCustPhone("0000000000");
    setCustAddress("");
    setDiscountValue(0);
    setAmountReceived(0);
  };

  // Hold & Restore operations
  const holdBill = () => {
    if (cart.length === 0) {
      showFeedback("error", "Cannot hold an empty cart.");
      return;
    }

    const newHeld = {
      id: "held_" + Date.now(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      customer: custName || "Walk-In Customer",
      cart: [...cart],
    };

    const updated = [newHeld, ...heldCarts];
    setHeldCarts(updated);
    localStorage.setItem("mdr_held_bills", JSON.stringify(updated));

    clearCart();
    showFeedback("success", "Bill put on Hold successfully.");
  };

  const restoreHeldCart = (id: string) => {
    const selected = heldCarts.find((h) => h.id === id);
    if (!selected) return;

    setCart(selected.cart);
    setCustName(selected.customer);
    
    const updated = heldCarts.filter((h) => h.id !== id);
    setHeldCarts(updated);
    localStorage.setItem("mdr_held_bills", JSON.stringify(updated));
    setShowHeldDropdown(false);
    showFeedback("success", `Restored bill for "${selected.customer}".`);
  };

  const deleteHeldCart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = heldCarts.filter((h) => h.id !== id);
    setHeldCarts(updated);
    localStorage.setItem("mdr_held_bills", JSON.stringify(updated));
    showFeedback("info", "Held bill removed.");
  };

  // Calculations
  const getSubtotal = () => {
    return cart.reduce((acc, curr) => acc + curr.product.salePrice * curr.qty, 0);
  };

  const getDiscountAmount = () => {
    const subtotal = getSubtotal();
    if (discountType === "fixed") {
      return Math.min(discountValue, subtotal);
    } else {
      return Math.round(subtotal * (Math.min(discountValue, 100) / 100));
    }
  };

  const getGrandTotal = () => {
    return Math.max(0, getSubtotal() - getDiscountAmount());
  };

  const getChangeAmount = () => {
    return Math.max(0, amountReceived - getGrandTotal());
  };

  // Autocomplete search and barcode scanner action
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // If query matches a barcode exactly, immediately add to cart and clear query
    const matched = products.find((p) => p.barcode.toLowerCase() === query.trim().toLowerCase());
    if (matched) {
      addToCart(matched);
      setSearchQuery("");
    }
  };

  // Direct checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showFeedback("error", "Your cart is empty.");
      return;
    }

    const total = getGrandTotal();
    if (amountReceived < total) {
      showFeedback("error", "Insufficient payment amount. Amount Received must be at least Grand Total.");
      return;
    }

    try {
      const payload = {
        customerName: custName.trim() || "Walk-In Customer",
        customerPhone: custPhone.trim() || "0000000000",
        customerAddress: custAddress.trim() || "",
        subtotal: getSubtotal(),
        discount: getDiscountAmount(),
        discountType,
        discountValue,
        total,
        paymentMethod,
        amountReceived,
        changeAmount: getChangeAmount(),
        items: cart.map((item) => ({
          productId: item.product.id,
          qty: item.qty,
          price: item.product.salePrice,
        })),
      };

      const result = await apiFetch<any>("/api/bills", {
        method: "POST",
        body: payload,
      });

      showFeedback("success", "Bill generated successfully!");
      // Open Receipt Thermal Preview
      onBillSaved(result.id);
      // Clear Cart state
      clearCart();
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to process sale.");
    }
  };

  // Filter products based on search or category
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-8rem)]">
      {/* LEFT SIDE: Products & Filters */}
      <div className="lg:col-span-7 flex flex-col justify-between h-full bg-white border border-slate-200 rounded-2xl p-4 overflow-hidden shadow-sm">
        {/* Top Search, Category & Held controls */}
        <div className="space-y-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search input with autofocus scanner support */}
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Scan Barcode or Search Garment (F1)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Hold Queue Dropdown */}
            <div className="relative flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setShowHeldDropdown(!showHeldDropdown)}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between gap-2 transition cursor-pointer shadow-sm"
              >
                <Archive size={14} className="text-amber-500" />
                <span>Held Bills ({heldCarts.length})</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showHeldDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 max-h-60 overflow-y-auto">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider p-2 border-b border-slate-100 mb-1">
                    Queue Lists
                  </div>
                  {heldCarts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      No held carts present.
                    </div>
                  ) : (
                    heldCarts.map((h) => (
                      <div
                        key={h.id}
                        onClick={() => restoreHeldCart(h.id)}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-xs text-slate-700"
                      >
                        <div className="overflow-hidden mr-2">
                          <p className="font-semibold truncate text-slate-900">{h.customer}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Time: {h.time} | {h.cart.length} items
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteHeldCart(h.id, e)}
                          className="p-1 rounded bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-100 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 select-none">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                selectedCategory === "All"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              All Garments
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-grow overflow-y-auto mt-4 pr-1">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm italic">
              No garments match the current filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`border rounded-xl p-3 flex flex-col justify-between transition-all select-none shadow-sm ${
                      isOutOfStock
                        ? "bg-slate-50 border-slate-200/60 opacity-40 cursor-not-allowed"
                        : "bg-white border-slate-200 hover:border-blue-400 cursor-pointer active:scale-98 hover:shadow-md"
                    }`}
                  >
                    {/* Image Placeholder or actual Base64 */}
                    <div className="h-24 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-2">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                            {p.category}
                          </span>
                          <span className="font-mono text-blue-600 text-xs font-bold block mt-1">
                            {p.size}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 truncate">{p.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded uppercase font-mono font-bold border border-slate-200">
                          {p.size}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">{p.color}</span>
                      </div>
                    </div>

                    {/* Pricing & Stock */}
                    <div className="flex items-center justify-between border-t border-slate-100 mt-2.5 pt-2">
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        Rs {p.salePrice.toLocaleString()}
                      </span>
                      {isOutOfStock ? (
                        <span className="text-[8px] bg-red-50 border border-red-200 text-red-600 px-1.5 py-0.5 rounded font-mono font-bold">
                          SOLD OUT
                        </span>
                      ) : (
                        <span className={`text-[9px] font-mono font-semibold ${
                          p.stock <= 3 ? "text-red-500 font-bold" : "text-slate-400"
                        }`}>
                          {p.stock} units
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Shortcuts / Feedback Footer Helper */}
        <div className="mt-4 pt-3 border-t border-slate-150 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3.5 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1"><Keyboard size={12} className="text-slate-400" /> Shortcuts:</span>
            <span><b className="text-slate-600 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded">F1</b> Search</span>
            <span><b className="text-slate-600 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded">F2</b> Save & Print</span>
            <span><b className="text-slate-600 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded">ESC</b> Clear</span>
          </div>

          {/* Quick inline feedback alerts */}
          {feedback.message && (
            <div className={`text-[10px] font-mono px-3 py-1 rounded border ${
              feedback.type === "success" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : feedback.type === "error"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {feedback.message}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Cart, Customer & Checkout */}
      <div className="lg:col-span-5 flex flex-col h-full bg-white border border-slate-200 rounded-2xl p-4 overflow-hidden shadow-sm justify-between">
        <div className="flex flex-col flex-grow overflow-hidden">
          {/* Bill Info Header */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-150 flex-shrink-0">
            <div>
              <h3 className="font-display font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="text-blue-500" size={16} />
                New Sale Cart
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
                MDR Garments Series
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-500 font-mono leading-tight">
              <p>Date: {new Date().toLocaleDateString()}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>

          {/* Customer Metadata Block */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-3 space-y-2 flex-shrink-0 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Phone
                </label>
                <input
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Walk-In Customer"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Customer Address (Optional)
              </label>
              <input
                type="text"
                value={custAddress}
                onChange={(e) => setCustAddress(e.target.value)}
                placeholder="Karachi, Pakistan"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 placeholder-slate-400 text-[11px] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Cart Table Area */}
          <div className="flex-grow overflow-y-auto mt-3 pr-1">
            {cart.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl">
                Cart is currently empty.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="text-[10px] uppercase font-mono tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="py-2 px-1">Garment</th>
                    <th className="py-2 px-1 text-center">Qty</th>
                    <th className="py-2 px-1 text-right">Price</th>
                    <th className="py-2 px-1 text-right">Amount</th>
                    <th className="py-2 px-1 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item) => (
                    <tr key={item.product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-1 max-w-[140px] truncate">
                        <p className="font-semibold text-slate-800 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Sz: {item.product.size} | {item.product.color}
                        </p>
                      </td>
                      <td className="py-2.5 px-1">
                        <div className="flex items-center justify-center gap-1.5 bg-slate-50 rounded-lg p-0.5 border border-slate-200 w-16 mx-auto">
                          <button
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="font-mono text-xs font-semibold text-slate-800 w-4 text-center">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-1 text-right font-mono text-slate-500">
                        Rs {item.product.salePrice.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-1 text-right font-mono font-semibold text-slate-800">
                        Rs {(item.product.salePrice * item.qty).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-1 text-center">
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-400 hover:text-red-500 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Checkout, Discounts & Totals Form */}
        <div className="mt-4 pt-3 border-t border-slate-200 space-y-3.5 flex-shrink-0 bg-slate-50 p-3 rounded-xl">
          {/* Subtotal, Discounts Row */}
          <div className="grid grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Discount Type
              </label>
              <div className="bg-white rounded-lg p-0.5 border border-slate-200 flex">
                <button
                  type="button"
                  onClick={() => setDiscountType("fixed")}
                  className={`w-1/2 py-1 text-[10px] font-semibold uppercase rounded transition ${
                    discountType === "fixed"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  Fixed (Rs)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("percentage")}
                  className={`w-1/2 py-1 text-[10px] font-semibold uppercase rounded transition ${
                    discountType === "percentage"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  Percent (%)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Discount Value
              </label>
              <input
                type="number"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono text-center focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
              {(["Cash", "Card", "EasyPaisa", "JazzCash", "Bank Transfer"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 rounded-lg border text-center font-bold transition cursor-pointer ${
                    paymentMethod === method
                      ? "bg-blue-600 border-blue-500 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Received */}
          <div className="grid grid-cols-2 gap-3.5 items-center border-t border-slate-200 pt-3 text-xs">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Amount Received (Rs)
              </span>
              <input
                type="number"
                min="0"
                value={amountReceived === 0 ? "" : amountReceived}
                onChange={(e) => setAmountReceived(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="Rs Received..."
                className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="text-right">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Change Return (Rs)
              </span>
              <span className="text-lg font-mono font-bold text-amber-600 block mt-1">
                Rs {getChangeAmount().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Billing Totals Summary Panel */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">Rs {getSubtotal().toLocaleString()}</span>
            </div>
            {getDiscountAmount() > 0 && (
              <div className="flex justify-between text-red-500 font-medium">
                <span>Discount Applied:</span>
                <span className="font-mono">-Rs {getDiscountAmount().toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2.5">
              <span>GRAND TOTAL:</span>
              <span className="font-mono text-blue-600 text-base">
                Rs {getGrandTotal().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action POS Buttons */}
          <div className="grid grid-cols-3 gap-2.5 border-t border-slate-200 pt-3.5">
            <button
              type="button"
              onClick={clearCart}
              className="py-2.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition cursor-pointer"
            >
              Clear Cart
            </button>
            <button
              type="button"
              onClick={holdBill}
              className="py-2.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-250 rounded-xl transition cursor-pointer"
            >
              Hold Bill
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Receipt size={14} />
              Save & Print (F2)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
