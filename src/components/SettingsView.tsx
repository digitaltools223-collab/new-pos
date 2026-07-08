import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Save, 
  HelpCircle, 
  AlertTriangle, 
  Sliders, 
  Receipt,
  Clock,
  Briefcase,
  RefreshCw,
  Users,
  UserPlus,
  Trash2
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { Settings as SettingsType } from "../types";

interface SettingsViewProps {
  userRole?: "admin" | "manager" | "cashier";
}

export default function SettingsView({ userRole = "admin" }: SettingsViewProps) {
  const [formData, setFormData] = useState<SettingsType>({
    shopName: "Shoaib Ladies Garments",
    phone: "0300-1234567",
    address: "Shop # 15, Madina Bazaar, Karachi",
    ntn: "1234567-8",
    receiptHeader: "WELCOME TO SHOAIB LADIES GARMENTS",
    receiptFooter: "NO REFUND / ONLY EXCHANGE IN 3 DAYS\nTAG MUST BE ATTACHED\nTHANK YOU FOR SHOPPING!",
    returnDays: 3,
    exchangeDays: 3,
    logo: "",
    ownerName: "Muhammad Danish Raza",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "cashier" });
  const [userActionError, setUserActionError] = useState("");
  const [userActionSuccess, setUserActionSuccess] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<SettingsType>("/api/settings");
      setFormData({
        ...data,
        ownerName: data.ownerName || "Muhammad Danish Raza",
      });
    } catch (err: any) {
      setError(err.message || "Failed to load shop parameters.");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await apiFetch<any[]>("/api/users");
      setUsers(data);
    } catch (err: any) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    if (userRole === "admin") {
      loadUsers();
    }
  }, [userRole]);

  const handleAddUser = async () => {
    setUserActionError("");
    setUserActionSuccess("");
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      setUserActionError("Please fill in all staff details.");
      return;
    }
    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: newUser,
      });
      setUserActionSuccess(`Staff account for "${newUser.name}" registered successfully!`);
      setNewUser({ name: "", email: "", password: "", role: "cashier" });
      loadUsers();
    } catch (err: any) {
      setUserActionError(err.message || "Failed to add staff account.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this staff account?")) return;
    setUserActionError("");
    setUserActionSuccess("");
    try {
      await apiFetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      setUserActionSuccess("Staff account deleted successfully!");
      loadUsers();
    } catch (err: any) {
      setUserActionError(err.message || "Failed to delete staff account.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "returnDays" || name === "exchangeDays"
        ? Math.max(1, parseInt(value) || 1)
        : value,
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: formData,
      });
      setSuccess("Store properties saved successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="text-blue-500" />
          POS Configuration Panel
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Configure thermal printer margins, business rules, headers and tax codes.
        </p>
      </div>

      {/* Advisory Permanent Branding Warning */}
      <div className="bg-amber-50 border-2 border-dashed border-amber-250 p-4 rounded-xl flex items-start gap-3 shadow-sm">
        <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-bold text-amber-800 text-sm">System Ownership Notice</h4>
          <p className="text-xs text-amber-700 leading-relaxed mt-1 font-medium font-mono">
            ⚠ MDR Software Series Branding is Permanent and Cannot Be Removed or Altered under licensing terms.
          </p>
        </div>
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

      {/* Form Grid */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column: Shop and Business metadata */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-semibold text-slate-800 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
            <Briefcase size={16} className="text-blue-500" />
            Merchant Profile Details
          </h3>

          {/* Shop Name & Owner Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Garments Shop Name *
              </label>
              <input
                type="text"
                name="shopName"
                required
                value={formData.shopName}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Business Owner Name *
              </label>
              <input
                type="text"
                name="ownerName"
                required
                value={formData.ownerName || ""}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Shop Phone & Tax Register */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Helpdesk Phone Line
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                NTN / Tax Registration Number
              </label>
              <input
                type="text"
                name="ntn"
                value={formData.ntn}
                onChange={handleInputChange}
                placeholder="e.g. 1234567-8"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Shop Address */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Shop Outlet Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
            />
          </div>

          {/* Sizing & policy day configurations */}
          <h3 className="font-display font-semibold text-slate-800 text-sm border-b border-slate-100 pb-2.5 pt-4 flex items-center gap-1.5">
            <Clock size={16} className="text-blue-500" />
            Transaction Window Days
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Returns Window (Days)
              </label>
              <input
                type="number"
                name="returnDays"
                min="1"
                required
                value={formData.returnDays}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Exchanges Window (Days)
              </label>
              <input
                type="number"
                name="exchangeDays"
                min="1"
                required
                value={formData.exchangeDays}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Right column: Receipt customization elements */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-slate-800 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <Receipt size={16} className="text-blue-500" />
              Receipt Customizations
            </h3>

            {/* Receipt Logo Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Receipt Logo Image
              </label>
              {formData.logo ? (
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <img
                    src={formData.logo}
                    alt="Receipt Logo"
                    className="max-h-12 max-w-[80px] object-contain border border-slate-200 rounded p-1 bg-white filter grayscale"
                  />
                  <div className="flex-grow">
                    <p className="text-[10px] text-slate-500 truncate font-mono">Logo Loaded</p>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logo: "" })}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer mt-0.5"
                    >
                      Remove Logo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative border border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 transition text-center cursor-pointer bg-slate-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({ ...formData, logo: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <p className="text-xs font-semibold text-slate-600">
                    Upload Shop Logo
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Click to browse (grayscale recommended)
                  </p>
                </div>
              )}
            </div>

            {/* Receipt Header text */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Receipt Banner Header text
              </label>
              <input
                type="text"
                name="receiptHeader"
                value={formData.receiptHeader}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono"
              />
            </div>

            {/* Receipt Footer Message */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Receipt Footer Notice Msg
              </label>
              <textarea
                name="receiptFooter"
                rows={5}
                value={formData.receiptFooter}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono resize-none leading-relaxed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block leading-normal">
                Supports line breaks. Direct thermal print formats will wrap as configured.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Save Configuration Settings
            </button>
          </div>
        </div>
      </form>

      {/* Staff Accounts Management (Only for Admin) */}
      {userRole === "admin" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-display font-semibold text-slate-800 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <Users size={16} className="text-blue-500" />
              Manage Cashier & Staff Accounts
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Add or remove cashiers and managers who can access this POS system.
            </p>
          </div>

          {userActionError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-800">
              {userActionError}
            </div>
          )}

          {userActionSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800">
              {userActionSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Staff List */}
            <div className="lg:col-span-7 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Staff ({users.length})</h4>
              {usersLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              ) : users.length === 0 ? (
                <p className="text-slate-400 text-xs italic font-mono">No other staff accounts configured.</p>
              ) : (
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
                  {users.map((u) => (
                    <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{u.name}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                            u.role === "admin" 
                              ? "bg-amber-100 text-amber-800" 
                              : u.role === "manager"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-200 text-slate-700"
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.email}</p>
                      </div>
                      
                      {u.id !== "u_admin" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Staff Form */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus size={14} className="text-blue-500" />
                Add New Staff
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Staff Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Danish Cashier"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. cashier2@mdr.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Account Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cashier">Cashier (POS Only)</option>
                    <option value="manager">Manager (POS & Inventory)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddUser}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <UserPlus size={13} />
                  Register Staff Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
