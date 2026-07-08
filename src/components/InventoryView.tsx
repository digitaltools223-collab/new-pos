import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  Upload,
  AlertCircle
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { Product, ProductSize } from "../types";

interface InventoryViewProps {
  userRole: "admin" | "manager" | "cashier";
}

const SUPPORTED_SIZES: ProductSize[] = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

export default function InventoryView({ userRole }: InventoryViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    category: "",
    brand: "",
    size: "M" as ProductSize,
    color: "",
    purchasePrice: 0,
    salePrice: 0,
    stock: 0,
    image: "",
  });

  // Stock Adjustment State
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);

  const isCashier = userRole === "cashier";
  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager";

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Product[]>("/api/products");
      setProducts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "purchasePrice" || name === "salePrice" || name === "stock"
        ? Math.max(0, parseFloat(value) || 0)
        : value,
    });
  };

  // Convert uploaded image to base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size too large. Maximum size is 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({
        ...formData,
        image: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const openAddModal = () => {
    if (isCashier) return;
    setEditingProduct(null);
    setFormData({
      name: "",
      barcode: "",
      category: "Kurtis",
      brand: "Shoaib Ladies Garments",
      size: "M",
      color: "Black",
      purchasePrice: 0,
      salePrice: 0,
      stock: 0,
      image: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    if (isCashier) return;
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      barcode: prod.barcode,
      category: prod.category,
      brand: prod.brand,
      size: prod.size,
      color: prod.color,
      purchasePrice: prod.purchasePrice,
      salePrice: prod.salePrice,
      stock: prod.stock,
      image: prod.image || "",
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isCashier) return;

    try {
      if (editingProduct) {
        // Update product
        await apiFetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          body: formData,
        });
        setSuccess("Product updated successfully!");
      } else {
        // Add new product
        await apiFetch("/api/products", {
          method: "POST",
          body: formData,
        });
        setSuccess("Product created successfully!");
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setError(err.message || "Failed to save product.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!isAdmin) {
      setError("Only admins are authorized to delete inventory.");
      return;
    }

    if (!confirm("Are you absolutely sure you want to delete this product? This is permanent.")) {
      return;
    }

    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      setSuccess("Product deleted successfully.");
      loadProducts();
    } catch (err: any) {
      setError(err.message || "Failed to delete product.");
    }
  };

  // Perform quick stock adjustments
  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || isCashier) return;

    setError("");
    setSuccess("");

    const newStock = adjustingProduct.stock + adjustmentQty;
    if (newStock < 0) {
      setError("Product stock cannot go below zero.");
      return;
    }

    try {
      await apiFetch(`/api/products/${adjustingProduct.id}`, {
        method: "PUT",
        body: { stock: newStock },
      });
      setSuccess(`Adjusted "${adjustingProduct.name}" stock by ${adjustmentQty > 0 ? "+" : ""}${adjustmentQty}.`);
      setAdjustingProduct(null);
      setAdjustmentQty(0);
      loadProducts();
    } catch (err: any) {
      setError(err.message || "Failed to adjust stock.");
    }
  };

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(query) ||
      p.barcode.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.color.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Garments Inventory Control
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage barcodes, sizing variations, purchase and sale pricing structures.
          </p>
        </div>

        {!isCashier && (
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus size={16} />
            Add New Garment
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Search Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Barcode, Product Name, Category, Color or Brand..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono flex-shrink-0">
          Showing {filteredProducts.length} of {products.length} Products
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic text-sm">
            No garments items in inventory match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Barcode</th>
                  <th className="py-3 px-4">Garment Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Purchase Price</th>
                  <th className="py-3 px-4 text-right">Sale Price</th>
                  <th className="py-3 px-4 text-center">Stock Level</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProducts.map((p) => {
                  const isLowStock = p.stock <= 3;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      {/* Barcode */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{p.barcode}</td>

                      {/* Details (Name, color, size, brand) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* Mini Thumbnail */}
                          <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden font-mono text-blue-600 text-xs font-bold">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              p.size
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span>Brand: <b className="text-slate-700 font-medium">{p.brand}</b></span>
                              <span>•</span>
                              <span>Size: <b className="text-blue-600 font-bold font-mono">{p.size}</b></span>
                              <span>•</span>
                              <span>Color: <b className="text-slate-700 font-medium">{p.color}</b></span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-50 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 border border-slate-100">
                          {p.category}
                        </span>
                      </td>

                      {/* Pricing */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        Rs {p.purchasePrice.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        Rs {p.salePrice.toLocaleString()}
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span
                            className={`px-3 py-1 rounded-lg font-mono text-xs font-bold border ${
                              p.stock === 0
                                ? "bg-rose-50 border-rose-200 text-rose-700"
                                : isLowStock
                                ? "bg-amber-50 border-amber-200 text-amber-700 animate-pulse"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700"
                            }`}
                          >
                            {p.stock} units
                          </span>

                          {/* Quick inline stock adjustment actions (not for Cashier) */}
                          {!isCashier && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setAdjustingProduct(p); setAdjustmentQty(1); }}
                                className="p-1 rounded bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-500 border border-slate-200 transition cursor-pointer"
                                title="Add stock"
                              >
                                <ArrowUpRight size={12} />
                              </button>
                              <button
                                onClick={() => { setAdjustingProduct(p); setAdjustmentQty(-1); }}
                                className="p-1 rounded bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 transition cursor-pointer"
                                title="Reduce stock"
                              >
                                <ArrowDownLeft size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isCashier ? (
                            <span className="text-slate-400 text-xs italic font-mono">Restricted</span>
                          ) : (
                            <>
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-400 transition cursor-pointer"
                                title="Edit Product details"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                disabled={!isAdmin}
                                className={`p-1.5 rounded-lg bg-slate-800 text-slate-400 transition ${
                                  isAdmin 
                                    ? "hover:bg-rose-950/40 hover:text-rose-400 cursor-pointer" 
                                    : "opacity-40 cursor-not-allowed"
                                }`}
                                title={isAdmin ? "Delete Product" : "Only Admin can delete"}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DIALOG 1: Add / Edit Garment Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
              <h3 className="font-display font-semibold text-white">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : "Add New Garment Product"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Designer Silk Kurti"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Barcode & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Barcode (Leave Empty for Auto-Gen)
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleInputChange}
                    placeholder="e.g. GAR-000001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Kurtis, Maxis, Suits..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Brand & Sizing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    name="brand"
                    required
                    value={formData.brand}
                    onChange={handleInputChange}
                    placeholder="Shoaib Ladies Garments"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Size Variation *
                  </label>
                  <select
                    name="size"
                    required
                    value={formData.size}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {SUPPORTED_SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Color *
                  </label>
                  <input
                    type="text"
                    name="color"
                    required
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder="Royal Blue, Jet Black, Crimson Red"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Initial Stock Quantity *
                  </label>
                  <input
                    type="number"
                    name="stock"
                    required
                    min="0"
                    disabled={!!editingProduct} // In edit, use Stock adjustments flow
                    value={formData.stock}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  {editingProduct && (
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      ⚠ Edit stock level using adjustments menu.
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Purchase Price (Rs Cost) *
                  </label>
                  <input
                    type="number"
                    name="purchasePrice"
                    required
                    min="0"
                    value={formData.purchasePrice}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Sale Price (Rs Retail) *
                  </label>
                  <input
                    type="number"
                    name="salePrice"
                    required
                    min="0"
                    value={formData.salePrice}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Product Image
                </label>
                <div className="mt-1 flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="h-16 w-16 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-slate-800 text-slate-600 font-mono text-xs">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      "No Image"
                    )}
                  </div>
                  <div className="flex-grow">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer border border-slate-700 transition">
                      <Upload size={14} />
                      Choose Image File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      Supports JPG, PNG formats up to 2MB. Image converts to Base64 locally.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Footer */}
              <div className="px-6 py-4 -mx-6 -mb-6 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check size={16} />
                  {editingProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 2: Quick Stock Adjustment Dialog */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
              <h3 className="font-display font-semibold text-white">Stock Adjustment</h3>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleStockAdjustmentSubmit} className="p-6 space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <h4 className="text-xs font-semibold text-white truncate">{adjustingProduct.name}</h4>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">
                  Current Stock: <span className="text-emerald-400 font-bold">{adjustingProduct.stock}</span> units
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Adjustment Quantity (units)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentQty(prev => prev - 1)}
                    className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-mono font-bold cursor-pointer transition border border-slate-800"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    value={adjustmentQty}
                    onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                    className="flex-grow bg-slate-950 border border-slate-800 rounded-xl py-2 text-center text-sm font-bold font-mono text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustmentQty(prev => prev + 1)}
                    className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-mono font-bold cursor-pointer transition border border-slate-800"
                  >
                    +1
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1.5 block">
                  Positive counts increase stock, negative counts decrease stock.
                </span>
              </div>

              {/* Warning on stock deduction */}
              {adjustmentQty < 0 && Math.abs(adjustmentQty) > adjustingProduct.stock && (
                <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl flex gap-2 text-[11px] text-rose-300">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-rose-400" />
                  <p>Warning: Negative stock adjustments cannot exceed current stock ({adjustingProduct.stock}).</p>
                </div>
              )}

              {/* Submit footer */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-750 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustmentQty === 0 || (adjustmentQty < 0 && Math.abs(adjustmentQty) > adjustingProduct.stock)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
                >
                  Apply Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
