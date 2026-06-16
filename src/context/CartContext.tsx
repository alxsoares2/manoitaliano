"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  ReactNode,
} from "react";

export type CartItem = {
  lineId: string;
  itemId: string;
  name: string;
  size?: "Média" | "Grande";
  borda?: string;
  bordaPrice?: number;
  option?: string;
  unitPrice: number;
  qty: number;
};

type CartContextType = {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "lineId" | "qty">, qty?: number) => void;
  removeItem: (lineId: string) => void;
  updateQty: (lineId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "basilico-cart";

// Module-level store: avoids hydration mismatches by serving an empty
// snapshot during SSR and lazily loading localStorage on the client.
let items: CartItem[] = [];
let isOpen = false;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) items = JSON.parse(stored);
  } catch {
    // ignore corrupted storage
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore write errors (e.g. storage full or disabled)
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getItemsSnapshot() {
  ensureHydrated();
  return items;
}

function getServerItemsSnapshot() {
  return items;
}

function getIsOpenSnapshot() {
  return isOpen;
}

function setIsOpen(value: boolean) {
  if (isOpen === value) return;
  isOpen = value;
  emit();
}

function addItem(item: Omit<CartItem, "lineId" | "qty">, qty = 1) {
  const lineId = [item.itemId, item.size ?? "", item.borda ?? "", item.option ?? ""].join("|");

  const existing = items.find((i) => i.lineId === lineId);
  if (existing) {
    items = items.map((i) =>
      i.lineId === lineId ? { ...i, qty: i.qty + qty } : i
    );
  } else {
    items = [...items, { ...item, lineId, qty }];
  }
  persist();
  isOpen = true;
  emit();
}

function removeItem(lineId: string) {
  items = items.filter((i) => i.lineId !== lineId);
  persist();
  emit();
}

function updateQty(lineId: string, qty: number) {
  if (qty <= 0) {
    removeItem(lineId);
    return;
  }
  items = items.map((i) => (i.lineId === lineId ? { ...i, qty } : i));
  persist();
  emit();
}

function clearCart() {
  items = [];
  persist();
  emit();
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(
    subscribe,
    getItemsSnapshot,
    getServerItemsSnapshot
  );
  const isOpen = useSyncExternalStore(subscribe, getIsOpenSnapshot, () => false);

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + (i.unitPrice + (i.bordaPrice ?? 0)) * i.qty,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addItem,
        removeItem,
        updateQty,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
