import { KitchenItem, OrderRecord } from "./types";
import * as XLSX from "xlsx";

export const DEFAULT_CATALOG: KitchenItem[] = [];

// Helper to sanitize catalog inventory, ensuring absolutely unique Item_IDs and type safety
export function sanitizeInventory(items: KitchenItem[]): KitchenItem[] {
  if (!Array.isArray(items)) return [];
  const seenIds = new Set<string>();
  return items.map((item, index) => {
    const rawID = String(item.Item_ID || `ITEM-${index + 1001}`).trim();
    let uniqueID = rawID;
    let counter = 2;
    while (seenIds.has(uniqueID)) {
      uniqueID = `${rawID}_dup${counter}`;
      counter++;
    }
    seenIds.add(uniqueID);
    
    const sanitizedItem: KitchenItem = {
      Item_ID: uniqueID,
      Category: String(item.Category || "General").trim(),
      Item_Name: String(item.Item_Name || "").trim(),
      Unit_Type: String(item.Unit_Type || "Packs").trim(),
      Rate: typeof item.Rate === "number" && !isNaN(item.Rate) ? item.Rate : 10.00,
      Status: String(item.Status || "Active").trim(),
      isCustom: item.isCustom,
    };

    if (item.Supplier !== undefined) sanitizedItem.Supplier = item.Supplier;
    if (item.Purchase_Packaging !== undefined) sanitizedItem.Purchase_Packaging = item.Purchase_Packaging;
    if (item.Purchase_Price !== undefined) sanitizedItem.Purchase_Price = item.Purchase_Price;
    if (item.Inventory_Unit !== undefined) sanitizedItem.Inventory_Unit = item.Inventory_Unit;
    if (item.Inventory_Price !== undefined) sanitizedItem.Inventory_Price = item.Inventory_Price;
    if (item.Purchase_Count !== undefined) sanitizedItem.Purchase_Count = item.Purchase_Count;
    if (item.Par_Level !== undefined) sanitizedItem.Par_Level = item.Par_Level;
    if (item.On_Hand !== undefined) sanitizedItem.On_Hand = item.On_Hand;

    return sanitizedItem;
  }).filter(item => item.Item_Name !== "");
}

// Helper to save catalog to local storage (supports personalizing by userId)
export function saveInventoryToStorage(items: KitchenItem[], userId?: string) {
  try {
    const sanitized = sanitizeInventory(items);
    // Use the single centralized key "kitchen_inventory_catalog_v2" to share the master catalog across all accounts
    const key = "kitchen_inventory_catalog_v2";
    localStorage.setItem(key, JSON.stringify(sanitized));

    // Keep user-specific local storage backup in sync if userId is present (for backward compatibility)
    if (userId) {
      localStorage.setItem(`kitchen_inventory_catalog_v2_${userId}`, JSON.stringify(sanitized));
    }
  } catch (e) {
    console.error("Failed to save catalog to storage", e);
  }
}

// Helper to load catalog from local storage (supports personalizing by userId)
export function loadInventoryFromStorage(userId?: string): KitchenItem[] {
  try {
    // Both admin and staff sub-accounts now load from the same main master catalog database key
    const key = "kitchen_inventory_catalog_v2";
    let data = localStorage.getItem(key);
    
    // Fallback: If they had existing personalized catalog data, migrate/copy it to the global master catalog
    if (!data && userId) {
      const userKey = `kitchen_inventory_catalog_v2_${userId}`;
      const userData = localStorage.getItem(userKey);
      if (userData) {
        localStorage.setItem(key, userData);
        data = userData;
      }
    }
    
    if (data) {
      return sanitizeInventory(JSON.parse(data));
    }
  } catch (e) {
    console.error("Failed to load catalog from storage", e);
  }
  return sanitizeInventory(DEFAULT_CATALOG);
}

// Helper to save order history to local storage
export function saveOrderHistory(orders: OrderRecord[]) {
  try {
    localStorage.setItem("kitchen_order_history_v2", JSON.stringify(orders));
  } catch (e) {
    console.error("Failed to save order history", e);
  }
}

// Helper to load order history from local storage
export function loadOrderHistory(): OrderRecord[] {
  try {
    const data = localStorage.getItem("kitchen_order_history_v2");
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load order history", e);
  }
  return [];
}

// Helper to save subaccounts to local storage
export function saveSubAccountsToStorage(subs: any[]) {
  try {
    localStorage.setItem("kitchen_subaccounts_hub_v2", JSON.stringify(subs));
  } catch (e) {
    console.error("Failed to save subaccounts to storage", e);
  }
}

// Helper to load subaccounts from local storage
export function loadSubAccountsFromStorage(): any[] {
  try {
    const data = localStorage.getItem("kitchen_subaccounts_hub_v2");
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load subaccounts from storage", e);
  }
  return [];
}

// Utility to generate a template Excel file for the Warehouse / Master database
export function downloadBlankMasterTemplate() {
  const headers = [
    { Item_ID: "PROD-001", Category: "Produce", Item_Name: "Fresh Romaine Lettuce (Heads)", Unit_Type: "Case (12ct)", Rate: 12.50, Status: "Active" },
    { Item_ID: "PROD-002", Category: "Produce", Item_Name: "Roma Tomatoes", Unit_Type: "Box (25 lbs)", Rate: 24.00, Status: "Active" },
    { Item_ID: "SAUC-001", Category: "Sauces", Item_Name: "House Vinaigrette Dressing", Unit_Type: "Gallon", Rate: 14.00, Status: "Active" },
    { Item_ID: "BAKE-001", Category: "Bakery", Item_Name: "Brioche Burger Buns", Unit_Type: "Pack (24ct)", Rate: 10.50, Status: "Active" },
    { Item_ID: "MEAT-001", Category: "Meat", Item_Name: "Ground Beef 80/20 Blend", Unit_Type: "Case (20 lbs)", Rate: 95.00, Status: "Active" },
    { Item_ID: "MEAT-999", Category: "Meat", Item_Name: "Inactive Aged Steak Trimmings", Unit_Type: "Box (10 lbs)", Rate: 85.00, Status: "Inactive" },
  ];

  const worksheet = XLSX.utils.json_to_sheet(headers);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Warehouse Catalog");

  // Output file
  XLSX.writeFile(workbook, "Warehouse_Catalog_Template.xlsx");
}
