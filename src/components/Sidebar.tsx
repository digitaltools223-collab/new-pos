import React, { useState } from "react";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Layers, 
  Users, 
  ArrowLeftRight, 
  Undo2, 
  History, 
  BarChart3, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  userRole: "admin" | "manager" | "cashier";
  onLogout: () => void;
}

export default function Sidebar({ currentView, setCurrentView, userRole, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "cashier"] },
    { id: "pos", label: "POS Billing", icon: ShoppingCart, roles: ["admin", "manager", "cashier"] },
    { id: "inventory", label: "Inventory", icon: Layers, roles: ["admin", "manager", "cashier"] },
    { id: "customers", label: "Customers", icon: Users, roles: ["admin", "manager", "cashier"] },
    { id: "exchange", label: "Exchange", icon: ArrowLeftRight, roles: ["admin", "manager", "cashier"] },
    { id: "returns", label: "Returns", icon: Undo2, roles: ["admin", "manager", "cashier"] },
    { id: "history", label: "History", icon: History, roles: ["admin", "manager", "cashier"] },
    { id: "reports", label: "Reports", icon: BarChart3, roles: ["admin", "manager"] },
    { id: "settings", label: "Settings", icon: Settings, roles: ["admin", "manager"] },
  ];

  const filteredItems = menuItems.filter((item) => item.roles.includes(userRole));

  return (
    <div 
      className={`bg-white border-r border-slate-200 text-slate-600 flex flex-col justify-between transition-all duration-300 h-screen sticky top-0 z-40 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      id="app-sidebar"
    >
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 h-16 bg-slate-50/50">
          {!isCollapsed && (
            <div className="flex flex-col select-none">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">MDR <span className="text-blue-600">POS</span></h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-semibold">Garments Edition v1.0</p>
            </div>
          )}
          {isCollapsed && (
            <div className="text-lg font-black text-blue-600 mx-auto select-none">
              MDR
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer hidden md:block"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="py-4 space-y-0.5 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {!isCollapsed && (
            <div className="px-6 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Main Menu</div>
          )}
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition-all cursor-pointer ${
                  isActive 
                    ? "bg-blue-50/70 text-blue-600 border-r-4 border-blue-600 rounded-none" 
                    : "hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon size={18} className={isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer & Permanent Branding */}
      <div className="border-t border-slate-200 p-3 space-y-3 bg-slate-50/50">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer"
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Logout</span>}
        </button>

        {/* Permanent Mandatory Branding - NON-REMOVABLE */}
        <div className="pt-2 text-center border-t border-slate-200">
          {!isCollapsed ? (
            <div className="text-[10px] text-slate-400 font-mono select-none leading-normal">
              <p>Powered By <span className="text-slate-500 font-medium">MDR Software Series</span></p>
              <p className="mt-0.5">Developed By <span className="text-slate-500 font-medium">Muhammad Danish Raza</span></p>
            </div>
          ) : (
            <div className="text-[9px] text-slate-400 font-bold select-none text-center">
              MDR
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
