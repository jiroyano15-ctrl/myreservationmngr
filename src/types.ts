export interface KitchenItem {
  Item_ID: string; // "code"
  Category: string; // "category"
  Item_Name: string; // "item"
  Unit_Type: string; // "unit"
  Rate: number; // "rate"
  Status: string; // e.g. "Active"
  isCustom?: boolean; // True if added dynamically in the front-end
  Supplier?: string;
  Purchase_Packaging?: string;
  Purchase_Price?: number;
  Inventory_Unit?: string;
  Inventory_Price?: number;
  Purchase_Count?: string | number;
  Par_Level?: number; // Target level for personal stock management
  On_Hand?: number;   // Current physical product on hand
}

export interface OrderItem {
  Timestamp?: string;
  Item_ID: string; // "code"
  Category: string; // "category"
  Item_Name: string; // "item"
  Quantity: number; // "quantity"
  Unit_Type: string; // "unit"
  Rate: number; // "rate"
  Gross: number; // "gross" = Quantity * Rate
}

export interface OrderRecord {
  id: string;
  userId?: string;
  timestamp: string;
  items: OrderItem[];
  totalQuantity: number;
  totalGross: number;
  notes?: string;
}

export interface AppUser {
  uid: string;
  email?: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
  isSubAccount?: boolean;
  role?: string;
  username?: string;
  adminUid?: string;
}

export interface SubAccount {
  username: string;
  displayName: string;
  password?: string;
  role: string;
  adminUid: string;
  createdAt: string;
  email?: string | null;
}
