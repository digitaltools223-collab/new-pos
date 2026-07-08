import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  writeBatch,
  DocumentData,
  Firestore
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

// Firebase configuration from firebase-applet-config.json
import firebaseAppletConfig from "../firebase-applet-config.json";

const isPlaceholder = (val: string | undefined) => !val || val === "Allahpakg6596";

const firebaseConfig = {
  projectId: !isPlaceholder(process.env.FIREBASE_PROJECT_ID) ? process.env.FIREBASE_PROJECT_ID! : firebaseAppletConfig.projectId,
  appId: !isPlaceholder(process.env.FIREBASE_APP_ID) ? process.env.FIREBASE_APP_ID! : firebaseAppletConfig.appId,
  apiKey: !isPlaceholder(process.env.FIREBASE_API_KEY) ? process.env.FIREBASE_API_KEY! : firebaseAppletConfig.apiKey,
  authDomain: !isPlaceholder(process.env.FIREBASE_AUTH_DOMAIN) ? process.env.FIREBASE_AUTH_DOMAIN! : firebaseAppletConfig.authDomain,
  storageBucket: !isPlaceholder(process.env.FIREBASE_STORAGE_BUCKET) ? process.env.FIREBASE_STORAGE_BUCKET! : firebaseAppletConfig.storageBucket,
  messagingSenderId: !isPlaceholder(process.env.FIREBASE_MESSAGING_SENDER_ID) ? process.env.FIREBASE_MESSAGING_SENDER_ID! : firebaseAppletConfig.messagingSenderId,
};

// Use specific database ID if provided in config
const FIRESTORE_DATABASE_ID = !isPlaceholder(process.env.FIRESTORE_DATABASE_ID) 
  ? process.env.FIRESTORE_DATABASE_ID! 
  : firebaseAppletConfig.firestoreDatabaseId;

const app = initializeApp(firebaseConfig);
const db_firestore = getFirestore(app, FIRESTORE_DATABASE_ID);

// Helper for generating IDs
function generateId(): string {
  return "idx_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now().toString(36);
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "cashier" | "manager";
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "Free Size";
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
  subtotal: number;
  discount: number;
  discountType: "fixed" | "percentage";
  discountValue: number;
  total: number;
  paymentMethod: "Cash" | "Card" | "EasyPaisa" | "JazzCash" | "Bank Transfer";
  amountReceived: number;
  changeAmount: number;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  price: number;
  qty: number;
  isReturned: boolean;
  isExchanged: boolean;
}

export interface Exchange {
  id: string;
  oldSaleItemId: string;
  newProductId: string;
  differenceAmount: number;
  type: "PAY" | "REFUND" | "EVEN";
  createdAt: string;
}

export interface ReturnRecord {
  id: string;
  saleItemId: string;
  refundAmount: number;
  reason: "Size Issue" | "Color Issue" | "Defective" | "Wrong Product" | "Other";
  refundMethod: "Cash" | "Bank" | "EasyPaisa" | "JazzCash";
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  movementType: "SALE" | "PURCHASE" | "EXCHANGE_IN" | "EXCHANGE_OUT" | "RETURN" | "MANUAL_ADJUSTMENT";
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId: string;
  createdAt: string;
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

class Database {
  constructor() {
    // Migration is already done or skipped if file is missing
  }

  async init() {
    // Initial check can be empty for client SDK
  }

  // --- Users Operations ---
  async getUsers(): Promise<User[]> {
    const snap = await getDocs(collection(db_firestore, "users"));
    return snap.docs.map(doc => doc.data() as User);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const q = query(collection(db_firestore, "users"), where("email", "==", email.toLowerCase()), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as User;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const docSnap = await getDoc(doc(db_firestore, "users", id));
    if (!docSnap.exists()) return undefined;
    return docSnap.data() as User;
  }

  async addUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    const id = generateId();
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db_firestore, "users", id), newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<Omit<User, "id" | "role" | "createdAt">>): Promise<User> {
    await updateDoc(doc(db_firestore, "users", id), updates as any);
    const updated = await this.getUserById(id);
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await deleteDoc(doc(db_firestore, "users", id));
  }

  // --- Products Operations ---
  async getProducts(): Promise<Product[]> {
    const snap = await getDocs(collection(db_firestore, "products"));
    return snap.docs.map(doc => doc.data() as Product);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const docSnap = await getDoc(doc(db_firestore, "products", id));
    if (!docSnap.exists()) return undefined;
    return docSnap.data() as Product;
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const q = query(collection(db_firestore, "products"), where("barcode", "==", barcode), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as Product;
  }

  async generateNextBarcode(): Promise<string> {
    const products = await this.getProducts();
    const barcodes = products
      .map((p) => p.barcode)
      .filter((b) => b.startsWith("GAR-"));
    if (barcodes.length === 0) return "GAR-000001";
    const maxNum = Math.max(
      ...barcodes.map((b) => {
        const num = parseInt(b.split("-")[1], 10);
        return isNaN(num) ? 0 : num;
      })
    );
    return `GAR-${(maxNum + 1).toString().padStart(6, "0")}`;
  }

  async addProduct(prod: Omit<Product, "id" | "barcode" | "createdAt"> & { barcode?: string }): Promise<Product> {
    const finalBarcode = prod.barcode && prod.barcode.trim() !== "" 
      ? prod.barcode.trim() 
      : await this.generateNextBarcode();

    const existing = await this.getProductByBarcode(finalBarcode);
    if (existing) throw new Error(`Barcode already exists.`);

    const id = generateId();
    const newProd: Product = {
      ...prod,
      barcode: finalBarcode,
      id,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db_firestore, "products", id), newProd);
    await this.addStockMovement(id, "PURCHASE", newProd.stock, 0, newProd.stock, "MANUAL_ADD");
    return newProd;
  }

  async updateProduct(id: string, updates: Partial<Omit<Product, "id" | "createdAt">>): Promise<Product> {
    const current = await this.getProductById(id);
    if (!current) throw new Error("Product not found");

    if (updates.barcode && updates.barcode !== current.barcode) {
      const existing = await this.getProductByBarcode(updates.barcode);
      if (existing) throw new Error(`Barcode already exists.`);
    }

    if (updates.stock !== undefined && updates.stock !== current.stock) {
      const diff = updates.stock - current.stock;
      await this.addStockMovement(id, "MANUAL_ADJUSTMENT", diff, current.stock, updates.stock, "MANUAL_ADJUST");
    }

    await updateDoc(doc(db_firestore, "products", id), updates as any);
    const updated = await this.getProductById(id);
    if (!updated) throw new Error("Product not found");
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(db_firestore, "products", id));
  }

  // --- Customers Operations ---
  async getCustomers(): Promise<Customer[]> {
    const snap = await getDocs(collection(db_firestore, "customers"));
    return snap.docs.map(doc => doc.data() as Customer);
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const q = query(collection(db_firestore, "customers"), where("phone", "==", phone.trim()), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as Customer;
  }

  async getOrCreateCustomer(name: string, phone: string, address: string = ""): Promise<Customer> {
    const existing = await this.getCustomerByPhone(phone);
    if (existing) {
      if (name && name !== "Walk-In Customer" && existing.name === "Walk-In Customer") {
        await updateDoc(doc(db_firestore, "customers", existing.id), { name, address: address || existing.address });
        existing.name = name;
        if (address) existing.address = address;
      }
      return existing;
    }

    const id = generateId();
    const newCust: Customer = {
      id,
      name: name || "Walk-In Customer",
      phone: phone,
      address: address || "N/A",
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db_firestore, "customers", id), newCust);
    return newCust;
  }

  // --- Sales Operations ---
  async getSales(): Promise<Sale[]> {
    const snap = await getDocs(collection(db_firestore, "sales"));
    return snap.docs.map(doc => doc.data() as Sale);
  }

  async getSaleItems(saleId?: string): Promise<SaleItem[]> {
    if (saleId) {
      const q = query(collection(db_firestore, "saleItems"), where("saleId", "==", saleId));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as SaleItem);
    }
    const snap = await getDocs(collection(db_firestore, "saleItems"));
    return snap.docs.map(doc => doc.data() as SaleItem);
  }

  async generateBillNumber(): Promise<string> {
    const sales = await this.getSales();
    const count = sales.length + 1;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `SLG-${dateStr}-${count.toString().padStart(4, "0")}`;
  }

  async createSale(saleData: any): Promise<Sale> {
    const customer = await this.getOrCreateCustomer(saleData.customerName, saleData.customerPhone, saleData.customerAddress);
    const saleId = generateId();
    const billNum = await this.generateBillNumber();
    const batch = writeBatch(db_firestore);

    for (const item of saleData.items) {
      const prod = await this.getProductById(item.productId);
      if (!prod) continue;
      const prevStock = prod.stock;
      const newStock = prod.stock - item.qty;
      batch.update(doc(db_firestore, "products", prod.id), { stock: newStock });
      const itemId = generateId();
      batch.set(doc(db_firestore, "saleItems", itemId), {
        id: itemId, saleId, productId: item.productId, qty: item.qty, price: item.price, isReturned: false, isExchanged: false,
      });
      const mId = generateId();
      batch.set(doc(db_firestore, "stockMovements", mId), {
        id: mId, productId: prod.id, movementType: "SALE", quantity: -item.qty, previousStock: prevStock, newStock: newStock, referenceId: saleId, createdAt: new Date().toISOString(),
      });
    }

    const sale: Sale = {
      id: saleId, billNumber: billNum, customerId: customer.id, subtotal: saleData.subtotal, 
      discount: saleData.discount, discountType: saleData.discountType, discountValue: saleData.discountValue, 
      total: saleData.total, paymentMethod: saleData.paymentMethod, amountReceived: saleData.amountReceived, 
      changeAmount: saleData.changeAmount, createdAt: new Date().toISOString(),
    };
    batch.set(doc(db_firestore, "sales", saleId), sale);
    await batch.commit();
    return sale;
  }

  // --- Exchange Operations ---
  async getExchanges(): Promise<Exchange[]> {
    const snap = await getDocs(collection(db_firestore, "exchanges"));
    return snap.docs.map(doc => doc.data() as Exchange);
  }

  async createExchange(exchangeData: any): Promise<Exchange> {
    const oldItem = (await this.getSaleItems()).find(i => i.id === exchangeData.oldSaleItemId);
    if (!oldItem) throw new Error("Item not found");

    const newProduct = await this.getProductById(exchangeData.newProductId);
    if (!newProduct) throw new Error("New product not found");

    const diff = (newProduct.salePrice * exchangeData.newQty) - oldItem.price;
    const exchangeId = generateId();
    const batch = writeBatch(db_firestore);

    const oldProduct = await this.getProductById(oldItem.productId);
    if (oldProduct) {
      batch.update(doc(db_firestore, "products", oldProduct.id), { stock: oldProduct.stock + 1 });
    }

    batch.update(doc(db_firestore, "products", newProduct.id), { stock: newProduct.stock - exchangeData.newQty });
    batch.update(doc(db_firestore, "saleItems", oldItem.id), { isExchanged: true });

    const exchange: Exchange = {
      id: exchangeId, oldSaleItemId: oldItem.id, newProductId: newProduct.id, 
      differenceAmount: diff, type: diff > 0 ? "PAY" : diff < 0 ? "REFUND" : "EVEN", createdAt: new Date().toISOString()
    };
    batch.set(doc(db_firestore, "exchanges", exchangeId), exchange);
    await batch.commit();
    return exchange;
  }

  // --- Return Operations ---
  async getReturns(): Promise<ReturnRecord[]> {
    const snap = await getDocs(collection(db_firestore, "returns"));
    return snap.docs.map(doc => doc.data() as ReturnRecord);
  }

  async createReturn(returnData: any): Promise<ReturnRecord> {
    const item = (await this.getSaleItems()).find(i => i.id === returnData.saleItemId);
    if (!item) throw new Error("Item not found");
    const returnId = generateId();
    const batch = writeBatch(db_firestore);
    const product = await this.getProductById(item.productId);
    if (product) {
      batch.update(doc(db_firestore, "products", product.id), { stock: product.stock + item.qty });
    }
    batch.update(doc(db_firestore, "saleItems", item.id), { isReturned: true });
    const ret: ReturnRecord = {
      id: returnId, saleItemId: item.id, refundAmount: item.price * item.qty, reason: returnData.reason, 
      refundMethod: returnData.refundMethod, createdAt: new Date().toISOString()
    };
    batch.set(doc(db_firestore, "returns", returnId), ret);
    await batch.commit();
    return ret;
  }

  // --- Settings Operation ---
  async getSettings(): Promise<Settings> {
    const docSnap = await getDoc(doc(db_firestore, "app", "settings"));
    return docSnap.exists() ? (docSnap.data() as Settings) : {
      shopName: "Shoaib Ladies Garments", address: "Karachi", phone: "", logo: "",
      saleFooter: "Thanks", returnFooter: "", exchangeFooter: "", exchangePolicy: "",
      showPolicyToggle: true, exchangeDays: 3, returnDays: 3, ownerName: "Shoaib Hassan",
    };
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    await setDoc(doc(db_firestore, "app", "settings"), updated);
    return updated;
  }

  async addStockMovement(productId: string, type: string, qty: number, prev: number, next: number, ref: string) {
    const id = generateId();
    await setDoc(doc(db_firestore, "stockMovements", id), {
      id, productId, movementType: type, quantity: qty, previousStock: prev, newStock: next, referenceId: ref, createdAt: new Date().toISOString(),
    });
  }
}

export const db = new Database();
