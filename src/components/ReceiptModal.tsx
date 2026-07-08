import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Printer, X, FileText } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Settings } from "../types";
import ReceiptPreview from "./ReceiptPreview";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId?: string;
  type: "sale" | "return" | "exchange";
  autoPrint?: boolean; // Automatic printing trigger prop
  exchangeData?: {
    originalBillNumber: string;
    customerName: string;
    customerPhone?: string;
    oldItemName: string;
    oldPrice: number;
    newItemName: string;
    newPrice: number;
    difference: number;
    type: "PAY" | "REFUND" | "EVEN";
  };
  returnData?: {
    originalBillNumber: string;
    customerName: string;
    customerPhone?: string;
    itemName: string;
    refundAmount: number;
    reason: string;
    refundMethod: string;
  };
}

export default function ReceiptModal({
  isOpen,
  onClose,
  saleId,
  type,
  autoPrint = false,
  exchangeData,
  returnData,
}: ReceiptModalProps) {
  const [saleDetails, setSaleDetails] = useState<any>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [paperWidth, setPaperWidth] = useState<"58" | "80">("80");
  const [loading, setLoading] = useState(false);
  const printTriggered = useRef(false);

  useEffect(() => {
    if (isOpen) {
      printTriggered.current = false;
      fetchSettings();
      if (saleId && type === "sale") {
        fetchSaleDetails();
      } else {
        setSaleDetails(null);
      }
    } else {
      setSaleDetails(null);
    }
  }, [isOpen, saleId, type]);

  // Handle Automatic Printing once details are fully loaded
  useEffect(() => {
    if (isOpen && autoPrint && !loading && !printTriggered.current) {
      const isSaleReady = type === "sale" ? !!saleDetails : true;
      const isReturnReady = type === "return" ? !!returnData : true;
      const isExchangeReady = type === "exchange" ? !!exchangeData : true;

      if (isSaleReady && isReturnReady && isExchangeReady && settings) {
        printTriggered.current = true;
        // Minor timeout to let React finish paint of thermal container
        const timer = setTimeout(() => {
          handlePrint();
        }, 500); 
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoPrint, loading, saleDetails, returnData, exchangeData, settings, type]);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch<Settings>("/api/settings");
      setSettings(data);
    } catch (err) {
      console.error("Error loading settings", err);
      // Ensure settings is at least an empty object to satisfy the ready check
      setSettings({} as any);
    }
  };

  const fetchSaleDetails = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>(`/api/bills/${saleId}`);
      setSaleDetails(data);
    } catch (err) {
      console.error("Error fetching sale details", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    console.log("PRINT BUTTON CLICKED");
    
    // Add print helper class to document body to allow standard styling exclusion
    document.body.classList.add("printing-receipt");

    const printableArea = document.getElementById("printable-receipt");
    if (printableArea) {
      console.log("RECEIPT RENDERED");
    } else {
      console.warn("RECEIPT NOT FOUND IN DOM!");
    }

    const originalAfterPrint = window.onafterprint;
    window.onafterprint = () => {
      document.body.classList.remove("printing-receipt");
      onClose();
      window.onafterprint = originalAfterPrint;
    };

    console.log("CALLING WINDOW.PRINT");
    setTimeout(() => {
      try {
        window.print();
        // Fallback cleanup in case onafterprint is delayed on some browsers
        setTimeout(() => {
          document.body.classList.remove("printing-receipt");
        }, 1000);
      } catch (err) {
        console.error("CRITICAL ERROR DURING WINDOW.PRINT():", err);
        document.body.classList.remove("printing-receipt");
      }
    }, 50);
  };

  if (!isOpen) return null;

  const currentSettings = settings || {
    shopName: "Shoaib Ladies Garments",
    address: "Main Garments Market, Shop #24, Karachi, Pakistan",
    phone: "+92 300 1234567",
    logo: "",
    saleFooter: "Thank You For Shopping at Shoaib Ladies Garments!",
    returnFooter: "Returns only accepted within 3 days with Brand Tag attached.",
    exchangeFooter: "Exchanges within 3 days are subject to price adjustments.",
    exchangePolicy: "1. Exchange allowed within 3 days.\n2. Product must be unused and tags intact.\n3. Original bill receipt is mandatory.",
    showPolicyToggle: true,
    exchangeDays: 3,
    returnDays: 3,
  };

  return (
    <>
      {!autoPrint && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col my-8">
            {/* Header Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-500" size={18} />
                <h3 className="font-display font-semibold text-slate-800">
                  Thermal Receipt Preview
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Paper Width Selector */}
                <div className="bg-slate-100 rounded-lg p-0.5 border border-slate-200 flex">
                  <button
                    onClick={() => setPaperWidth("58")}
                    className={`px-3 py-1 text-xs font-mono font-medium rounded transition-all duration-150 ${
                      paperWidth === "58"
                        ? "bg-blue-600 text-white shadow-sm font-semibold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    58mm
                  </button>
                  <button
                    onClick={() => setPaperWidth("80")}
                    className={`px-3 py-1 text-xs font-mono font-medium rounded transition-all duration-150 ${
                      paperWidth === "80"
                        ? "bg-blue-600 text-white shadow-sm font-semibold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    80mm
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Receipt Preview Container */}
            <div className="p-6 bg-slate-50 flex-grow flex justify-center overflow-y-auto max-h-[60vh] border-b border-slate-100">
              {loading ? (
                <div className="flex items-center justify-center h-48 w-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <ReceiptPreview
                  type={type}
                  saleDetails={saleDetails}
                  exchangeData={exchangeData}
                  returnData={returnData}
                  paperWidth={paperWidth}
                  settings={currentSettings}
                />
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition cursor-pointer shadow-sm"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                disabled={type === "sale" && !saleDetails}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Printer size={16} />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render the printable thermal receipt directly on document.body using Portal */}
      {isOpen && 
        createPortal(
          <div id="printable-receipt" style={{ width: paperWidth === "58" ? "58mm" : "80mm" }}>
            <ReceiptPreview
              type={type}
              saleDetails={saleDetails}
              exchangeData={exchangeData}
              returnData={returnData}
              paperWidth={paperWidth}
              settings={currentSettings}
            />
          </div>,
          document.body
        )
      }
    </>
  );
}
