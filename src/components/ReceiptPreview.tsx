import React from "react";
import { Settings } from "../types";

interface ReceiptPreviewProps {
  type: "sale" | "return" | "exchange";
  saleDetails?: {
    sale: {
      billNumber: string;
      createdAt: string;
      cashierName?: string;
      customerName: string;
      customerPhone: string;
      customerAddress?: string;
      subtotal: number;
      discount: number;
      discountType?: "fixed" | "percentage";
      discountValue?: number;
      total: number;
      paymentMethod: string;
      amountReceived: number;
      changeAmount: number;
    };
    items: Array<{
      id: string;
      name: string;
      size: string;
      color: string;
      qty: number;
      price: number;
    }>;
  } | null;
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
  paperWidth: "58" | "80";
  settings: Settings;
}

export default function ReceiptPreview({
  type,
  saleDetails,
  exchangeData,
  returnData,
  paperWidth,
  settings,
}: ReceiptPreviewProps) {
  const is58 = paperWidth === "58";

  // Using a clean, highly-legible system-sans font stack instead of pixelated fonts.
  // Using pure black (#000000) for all text and lines to prevent dithering (dot patterns) on thermal printers.
  return (
    <div
      id="receipt-preview-content"
      className="bg-white text-black p-4 shadow-md text-[12px] relative leading-snug border border-black print:border-none print:shadow-none select-none mx-auto antialiased"
      style={{
        width: is58 ? "52mm" : "74mm", // Safe margin to fit perfectly on standard thermal paper rolls (58mm/80mm) without cutting off text
        boxSizing: "border-box",
        minHeight: "95mm",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* Watermark Stamps (Bold and high contrast for printing) */}
      {type === "return" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 overflow-hidden">
          <div 
            className="text-red-600 font-extrabold uppercase tracking-widest text-center"
            style={{
              fontSize: is58 ? "26px" : "34px",
              border: "5px solid #ef4444",
              padding: "8px 16px",
              transform: "rotate(-20deg)",
              opacity: 0.85,
              borderRadius: "8px",
            }}
          >
            RETURNED
          </div>
        </div>
      )}

      {type === "exchange" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 overflow-hidden">
          <div 
            className="text-blue-600 font-extrabold uppercase tracking-widest text-center"
            style={{
              fontSize: is58 ? "26px" : "34px",
              border: "5px solid #2563eb",
              padding: "8px 16px",
              transform: "rotate(-20deg)",
              opacity: 0.85,
              borderRadius: "8px",
            }}
          >
            EXCHANGE
          </div>
        </div>
      )}

      {/* Shop Info Block */}
      <div className="text-center pb-2">
        {settings.logo && (
          <img
            src={settings.logo}
            alt="Shop Logo"
            className="max-h-24 max-w-[90%] mx-auto mb-2 filter grayscale"
          />
        )}
        <h2 className="text-[14px] font-bold uppercase tracking-wide text-black break-words whitespace-normal">
          {settings.shopName}
        </h2>
        <p className="text-[11px] text-black font-semibold leading-normal mt-0.5 max-w-[95%] mx-auto break-words whitespace-normal">
          {settings.address}
        </p>
        <p className="text-[11px] text-black font-semibold mt-0.5 break-words whitespace-normal">
          Ph: {settings.phone}
        </p>
      </div>

      {/* Crisp pure black dashed separator */}
      <div className="border-t-2 border-dashed border-black my-2" />

      {/* Sale Receipt Template */}
      {type === "sale" && saleDetails && (
        <div>
          <div className="text-center font-bold uppercase tracking-wider mb-2.5 text-[13px] text-black">
            * SALE RECEIPT *
          </div>

          <div className="space-y-1 text-[11px] text-black font-semibold">
            <div className="flex flex-col gap-0.5 border-b border-dashed border-black pb-1.5 mb-1.5">
              <div className="flex justify-between">
                <span>Bill #:</span>
                <span className="font-extrabold">{saleDetails.sale.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Owner:</span>
                <span className="font-extrabold">{settings.ownerName || "Shoaib Hassan"}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span>Date: {new Date(saleDetails.sale.createdAt).toLocaleDateString()}</span>
              <span>Time: {new Date(saleDetails.sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="pt-1.5 border-t border-dashed border-black mt-1.5">
              <p className="font-bold text-black text-[11.5px] break-words whitespace-normal">
                Customer: {saleDetails.sale.customerName}
              </p>
              {saleDetails.sale.customerPhone && saleDetails.sale.customerPhone !== "0000000000" && (
                <p>Phone: {saleDetails.sale.customerPhone}</p>
              )}
              {saleDetails.sale.customerAddress && (
                <p className="break-words whitespace-normal">Add: {saleDetails.sale.customerAddress}</p>
              )}
            </div>
          </div>

          <div className="border-t border-dashed border-black my-2" />

          {/* Items Table */}
          <table className="w-full text-left text-[11px] text-black font-semibold border-b border-dashed border-black pb-1 mb-2 table-fixed">
            <colgroup>
              <col style={{ width: "42%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "22%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-black font-bold text-black text-[11.5px]">
                <th className="py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Price</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-black">
              {saleDetails.items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className={`py-1.5 pr-1 ${is58 ? "max-w-[120px]" : "max-w-[190px]"} break-words`}>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-[10px] text-black font-medium">
                      Sz: {item.size} | Clr: {item.color}
                    </div>
                  </td>
                  <td className="text-center py-1.5">{item.qty}</td>
                  <td className="text-right py-1.5">{item.price}</td>
                  <td className="text-right py-1.5">{item.qty * item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="space-y-1 text-right text-[11px] text-black font-semibold border-b border-dashed border-black pb-1.5 mb-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>Rs {saleDetails.sale.subtotal.toLocaleString()}</span>
            </div>
            {saleDetails.sale.discount > 0 && (
              <div className="flex justify-between text-black font-bold">
                <span>
                  Discount (
                  {saleDetails.sale.discountType === "percentage"
                    ? `${saleDetails.sale.discountValue}%`
                    : "Fixed"}
                  ):
                </span>
                <span>-Rs {saleDetails.sale.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[13px] pt-1.5 border-t border-dashed border-black text-black">
              <span>GRAND TOTAL:</span>
              <span>Rs {saleDetails.sale.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-1 text-[11px] text-black font-semibold border-b border-dashed border-black pb-1.5 mb-2.5">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span>{saleDetails.sale.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Received:</span>
              <span>Rs {saleDetails.sale.amountReceived.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-black text-[11.5px]">
              <span>Change Returned:</span>
              <span>Rs {saleDetails.sale.changeAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Customer Footer Note */}
          <div className="text-center text-[10px] text-black font-bold italic px-1 mb-3 leading-snug whitespace-pre-line">
            {settings.saleFooter}
          </div>
        </div>
      )}

      {/* Return Receipt Template */}
      {type === "return" && returnData && (
        <div>
          <div className="text-center font-bold uppercase tracking-wider mb-2.5 text-[13px] text-red-700">
            * RETURN RECEIPT *
          </div>

          <div className="space-y-1 text-[11px] text-black font-semibold">
            <div className="flex flex-col gap-0.5 border-b border-dashed border-black pb-1.5 mb-1.5">
              <div className="flex justify-between">
                <span>Against Bill #:</span>
                <span className="font-extrabold">{returnData.originalBillNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Owner:</span>
                <span className="font-extrabold">{settings.ownerName || "Shoaib Hassan"}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span>Date: {new Date().toLocaleDateString()}</span>
              <span>Time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <p className="font-bold text-black mt-2 break-words whitespace-normal">
              Customer: {returnData.customerName}
            </p>
          </div>

          <div className="border-t border-dashed border-black my-2" />

          {/* Return Summary */}
          <div className="space-y-1.5 text-[11px] text-black font-semibold border-b border-dashed border-black pb-1.5 mb-2.5">
            <div className="font-bold text-black text-[11.5px]">Returned Garment:</div>
            <div className="pl-2 border-l-2 border-black p-1 text-black font-bold bg-slate-50 break-words whitespace-normal">
              {returnData.itemName}
            </div>
            <div className="flex justify-between pt-1">
              <span>Return Reason:</span>
              <span className="font-bold text-black break-words whitespace-normal">{returnData.reason}</span>
            </div>
            <div className="flex justify-between">
              <span>Refund Mode:</span>
              <span>{returnData.refundMethod}</span>
            </div>
            <div className="flex justify-between font-bold text-[13px] text-black pt-1.5 border-t border-dashed border-black">
              <span>REFUNDED VALUE:</span>
              <span>Rs {returnData.refundAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-center text-[10px] text-black font-bold italic px-1 mb-3 leading-snug whitespace-pre-line">
            {settings.returnFooter}
          </div>
        </div>
      )}

      {/* Exchange Receipt Template */}
      {type === "exchange" && exchangeData && (
        <div>
          <div className="text-center font-bold uppercase tracking-wider mb-2.5 text-[13px] text-blue-700">
            * EXCHANGE RECEIPT *
          </div>

          <div className="space-y-1 text-[11px] text-black font-semibold">
            <div className="flex flex-col gap-0.5 border-b border-dashed border-black pb-1.5 mb-1.5">
              <div className="flex justify-between">
                <span>Against Bill #:</span>
                <span className="font-extrabold">{exchangeData.originalBillNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Owner:</span>
                <span className="font-extrabold">{settings.ownerName || "Shoaib Hassan"}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span>Date: {new Date().toLocaleDateString()}</span>
              <span>Time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <p className="font-bold text-black mt-2 break-words whitespace-normal">
              Customer: {exchangeData.customerName}
            </p>
          </div>

          <div className="border-t border-dashed border-black my-2" />

          {/* Exchange Summary */}
          <div className="space-y-2 text-[11px] text-black font-semibold border-b border-dashed border-black pb-1.5 mb-2">
            <div>
              <div className="font-bold text-black text-[11.5px]">1. Old Item Returned:</div>
              <div className="pl-2 border-l border-black text-black font-bold break-words whitespace-normal">{exchangeData.oldItemName}</div>
              <div className="text-right text-black font-bold text-[10px] mt-0.5">
                Value Credit: Rs {exchangeData.oldPrice.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="font-bold text-black text-[11.5px]">2. New Item Issued:</div>
              <div className="pl-2 border-l border-black text-black font-bold break-words whitespace-normal">{exchangeData.newItemName}</div>
              <div className="text-right text-black font-bold text-[10px] mt-0.5">
                New Price: Rs {exchangeData.newPrice.toLocaleString()}
              </div>
            </div>

            <div className="border-t border-dashed border-black pt-1.5 space-y-1">
              <div className="flex justify-between text-black">
                <span>Value Difference:</span>
                <span>Rs {exchangeData.difference.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-[12px] pt-1.5 border-t border-dashed border-black text-black">
                <span>
                  {exchangeData.type === "PAY"
                    ? "CUSTOMER PAYS:"
                    : exchangeData.type === "REFUND"
                    ? "REFUND CUSTOMER:"
                    : "EVEN EXCHANGE:"}
                </span>
                <span className="font-extrabold text-black">
                  Rs {Math.abs(exchangeData.difference).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {settings.showPolicyToggle && settings.exchangePolicy && (
            <div className="border-b border-dashed border-black pb-1.5 mb-2 text-[10px] text-black font-semibold leading-normal">
              <div className="font-bold uppercase text-[10px] tracking-wider mb-0.5 text-black">
                Exchange Policy:
              </div>
              <div className="whitespace-pre-line leading-snug break-words">
                {settings.exchangePolicy}
              </div>
            </div>
          )}

          <div className="text-center text-[10px] text-black font-bold italic px-1 mb-3 leading-snug whitespace-pre-line">
            {settings.exchangeFooter}
          </div>
        </div>
      )}

      {/* Developer Branding and Signature (High Contrast, Bold, with Contact Numbers) */}
      <div className="text-center border-t-2 border-dashed border-black pt-2.5 text-[11px] text-black">
        <p className="font-extrabold uppercase tracking-widest text-[11.5px]">THANK YOU FOR YOUR VISIT</p>
        <div className="mt-2 text-[10px] border-t border-dashed border-black pt-2 leading-relaxed select-none uppercase font-bold">
          <p className="tracking-wide">Powered & Developed By:</p>
          <p className="text-[11.5px] font-extrabold tracking-widest text-black mt-0.5">Muhammad Danish Raza</p>
          <div className="flex flex-col items-center gap-0.5 mt-1.5 font-sans text-[11.5px] font-extrabold text-black tracking-wider leading-tight">
            <span>0311-6596695</span>
            <span>0302-7117796</span>
          </div>
        </div>
      </div>
    </div>
  );
}
