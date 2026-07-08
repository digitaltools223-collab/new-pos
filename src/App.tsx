import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ReceiptModal from "./components/ReceiptModal";
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import POSBillingView from "./components/POSBillingView";
import InventoryView from "./components/InventoryView";
import CustomersView from "./components/CustomersView";
import ExchangeView from "./components/ExchangeView";
import ReturnsView from "./components/ReturnsView";
import HistoryView from "./components/HistoryView";
import ReportsView from "./components/ReportsView";
import SettingsView from "./components/SettingsView";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: "admin" | "manager" | "cashier" } | null>(null);
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [loading, setLoading] = useState(true);

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptType, setReceiptType] = useState<"sale" | "return" | "exchange">("sale");
  const [activeSaleId, setActiveSaleId] = useState<string | undefined>(undefined);
  const [activeReturnData, setActiveReturnData] = useState<any>(undefined);
  const [activeExchangeData, setActiveExchangeData] = useState<any>(undefined);
  const [autoPrint, setAutoPrint] = useState(false);

  useEffect(() => {
    // Initial Auth Restoration
    const storedToken = localStorage.getItem("mdr_pos_token");
    const storedUser = localStorage.getItem("mdr_pos_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("mdr_pos_token");
        localStorage.removeItem("mdr_pos_user");
      }
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (
    newToken: string,
    newUser: { id: string; name: string; email: string; role: "admin" | "manager" | "cashier" }
  ) => {
    localStorage.setItem("mdr_pos_token", newToken);
    localStorage.setItem("mdr_pos_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("mdr_pos_token");
    localStorage.removeItem("mdr_pos_user");
    setToken(null);
    setUser(null);
    setCurrentView("dashboard");
  };

  // Receipt trigger functions
  const handleViewReceipt = (saleId: string) => {
    setReceiptType("sale");
    setActiveSaleId(saleId);
    setActiveReturnData(undefined);
    setActiveExchangeData(undefined);
    setAutoPrint(false);
    setIsReceiptOpen(true);
  };

  const handleBillProcessed = (saleId: string) => {
    setReceiptType("sale");
    setActiveSaleId(saleId);
    setActiveReturnData(undefined);
    setActiveExchangeData(undefined);
    setAutoPrint(true);
    setIsReceiptOpen(true);
  };

  const handleReturnCompleted = (returnData: any) => {
    setReceiptType("return");
    setActiveSaleId(undefined);
    setActiveReturnData(returnData);
    setActiveExchangeData(undefined);
    setAutoPrint(true);
    setIsReceiptOpen(true);
  };

  const handleViewReturnReceipt = (returnData: any) => {
    setReceiptType("return");
    setActiveSaleId(undefined);
    setActiveReturnData({
      originalBillNumber: returnData.originalBillNumber,
      customerName: returnData.customerName,
      itemName: returnData.productName,
      refundAmount: returnData.refundAmount,
      reason: returnData.reason,
      refundMethod: returnData.refundMethod,
    });
    setActiveExchangeData(undefined);
    setAutoPrint(false);
    setIsReceiptOpen(true);
  };

  const handleExchangeCompleted = (exchangeData: any) => {
    setReceiptType("exchange");
    setActiveSaleId(undefined);
    setActiveReturnData(undefined);
    setActiveExchangeData(exchangeData);
    setAutoPrint(true);
    setIsReceiptOpen(true);
  };

  const handleViewExchangeReceipt = (exchangeData: any) => {
    setReceiptType("exchange");
    setActiveSaleId(undefined);
    setActiveReturnData(undefined);
    setActiveExchangeData({
      originalBillNumber: exchangeData.originalBillNumber,
      customerName: exchangeData.customerName,
      oldItemName: exchangeData.oldItemName,
      oldPrice: exchangeData.differenceAmount < 0 ? exchangeData.newItemPrice + Math.abs(exchangeData.differenceAmount) : exchangeData.newItemPrice - exchangeData.differenceAmount, // fallback estimate
      newItemName: exchangeData.newItemName,
      newPrice: exchangeData.newItemPrice || 0,
      difference: exchangeData.differenceAmount,
      type: exchangeData.type,
    });
    setAutoPrint(false);
    setIsReceiptOpen(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          <span className="text-sm font-mono text-slate-400">Restoring POS session...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView onViewReceipt={handleViewReceipt} onNavigateToView={setCurrentView} />;
      case "pos":
        return <POSBillingView onBillSaved={handleBillProcessed} />;
      case "inventory":
        return <InventoryView userRole={user.role} />;
      case "customers":
        return <CustomersView />;
      case "exchange":
        return <ExchangeView onExchangeCompleted={handleExchangeCompleted} />;
      case "returns":
        return <ReturnsView onReturnCompleted={handleReturnCompleted} />;
      case "history":
        return (
          <HistoryView
            onViewReceipt={handleViewReceipt}
            onViewReturnReceipt={handleViewReturnReceipt}
            onViewExchangeReceipt={handleViewExchangeReceipt}
          />
        );
      case "reports":
        return <ReportsView />;
      case "settings":
        return <SettingsView userRole={user.role} />;
      default:
        return <DashboardView onViewReceipt={handleViewReceipt} onNavigateToView={setCurrentView} />;
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex" id="pos-application-root">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        userRole={user.role}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0">
        <Topbar
          userName={user.name}
          userRole={user.role}
          onLogout={handleLogout}
        />
        
        {/* Dynamic Screen View Stage */}
        <main className="p-6 flex-grow overflow-y-auto max-h-[calc(100vh-6.5rem)]">
          {renderActiveView()}
        </main>

        {/* Global Website Footer with Developer Branding */}
        <footer className="bg-white border-t border-slate-200 py-3 px-8 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm shrink-0 select-none z-10">
          <p className="font-medium text-slate-400">
            &copy; {new Date().getFullYear()} <span className="font-semibold text-slate-600">Shoaib Ladies Garments</span>. All rights reserved.
          </p>
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-slate-500 font-semibold">
            <span>Designed & Developed by</span>
            <span className="font-bold text-blue-600 hover:text-blue-700 transition">Muhammad Danish Raza</span>
            <span className="text-slate-300">|</span>
            <span className="bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] px-2 py-0.5 rounded font-bold shadow-xs">
              0311-6596695, 0302-7117796
            </span>
          </p>
        </footer>
      </div>

      {/* Shared Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        saleId={activeSaleId}
        type={receiptType}
        autoPrint={autoPrint}
        returnData={activeReturnData}
        exchangeData={activeExchangeData}
      />
    </div>
  );
}
