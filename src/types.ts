export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "cashier" | "manager";
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

export type ProductSize = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "Free Size";

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  size: ProductSize;
  color: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  image: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  discount: number;
  discountType: "fixed" | "percentage";
  discountValue: number;
  total: number;
  paymentMethod: "Cash" | "Card" | "EasyPaisa" | "JazzCash" | "Bank Transfer";
  amountReceived: number;
  changeAmount: number;
  itemsCount: number;
  totalQty: number;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  qty: number;
  price: number;
  isReturned: boolean;
  isExchanged: boolean;
  // Hydrated fields
  name?: string;
  barcode?: string;
  size?: string;
  color?: string;
}

export interface Exchange {
  id: string;
  oldSaleItemId: string;
  newProductId: string;
  differenceAmount: number;
  type: "PAY" | "REFUND" | "EVEN";
  createdAt: string;
  // Hydrated fields
  oldItemName?: string;
  newItemName?: string;
  originalBillNumber?: string;
  customerName?: string;
}

export interface ReturnRecord {
  id: string;
  saleItemId: string;
  refundAmount: number;
  reason: "Size Issue" | "Color Issue" | "Defective" | "Wrong Product" | "Other";
  refundMethod: "Cash" | "Bank" | "EasyPaisa" | "JazzCash";
  createdAt: string;
  // Hydrated fields
  productName?: string;
  originalBillNumber?: string;
  customerName?: string;
}

export interface Settings {
  shopName: string;
  address: string;
  phone: string;
  logo: string;
  saleFooter: string;
  returnFooter: string;
  exchangeFooter: string;
  exchangePolicy: string;
  showPolicyToggle: boolean;
  exchangeDays: number;
  returnDays: number;
  ntn?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  ownerName?: string;
}

export interface ReportsSummary {
  totalBills: number;
  todayBills: number;
  grossSales: number;
  todayGrossSales: number;
  discount: number;
  todayDiscount: number;
  netSales: number;
  todayNetSales: number;
  lowStockCount: number;
  totalProfit: number;
  todayProfit: number;
}

export interface ProductPerformance {
  topSelling: { qty: number; name: string; barcode: string; salePrice: number }[];
  leastSelling: { qty: number; name: string; barcode: string; salePrice: number }[];
}

export interface ExchangeAnalytics {
  totalExchanges: number;
  amountCollected: number;
  amountRefunded: number;
}

export interface ReturnAnalytics {
  totalReturns: number;
  refundValue: number;
  reasonsBreakdown: { reason: string; count: number }[];
}

export interface ReportsResponse {
  summary: ReportsSummary;
  productPerformance: ProductPerformance;
  exchangeAnalytics: ExchangeAnalytics;
  returnAnalytics: ReturnAnalytics;
}
