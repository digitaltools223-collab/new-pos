import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";

// Firebase configuration from firebase-applet-config.json
import firebaseAppletConfig from "../firebase-applet-config.json" assert { type: "json" };

const isPlaceholder = (val: string | undefined) => !val || val === "Allahpakg6596";

// Initialize Firebase Admin
if (!getApps().length) {
  const projectId = !isPlaceholder(process.env.FIREBASE_PROJECT_ID) ? process.env.FIREBASE_PROJECT_ID! : firebaseAppletConfig.projectId;
  const databaseId = !isPlaceholder(process.env.FIRESTORE_DATABASE_ID) ? process.env.FIRESTORE_DATABASE_ID! : firebaseAppletConfig.firestoreDatabaseId;

  const serviceAccount = {
    projectId: projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (serviceAccount.clientEmail && serviceAccount.privateKey) {
    initializeApp({
      credential: cert(serviceAccount as any),
    }, "default"); // Note: second arg is name, not databaseId
  } else {
    initializeApp({
      projectId: projectId,
    });
  }
}

// Initialize Firestore with the correct database ID
const targetDbId = !isPlaceholder(process.env.FIRESTORE_DATABASE_ID) ? process.env.FIRESTORE_DATABASE_ID! : firebaseAppletConfig.firestoreDatabaseId;
const db_firestore = targetDbId && targetDbId !== "(default)" ? getFirestore(targetDbId) : getFirestore();

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
  async init() {
    try {
      // Just check connection
      await db_firestore.collection("app").doc("health").set({ lastCheck: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error("Firestore initialization check failed:", err);
    }
  }

  // --- Users Operations ---
  async getUsers(): Promise<User[]> {
    const snap = await db_firestore.collection("users").get();
    return snap.docs.map(doc => doc.data() as User);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const snap = await db_firestore.collection("users").where("email", "==", email.toLowerCase()).limit(1).get();
    if (snap.empty) return undefined;
    return snap.docs[0].data() as User;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const docSnap = await db_firestore.collection("users").doc(id).get();
    if (!docSnap.exists) return undefined;
    return docSnap.data() as User;
  }

  async addUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    const id = generateId();
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date().toISOString(),
    };
    await db_firestore.collection("users").doc(id).set(newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<Omit<User, "id" | "role" | "createdAt">>): Promise<User> {
    await db_firestore.collection("users").doc(id).update(updates);
    const updated = await this.getUserById(id);
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db_firestore.collection("users").doc(id).delete();
  }

  // --- Products Operations ---
  async getProducts(): Promise<Product[]> {
    const snap = await db_firestore.collection("products").get();
    return snap.docs.map(doc => doc.data() as Product);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const docSnap = await db_firestore.collection("products").doc(id).get();
    if (!docSnap.exists) return undefined;
    return docSnap.data() as Product;
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const snap = await db_firestore.collection("products").where("barcode", "==", barcode).limit(1).get();
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

    await db_firestore.collection("products").doc(id).set(newProd);
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

    await db_firestore.collection("products").doc(id).update(updates);
    const updated = await this.getProductById(id);
    if (!updated) throw new Error("Product not found");
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await db_firestore.collection("products").doc(id).delete();
  }

  // --- Customers Operations ---
  async getCustomers(): Promise<Customer[]> {
    const snap = await db_firestore.collection("customers").get();
    return snap.docs.map(doc => doc.data() as Customer);
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const snap = await db_firestore.collection("customers").where("phone", "==", phone.trim()).limit(1).get();
    if (snap.empty) return undefined;
    return snap.docs[0].data() as Customer;
  }

  async getOrCreateCustomer(name: string, phone: string, address: string = ""): Promise<Customer> {
    const existing = await this.getCustomerByPhone(phone);
    if (existing) {
      if (name && name !== "Walk-In Customer" && existing.name === "Walk-In Customer") {
        await db_firestore.collection("customers").doc(existing.id).update({ name, address: address || existing.address });
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
    await db_firestore.collection("customers").doc(id).set(newCust);
    return newCust;
  }

  // --- Sales Operations ---
  async getSales(): Promise<Sale[]> {
    const snap = await db_firestore.collection("sales").get();
    return snap.docs.map(doc => doc.data() as Sale);
  }

  async getSaleItems(saleId?: string): Promise<SaleItem[]> {
    if (saleId) {
      const snap = await db_firestore.collection("saleItems").where("saleId", "==", saleId).get();
      return snap.docs.map(doc => doc.data() as SaleItem);
    }
    const snap = await db_firestore.collection("saleItems").get();
    return snap.docs.map(doc => doc.data() as SaleItem);
  }

  async generateBillNumber(): Promise<string> {
    const snap = await db_firestore.collection("sales").get();
    const count = snap.size + 1;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `SLG-${dateStr}-${count.toString().padStart(4, "0")}`;
  }

  async createSale(saleData: any): Promise<Sale> {
    const customer = await this.getOrCreateCustomer(saleData.customerName, saleData.customerPhone, saleData.customerAddress);
    const saleId = generateId();
    const billNum = await this.generateBillNumber();
    const batch = db_firestore.batch();

    for (const item of saleData.items) {
      const prodSnap = await db_firestore.collection("products").doc(item.productId).get();
      if (!prodSnap.exists) continue;
      const prod = prodSnap.data() as Product;
      const prevStock = prod.stock;
      const newStock = prod.stock - item.qty;
      batch.update(db_firestore.collection("products").doc(prod.id), { stock: newStock });
      const itemId = generateId();
      batch.set(db_firestore.collection("saleItems").doc(itemId), {
        id: itemId, saleId, productId: item.productId, qty: item.qty, price: item.price, isReturned: false, isExchanged: false,
      });
      const mId = generateId();
      batch.set(db_firestore.collection("stockMovements").doc(mId), {
        id: mId, productId: prod.id, movementType: "SALE", quantity: -item.qty, previousStock: prevStock, newStock: newStock, referenceId: saleId, createdAt: new Date().toISOString(),
      });
    }

    const sale: Sale = {
      id: saleId, billNumber: billNum, customerId: customer.id, subtotal: saleData.subtotal, 
      discount: saleData.discount, discountType: saleData.discountType, discountValue: saleData.discountValue, 
      total: saleData.total, paymentMethod: saleData.paymentMethod, amountReceived: saleData.amountReceived, 
      changeAmount: saleData.changeAmount, createdAt: new Date().toISOString(),
    };
    batch.set(db_firestore.collection("sales").doc(saleId), sale);
    await batch.commit();
    return sale;
  }

  // --- Exchange Operations ---
  async getExchanges(): Promise<Exchange[]> {
    const snap = await db_firestore.collection("exchanges").get();
    return snap.docs.map(doc => doc.data() as Exchange);
  }

  async createExchange(exchangeData: any): Promise<Exchange> {
    const items = await this.getSaleItems();
    const oldItem = items.find(i => i.id === exchangeData.oldSaleItemId);
    if (!oldItem) throw new Error("Item not found");

    const newProductSnap = await db_firestore.collection("products").doc(exchangeData.newProductId).get();
    if (!newProductSnap.exists) throw new Error("New product not found");
    const newProduct = newProductSnap.data() as Product;

    const diff = (newProduct.salePrice * exchangeData.newQty) - oldItem.price;
    const exchangeId = generateId();
    const batch = db_firestore.batch();

    const oldProductSnap = await db_firestore.collection("products").doc(oldItem.productId).get();
    if (oldProductSnap.exists) {
      const oldProduct = oldProductSnap.data() as Product;
      batch.update(db_firestore.collection("products").doc(oldProduct.id), { stock: oldProduct.stock + 1 });
    }

    batch.update(db_firestore.collection("products").doc(newProduct.id), { stock: newProduct.stock - exchangeData.newQty });
    batch.update(db_firestore.collection("saleItems").doc(oldItem.id), { isExchanged: true });

    const exchange: Exchange = {
      id: exchangeId, oldSaleItemId: oldItem.id, newProductId: newProduct.id, 
      differenceAmount: diff, type: diff > 0 ? "PAY" : diff < 0 ? "REFUND" : "EVEN", createdAt: new Date().toISOString()
    };
    batch.set(db_firestore.collection("exchanges").doc(exchangeId), exchange);
    await batch.commit();
    return exchange;
  }

  // --- Return Operations ---
  async getReturns(): Promise<ReturnRecord[]> {
    const snap = await db_firestore.collection("returns").get();
    return snap.docs.map(doc => doc.data() as ReturnRecord);
  }

  async createReturn(returnData: any): Promise<ReturnRecord> {
    const items = await this.getSaleItems();
    const item = items.find(i => i.id === returnData.saleItemId);
    if (!item) throw new Error("Item not found");
    const returnId = generateId();
    const batch = db_firestore.batch();
    const productSnap = await db_firestore.collection("products").doc(item.productId).get();
    if (productSnap.exists) {
      const product = productSnap.data() as Product;
      batch.update(db_firestore.collection("products").doc(product.id), { stock: product.stock + item.qty });
    }
    batch.update(db_firestore.collection("saleItems").doc(item.id), { isReturned: true });
    const ret: ReturnRecord = {
      id: returnId, saleItemId: item.id, refundAmount: item.price * item.qty, reason: returnData.reason, 
      refundMethod: returnData.refundMethod, createdAt: new Date().toISOString()
    };
    batch.set(db_firestore.collection("returns").doc(returnId), ret);
    await batch.commit();
    return ret;
  }

  // --- Settings Operation ---
  async getSettings(): Promise<Settings> {
    const docSnap = await db_firestore.collection("app").doc("settings").get();
    return docSnap.exists ? (docSnap.data() as Settings) : {
      shopName: "Shoaib Ladies Garments", address: "Karachi", phone: "", logo: "",
      saleFooter: "Thanks", returnFooter: "", exchangeFooter: "", exchangePolicy: "",
      showPolicyToggle: true, exchangeDays: 3, returnDays: 3,
    };
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    await db_firestore.collection("app").doc("settings").set(updated);
    return updated;
  }

  async addStockMovement(productId: string, type: string, qty: number, prev: number, next: number, ref: string) {
    const id = generateId();
    await db_firestore.collection("stockMovements").doc(id).set({
      id, productId, movementType: type, quantity: qty, previousStock: prev, newStock: next, referenceId: ref, createdAt: new Date().toISOString(),
    });
  }
}

export const db = new Database();
