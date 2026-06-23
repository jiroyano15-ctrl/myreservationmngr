import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { KitchenItem, OrderRecord, OrderItem, AppUser, SubAccount } from "./types";
import { supabase } from "./integrations/supabase/client";
import { 
  loadInventoryFromStorage, 
  saveInventoryToStorage, 
  loadOrderHistory, 
  saveOrderHistory, 
  downloadBlankMasterTemplate,
  DEFAULT_CATALOG,
  sanitizeInventory,
  loadSubAccountsFromStorage,
  saveSubAccountsToStorage
} from "./data";
import Header from "./components/Header";
import { QuickCatalogSearch } from "./components/QuickCatalogSearch";
import ItemGrid from "./components/ItemGrid";
import SidebarCart from "./components/SidebarCart";
import OrderHistoryList from "./components/OrderHistoryList";
import LoginScreen from "./components/LoginScreen";
import ConsumptionDashboard from "./components/ConsumptionDashboard";
import { 
  Check, 
  AlertCircle, 
  UtensilsCrossed, 
  Info, 
  X,
  PackageOpen,
  ShoppingBag,
  Search,
  History,
  ClipboardList,
  Shield,
  Users,
  Lock,
  Database,
  Save,
  RefreshCw,
  Trash2,
  Tag,
  Plus,
  ChevronDown,
  Download,
  Upload,
  SlidersHorizontal,
  Layers,
  Sparkles,
  BarChart3,
  LogIn,
  LogOut,
  Utensils,
  Menu,
  Clock,
  Sun,
  Moon
} from "lucide-react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";

// Firebase imports removed to leverage secure, instant offline Local Storage Database Hub

// Automatically detect currency from the user's timezone context
function detectCurrencyFromTimezone(): { symbol: string; code: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return { symbol: "£", code: "GBP" };

    const tzLower = tz.toLowerCase();

    // 1. British Pound / London / UK area
    if (
      tzLower.includes("london") || 
      tzLower.includes("europe/london") || 
      tzLower.includes("gb-eire") || 
      tzLower.includes("europe/belfast")
    ) {
      return { symbol: "£", code: "GBP" };
    }

    // 2. Ireland / Dublin (uses Euro)
    if (tzLower.includes("dublin") || tzLower.includes("europe/dublin")) {
      return { symbol: "€", code: "EUR" };
    }

    // 3. Switzerland (CHF)
    if (
      tzLower.includes("zurich") || 
      tzLower.includes("europe/zurich") ||
      tzLower.includes("geneva") ||
      tzLower.includes("europe/zurich")
    ) {
      return { symbol: "CHF", code: "CHF" };
    }

    // 4. Sweden (SEK)
    if (tzLower.includes("stockholm") || tzLower.includes("europe/stockholm")) {
      return { symbol: "kr", code: "SEK" };
    }

    // 5. Norway (NOK)
    if (tzLower.includes("oslo") || tzLower.includes("europe/oslo")) {
      return { symbol: "kr", code: "NOK" };
    }

    // 6. Denmark (DKK)
    if (tzLower.includes("copenhagen") || tzLower.includes("europe/copenhagen")) {
      return { symbol: "kr", code: "DKK" };
    }

    // 7. Poland (PLN)
    if (tzLower.includes("warsaw") || tzLower.includes("europe/warsaw")) {
      return { symbol: "zł", code: "PLN" };
    }

    // 8. Czech Republic (CZK)
    if (tzLower.includes("prague") || tzLower.includes("europe/prague")) {
      return { symbol: "Kč", code: "CZK" };
    }

    // 9. Hungary (HUF)
    if (tzLower.includes("budapest") || tzLower.includes("europe/budapest")) {
      return { symbol: "Ft", code: "HUF" };
    }

    // 10. Turkey (TRY)
    if (tzLower.includes("istanbul") || tzLower.includes("europe/istanbul")) {
      return { symbol: "₺", code: "TRY" };
    }

    // 11. Eurozone (Fallback for other Western/Southern European cities)
    const euroCities = [
      "paris", "berlin", "rome", "madrid", "amsterdam", "brussels", "vienna", "athens", 
      "lisbon", "helsinki", "tallinn", "riga", "vilnius", "ljubljana", "bratislava", 
      "nicosia", "valletta", "zagreb", "monaco", "luxembourg", "vatican", "san_marino", "andorra"
    ];
    if (tzLower.includes("europe/") && euroCities.some(city => tzLower.includes(city))) {
      return { symbol: "€", code: "EUR" };
    }

    // 12. India (INR)
    if (
      tzLower.includes("kolkata") || 
      tzLower.includes("calcutta") || 
      tzLower.includes("asia/kolkata")
    ) {
      return { symbol: "₹", code: "INR" };
    }

    // 13. Japan (JPY)
    if (tzLower.includes("tokyo") || tzLower.includes("asia/tokyo")) {
      return { symbol: "¥", code: "JPY" };
    }

    // 14. China (CNY)
    if (tzLower.includes("shanghai") || tzLower.includes("urumqi")) {
      return { symbol: "¥", code: "CNY" };
    }

    // 15. Hong Kong (HKD)
    if (tzLower.includes("hong_kong") || tzLower.includes("asia/hong_kong")) {
      return { symbol: "HK$", code: "HKD" };
    }

    // 16. Taiwan (TWD)
    if (tzLower.includes("taipei") || tzLower.includes("asia/taipei")) {
      return { symbol: "NT$", code: "TWD" };
    }

    // 17. Australia (AUD)
    if (tzLower.includes("australia/") || tzLower.includes("sydney") || tzLower.includes("melbourne") || tzLower.includes("brisbane") || tzLower.includes("perth") || tzLower.includes("adelaide") || tzLower.includes("hobart") || tzLower.includes("darwin")) {
      return { symbol: "A$", code: "AUD" };
    }

    // 18. New Zealand (NZD)
    if (tzLower.includes("auckland") || tzLower.includes("wellington") || tzLower.includes("pacific/auckland") || tzLower.includes("pacific/chatham")) {
      return { symbol: "NZ$", code: "NZD" };
    }

    // 19. Canada (CAD)
    if (
      tzLower.includes("canada/") || 
      tzLower.includes("toronto") || 
      tzLower.includes("vancouver") || 
      tzLower.includes("montreal") || 
      tzLower.includes("edmonton") || 
      tzLower.includes("calgary") || 
      tzLower.includes("halifax") || 
      tzLower.includes("winnipeg")
    ) {
      return { symbol: "C$", code: "CAD" };
    }

    // 20. Philippines (PHP)
    if (tzLower.includes("manila") || tzLower.includes("asia/manila")) {
      return { symbol: "₱", code: "PHP" };
    }

    // 21. Singapore (SGD)
    if (tzLower.includes("singapore") || tzLower.includes("asia/singapore")) {
      return { symbol: "S$", code: "SGD" };
    }

    // 22. Malaysia (MYR)
    if (tzLower.includes("kuala_lumpur") || tzLower.includes("asia/kuala_lumpur") || tzLower.includes("kuching")) {
      return { symbol: "RM", code: "MYR" };
    }

    // 23. Indonesia (IDR)
    if (tzLower.includes("jakarta") || tzLower.includes("asia/jakarta") || tzLower.includes("makassar") || tzLower.includes("jayapura")) {
      return { symbol: "Rp", code: "IDR" };
    }

    // 24. Thailand (THB)
    if (tzLower.includes("bangkok") || tzLower.includes("asia/bangkok")) {
      return { symbol: "฿", code: "THB" };
    }

    // 25. Vietnam (VND)
    if (tzLower.includes("ho_chi_minh") || tzLower.includes("saigon") || tzLower.includes("hanoi")) {
      return { symbol: "₫", code: "VND" };
    }

    // 26. South Korea (KRW)
    if (tzLower.includes("seoul") || tzLower.includes("asia/seoul")) {
      return { symbol: "₩", code: "KRW" };
    }

    // 27. Brazil (BRL)
    if (tzLower.includes("sao_paulo") || tzLower.includes("rio") || tzLower.includes("america/sao_paulo") || tzLower.includes("america/manaus") || tzLower.includes("america/recife") || tzLower.includes("america/fortaleza")) {
      return { symbol: "R$", code: "BRL" };
    }

    // 28. Mexico (MXN)
    if (tzLower.includes("mexico") || tzLower.includes("america/mexico_city") || tzLower.includes("cancun") || tzLower.includes("monterrey") || tzLower.includes("tijuana")) {
      return { symbol: "Mex$", code: "MXN" };
    }

    // 29. South Africa (ZAR)
    if (tzLower.includes("johannesburg") || tzLower.includes("africa/johannesburg") || tzLower.includes("cape_town") || tzLower.includes("durban")) {
      return { symbol: "R", code: "ZAR" };
    }

    // 30. United Arab Emirates (AED)
    if (tzLower.includes("dubai") || tzLower.includes("asia/dubai") || tzLower.includes("abu_dhabi")) {
      return { symbol: "AED", code: "AED" };
    }

    // 31. Saudi Arabia (SAR)
    if (tzLower.includes("riyadh") || tzLower.includes("asia/riyadh") || tzLower.includes("jeddah")) {
      return { symbol: "SAR", code: "SAR" };
    }

    // 32. Israel (ILS)
    if (tzLower.includes("jerusalem") || tzLower.includes("tel_aviv") || tzLower.includes("asia/jerusalem")) {
      return { symbol: "₪", code: "ILS" };
    }

    // 33. Kuwait (KWD)
    if (tzLower.includes("kuwait") || tzLower.includes("asia/kuwait")) {
      return { symbol: "KD", code: "KWD" };
    }

    // USA default or "America/" prefix default is USD
    if (tzLower.includes("america/") || tzLower.includes("pacific/")) {
      return { symbol: "$", code: "USD" };
    }

    return { symbol: "$", code: "USD" };
  } catch {
    return { symbol: "£", code: "GBP" };
  }
}

export default function App() {
  // --- States ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("system_dark_mode");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Sync dark mode class on document element
  useEffect(() => {
    try {
      localStorage.setItem("system_dark_mode", JSON.stringify(isDarkMode));
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.error("Failed to sync dark mode settings", e);
    }
  }, [isDarkMode]);

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currency, setCurrency] = useState<{ symbol: string; code: string }>(() => {
    try {
      const saved = localStorage.getItem("system_default_currency");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // As per intent: "used kwd as currency", let's first check if timezone detects KD, otherwise default to KD!
    const detected = detectCurrencyFromTimezone();
    if (detected && detected.code !== "USD") {
      return detected;
    }
    return { symbol: "KD", code: "KWD" };
  });

  const [inventory, setInventory] = useState<KitchenItem[]>([]);
  const [userCategories, setUserCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kitchen_app_user_categories");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kitchen_app_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [history, setHistory] = useState<OrderRecord[]>([]);
  const [receivedItems, setReceivedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("kitchen_app_received_items");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("kitchen_app_item_notes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchQtyFilter, setSearchQtyFilter] = useState("all");
  const [searchExactCode, setSearchExactCode] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sync favorites to localStorage
  useEffect(() => {
    localStorage.setItem("kitchen_app_favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Sync received status to localStorage
  useEffect(() => {
    localStorage.setItem("kitchen_app_received_items", JSON.stringify(receivedItems));
  }, [receivedItems]);

  // Sync item notes to localStorage
  useEffect(() => {
    localStorage.setItem("kitchen_app_item_notes", JSON.stringify(itemNotes));
  }, [itemNotes]);

  const handleUpdateItemNote = useCallback((itemId: string, note: string) => {
    setItemNotes(prev => {
      const next = { ...prev };
      if (!note || note.trim() === "") {
        delete next[itemId];
      } else {
        next[itemId] = note;
      }
      return next;
    });
  }, []);

  const handleToggleFavorite = useCallback((itemId: string) => {
    setFavorites(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  const handleToggleReceived = useCallback((recordId: string, itemId: string, idx: number) => {
    const key = `${recordId}_${itemId}_${idx}`;
    setReceivedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);
  const [customNotes, setCustomNotes] = useState("");
  const [activeGlobalTab, setActiveGlobalTab] = useState<"catalog" | "cart" | "history" | "admin" | "db_hub" | "ordering" | "consumption">("catalog");
  
  // Kitchen workflow sections lift state up to share filter globally
  const [sectionsList, setSectionsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kitchen_app_user_sections");
      return saved ? JSON.parse(saved) : ["Main Kitchen", "Prep Station", "Dry Storage", "Walk-In Cooler"];
    } catch {
      return ["Main Kitchen", "Prep Station", "Dry Storage", "Walk-In Cooler"];
    }
  });

  const [itemSectionTags, setItemSectionTags] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("kitchen_app_item_sections");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const handleTagSection = useCallback((itemId: string, section: string) => {
    setItemSectionTags(prev => {
      const next = { ...prev };
      if (!section) {
        delete next[itemId];
      } else {
        next[itemId] = section;
      }
      localStorage.setItem("kitchen_app_item_sections", JSON.stringify(next));
      return next;
    });
  }, []);
  
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const renderSidebarContent = (isMobileView = false) => {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
              System Console
            </span>
            <span className="text-xs font-bold text-slate-700 font-sans">
              Select Hub Workspace
            </span>
          </div>
          {isMobileView && (
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Vertical Side Tab Buttons */}
        <nav className="flex flex-col gap-2">
          <button
            onClick={() => {
              setActiveGlobalTab("catalog");
              if (isMobileView) setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeGlobalTab === "catalog"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10 border-l-4 border-emerald-600"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-4 border-transparent"
            }`}
          >
            <UtensilsCrossed className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left font-sans">Master Catalog</span>
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
              activeGlobalTab === "catalog" ? "bg-emerald-600 text-emerald-50" : "bg-slate-100 text-slate-500"
            }`}>
              {inventory.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveGlobalTab("ordering");
              if (isMobileView) setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeGlobalTab === "ordering"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10 border-l-4 border-emerald-600"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-4 border-transparent"
            }`}
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left font-sans">Ordering</span>
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
              activeGlobalTab === "ordering" ? "bg-emerald-600 text-emerald-50" : "bg-slate-100 text-slate-500"
            }`}>
              {stagedCount}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveGlobalTab("history");
              if (isMobileView) setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeGlobalTab === "history"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10 border-l-4 border-emerald-600"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-4 border-transparent"
            }`}
          >
            <History className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left font-sans">History Archives</span>
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
              activeGlobalTab === "history" ? "bg-emerald-600 text-emerald-50" : "bg-slate-100 text-slate-500"
            }`}>
              {history.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveGlobalTab("consumption");
              if (isMobileView) setIsMobileSidebarOpen(false);
            }}
            id="consumption-tab-btn"
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeGlobalTab === "consumption"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10 border-l-4 border-emerald-600"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-4 border-transparent"
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left font-sans">Consumption Hub</span>
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
              activeGlobalTab === "consumption" ? "bg-emerald-600 text-emerald-50" : "bg-slate-100 text-slate-550"
            }`}>
              1M
            </span>
          </button>

          {currentUser?.isAdmin && (
            <button
              onClick={() => {
                setActiveGlobalTab("admin");
                if (isMobileView) setIsMobileSidebarOpen(false);
              }}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeGlobalTab === "admin"
                  ? "bg-slate-800 text-white shadow-md shadow-slate-800/10 border-l-4 border-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-4 border-transparent"
              }`}
            >
              <Shield className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
              <span className="flex-1 text-left font-sans">Admin Console</span>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                activeGlobalTab === "admin" ? "bg-slate-900 text-slate-100" : "bg-slate-100 text-slate-500"
              }`}>
                {subAccounts.length}
              </span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveGlobalTab("db_hub");
              if (isMobileView) setIsMobileSidebarOpen(false);
            }}
            id="db-hub-tab-btn"
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeGlobalTab === "db_hub"
                ? "bg-slate-800 text-white shadow-md shadow-slate-800/10 border-l-4 border-amber-505"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-4 border-transparent"
            }`}
          >
            <Database className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
            <span className="flex-1 text-left font-sans">Database Hub</span>
            <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
              activeGlobalTab === "db_hub" ? "bg-slate-900 text-amber-400" : "bg-amber-50 text-amber-700 font-bold"
            }`}>
              Hub
            </span>
          </button>
        </nav>

        {/* Dynamic User Profile / Google Session & Sub-account Portal Card */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
          {currentUser ? (
            <div className="flex items-center justify-between bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 shadow-3xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="User profile" 
                    className="h-8 w-8 rounded-lg border border-emerald-100 object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center font-sans uppercase shrink-0">
                    {(currentUser.displayName || currentUser.username)?.[0] || "C"}
                  </div>
                )}
                <div className="text-left min-w-0">
                  <span className="block text-xs font-bold text-slate-800 truncate leading-tight">
                    {currentUser.displayName || currentUser.username || "Chef"}
                  </span>
                  <span className="block text-[9px] text-emerald-600 font-mono leading-none mt-1">
                    {currentUser.isAdmin ? "System Admin" : `${currentUser.role || "Staff"} Account`}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all cursor-pointer shrink-0 border border-transparent hover:border-slate-100 shadow-3xs"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsLoginModalOpen(true);
                if (isMobileView) setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 px-4 rounded-xl text-xs font-black shadow-sm tracking-wide cursor-pointer transition active:scale-95"
            >
              <LogIn className="h-4 w-4 shrink-0" />
              Sign Into Session
            </button>
          )}
        </div>
      </div>
    );
  };

  const [dbHubSelectedTab, setDbHubSelectedTab] = useState<"catalog" | "history" | "subaccounts">("catalog");
  const [dbHubEditorInput, setDbHubEditorInput] = useState("");
  const dbHubFileInputRef = useRef<HTMLInputElement>(null);
  const catalogFileInputRef = useRef<HTMLInputElement>(null);

  // Sync editor raw values dynamically
  useEffect(() => {
    if (activeGlobalTab === "db_hub") {
      if (dbHubSelectedTab === "catalog") {
        setDbHubEditorInput(JSON.stringify(inventory, null, 2));
      } else if (dbHubSelectedTab === "history") {
        setDbHubEditorInput(JSON.stringify(history, null, 2));
      } else if (dbHubSelectedTab === "subaccounts") {
        setDbHubEditorInput(JSON.stringify(subAccounts, null, 2));
      }
    }
  }, [dbHubSelectedTab, activeGlobalTab, inventory, history, subAccounts]);
  
  const [activeShift, setActiveShift] = useState("Produce");
  const [liveTime, setLiveTime] = useState(new Date());
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "rose" } | null>(null);


  // --- Helper Toasts ---
  const triggerToast = (message: string, type: "success" | "info" | "rose" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleCurrencyChange = (newCurrency: { symbol: string; code: string }) => {
    setCurrency(newCurrency);
    try {
      localStorage.setItem("system_default_currency", JSON.stringify(newCurrency));
      triggerToast(`System default currency changed to ${newCurrency.code} (${newCurrency.symbol})`, "success");
    } catch (e) {
      console.error(e);
    }
  };

  // --- Initializer hooks ---
  useEffect(() => {
    // Determine suggest active shift from actual local hours
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 11) setActiveShift("Produce");
    else if (hr >= 11 && hr < 16) setActiveShift("Bakery & Sauce");
    else if (hr >= 16 && hr < 22) setActiveShift("Meat");
    else setActiveShift("Warehouse");

    // Load initial local caches
    setInventory(loadInventoryFromStorage());
    setHistory(loadOrderHistory());

    // Tick clock running
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // --- Automatic Category Analyzer & Adapter effect ---
  useEffect(() => {
    if (inventory.length === 0) return;
    const builtinLower = ["general", "all", "others"];
    const newlyFound: string[] = [];

    inventory.forEach(item => {
      const cat = item.Category?.trim();
      if (!cat) return;
      const lower = cat.toLowerCase();
      if (
        !builtinLower.includes(lower) && 
        !newlyFound.some(n => n.toLowerCase() === lower)
      ) {
        newlyFound.push(cat);
      }
    });

    if (newlyFound.length > 0) {
      setUserCategories(prev => {
        const prevLower = prev.map(c => c.toLowerCase());
        const filteredNew = newlyFound.filter(n => !prevLower.includes(n.toLowerCase()));
        if (filteredNew.length === 0) return prev;
        const next = [...prev, ...filteredNew];
        localStorage.setItem("kitchen_app_user_categories", JSON.stringify(next));
        return next;
      });
    }
  }, [inventory]);

// Cloud synchronization and Firestore helper functions removed to prioritize zero-network latency Local Storage Database Hub

  // --- Auth Session Recovery Hook ---
  useEffect(() => {
    // Immediate synchronous recovery of cached credentials for offline-first resilience
    const savedSandboxAdminRaw = localStorage.getItem("kitchen_app_sandbox_admin_session");
    const savedSubAccountRaw = localStorage.getItem("kitchen_app_subaccount_session");
    if (savedSandboxAdminRaw) {
      try {
        const adminData = JSON.parse(savedSandboxAdminRaw) as AppUser;
        setCurrentUser(adminData);
        setInventory(loadInventoryFromStorage());
        setHistory(loadOrderHistory());
        const cached = loadSubAccountsFromStorage();
        if (cached && cached.length > 0) {
          setSubAccounts(cached);
        }
      } catch (e) {
        console.error("Failed to parse sandbox admin session", e);
      }
    } else if (savedSubAccountRaw) {
      try {
        const subData = JSON.parse(savedSubAccountRaw) as AppUser;
        setCurrentUser(subData);
        setInventory(loadInventoryFromStorage());
        setHistory(loadOrderHistory());
      } catch (e) {
        console.error("Failed to parse sub account session", e);
      }
    } else {
      setCurrentUser(null);
      setInventory(loadInventoryFromStorage());
      setHistory(loadOrderHistory());
    }
  }, []);

  // --- Sub-accounts local loading hook ---
  useEffect(() => {
    if (currentUser?.isAdmin) {
      const cached = loadSubAccountsFromStorage();
      setSubAccounts(cached || []);
    } else {
      setSubAccounts([]);
    }
  }, [currentUser]);

  // Synchronize catalog inventory with the currently active user profile (personalized storage workspaces)
  useEffect(() => {
    const userId = currentUser?.uid;
    setInventory(loadInventoryFromStorage(userId));
  }, [currentUser]);

  // --- Sub accounts provision state & handers ---
  const [newSubUsername, setNewSubUsername] = useState("");
  const [newSubDisplayName, setNewSubDisplayName] = useState("");
  const [newSubPassword, setNewSubPassword] = useState("");
  const [newSubRole, setNewSubRole] = useState("Sub Account User");
  const [newSubEmail, setNewSubEmail] = useState("");

  const handleCreateSubAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.isAdmin) {
      triggerToast("Access Denied: Only Admins can invoke this action.", "rose");
      return;
    }
    const cleanUser = newSubUsername.trim().toLowerCase().replace(/\s+/g, "");
    if (!cleanUser || !newSubDisplayName.trim() || !newSubPassword.trim()) {
      triggerToast("Please fill out all sub-account credentials fields.", "rose");
      return;
    }

    try {
      // Check if subaccount username already exists locally
      const localSubs = loadSubAccountsFromStorage();
      const existsLocally = localSubs.some(s => s.username === cleanUser);

      if (existsLocally) {
        triggerToast("This staff username is already in use by another sub-account.", "rose");
        return;
      }

      // Check if subaccount email is already in use
      const cleanEmail = newSubEmail.trim().toLowerCase();
      if (cleanEmail && localSubs.some(s => s.email && s.email.toLowerCase() === cleanEmail)) {
        triggerToast("This Google Email address is already linked to another sub-account.", "rose");
        return;
      }

      const payload: SubAccount = {
        username: cleanUser,
        displayName: newSubDisplayName.trim(),
        password: newSubPassword.trim(),
        role: newSubRole,
        adminUid: currentUser.uid,
        createdAt: new Date().toISOString(),
        email: cleanEmail || null
      };

      // Save to local storage database hub
      const filteredSubs = localSubs.filter(s => s.username !== cleanUser);
      filteredSubs.push(payload);
      saveSubAccountsToStorage(filteredSubs);
      setSubAccounts(filteredSubs);

      triggerToast(`Account created for ${newSubDisplayName.trim()} inside Database Hub!`, "success");
      
      // Clear inputs
      setNewSubUsername("");
      setNewSubDisplayName("");
      setNewSubPassword("");
      setNewSubRole("Sub Account User");
      setNewSubEmail("");
    } catch (err) {
      console.error("Failed to create subaccount", err);
      triggerToast("Failed to create subaccount.", "rose");
    }
  };

  const handleDeleteSubAccount = (usernameId: string) => {
    if (!window.confirm(`Are you sure you want to revoke database permissions and delete subaccount "${usernameId}"?`)) {
      return;
    }
    try {
      // Delete from Local Storage database hub
      const localSubs = loadSubAccountsFromStorage();
      const filteredSubs = localSubs.filter(s => s.username !== usernameId);
      saveSubAccountsToStorage(filteredSubs);
      setSubAccounts(filteredSubs);

      triggerToast(`Subaccount "${usernameId}" permanently revoked from Database Hub.`, "info");
    } catch (err) {
      console.error("Subaccount deletion failed", err);
      triggerToast("Failed to delete subaccount.", "rose");
    }
  };

  // --- Local Storage Database Hub Actions & Tools ---
  const handleSaveRawDb = () => {
    try {
      const parsed = JSON.parse(dbHubEditorInput);
      if (dbHubSelectedTab === "catalog") {
        if (!Array.isArray(parsed)) throw new Error("Catalog must be a JSON array.");
        const sanitized = sanitizeInventory(parsed);
        saveInventoryToStorage(sanitized);
        setInventory(sanitized);
        triggerToast("Master Inventory Catalog successfully updated in local storage database hub!", "success");
      } else if (dbHubSelectedTab === "history") {
        if (!Array.isArray(parsed)) throw new Error("Order history archives must be a JSON array.");
        saveOrderHistory(parsed);
        setHistory(parsed);
        triggerToast("Order History Archives successfully updated in local storage database hub!", "success");
      } else if (dbHubSelectedTab === "subaccounts") {
        if (!Array.isArray(parsed)) throw new Error("Staff credentials must be a JSON array.");
        saveSubAccountsToStorage(parsed);
        setSubAccounts(parsed);
        triggerToast("Staff Credentials successfully updated in local storage database hub!", "success");
      }
    } catch (err: any) {
      console.error("Failed to commit raw database hub edits", err);
      triggerToast(`Commit Rejected: ${err?.message || "Invalid JSON syntax"}`, "rose");
    }
  };

  const handleDbHubExport = () => {
    try {
      const dump = {
        catalog: inventory,
        history: history,
        subaccounts: subAccounts,
        currency: localStorage.getItem("system_default_currency") || "USD",
        exportedAt: new Date().toISOString()
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `kitchen_database_hub_v2_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast("Database hub completely exported as offline JSON backup file!", "success");
    } catch (err) {
      console.error("Failed to download database hub export", err);
      triggerToast("Failed to output backup export file", "rose");
    }
  };

  const handleDbHubImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let count = 0;
        if (parsed.catalog && Array.isArray(parsed.catalog)) {
          const sanitized = sanitizeInventory(parsed.catalog);
          saveInventoryToStorage(sanitized);
          setInventory(sanitized);
          count++;
        }
        if (parsed.history && Array.isArray(parsed.history)) {
          saveOrderHistory(parsed.history);
          setHistory(parsed.history);
          count++;
        }
        if (parsed.subaccounts && Array.isArray(parsed.subaccounts)) {
          saveSubAccountsToStorage(parsed.subaccounts);
          setSubAccounts(parsed.subaccounts);
          count++;
        }
        if (count > 0) {
          triggerToast("All databases in local storage database hub synced successfully from backup file!", "success");
        } else {
          triggerToast("Nothing was imported. Backup file structure not recognized.", "rose");
        }
        if (dbHubFileInputRef.current) {
          dbHubFileInputRef.current.value = "";
        }
      } catch (err) {
        console.error("Failed to read database hub restore file", err);
        triggerToast("Import aborted: Invalid JSON or corrupted backup formatting.", "rose");
      }
    };
    fileReader.readAsText(file);
  };

  const handleDbHubReset = () => {
    if (!window.confirm("Are you SURE you want to perform a hard reset on the Local Storage Database Hub?\n\nThis will clear all registered subaccounts, order histories, custom categories, and restore the catalog to master defaults.")) {
      return;
    }
    
    // Generate an interactive 4-digit numeric verification code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const userInput = window.prompt(
      `FINAL PROTECTIVE WARNING:\nThis action cannot be undone and will permanently wipe your Database Hub records.\n\nTo confirm deletion, please type the confirmation code: ${verificationCode}`
    );
    
    if (userInput === null) {
      return; // Cancelled
    }
    
    if (userInput.trim() !== verificationCode) {
      triggerToast("Aborted: Incorrect confirmation code entered.", "rose");
      return;
    }

    try {
      localStorage.removeItem("kitchen_inventory_catalog_v2");
      localStorage.removeItem("kitchen_order_history_v2");
      localStorage.removeItem("kitchen_subaccounts_hub_v2");
      localStorage.removeItem("kitchen_app_user_categories");
      
      const defaultInv = sanitizeInventory(DEFAULT_CATALOG);
      setInventory(defaultInv);
      setHistory([]);
      setSubAccounts([]);
      setUserCategories([]);
      
      triggerToast("Database Hub fully scrubbed and restored to pristine default state.", "info");
    } catch (err) {
      console.error("Flush failed", err);
      triggerToast("Failed to perform complete sweep.", "rose");
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Firebase signOut error:", e);
    }
    localStorage.removeItem("kitchen_app_sandbox_admin_session");
    localStorage.removeItem("kitchen_app_subaccount_session");
    setCurrentUser(null);
    setInventory(loadInventoryFromStorage());
    setHistory(loadOrderHistory());
    triggerToast("Your session has been logged out successfully.", "info");
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (!user.email) {
        triggerToast("Google login failed: account does not have a valid email address.", "rose");
        return;
      }

      const emailLower = user.email.trim().toLowerCase();

      // Check if user is Admin
      const isAdminEmail = emailLower === "jiroyano15@gmail.com" || emailLower === "jeromelpintero@gmail.com" || emailLower === "hajime015@gmail.com";

      if (isAdminEmail) {
        const appUser: AppUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "App Administrator",
          photoURL: user.photoURL,
          isAdmin: true,
          isSubAccount: false,
          role: "Admin"
        };
        localStorage.setItem("kitchen_app_sandbox_admin_session", JSON.stringify(appUser));
        localStorage.removeItem("kitchen_app_subaccount_session");
        setCurrentUser(appUser);
        setIsLoginModalOpen(false);
        triggerToast(`Welcome back, Administrator! Signed in as ${appUser.displayName}.`, "success");
        return;
      }

      // Check if user is a registered sub-account
      const localSubs = loadSubAccountsFromStorage();
      const foundSub = localSubs.find(
        s => s.email && s.email.trim().toLowerCase() === emailLower
      );

      if (foundSub) {
        const appUser: AppUser = {
          uid: "google-sub-" + foundSub.username,
          email: user.email,
          displayName: foundSub.displayName,
          photoURL: user.photoURL,
          isAdmin: false,
          isSubAccount: true,
          role: foundSub.role,
          username: foundSub.username,
          adminUid: foundSub.adminUid
        };
        localStorage.setItem("kitchen_app_subaccount_session", JSON.stringify(appUser));
        localStorage.removeItem("kitchen_app_sandbox_admin_session");
        setCurrentUser(appUser);
        setIsLoginModalOpen(false);
        triggerToast(`Staff logged in successfully as: ${foundSub.displayName}`, "success");
        return;
      }

      // If neither, sign out from Firebase and reject
      await auth.signOut();
      triggerToast(`Access Denied: Google account "${user.email}" is not registered as an Admin or Sub-Account staff member.`, "rose");

    } catch (err: any) {
      console.error("Google authentication failed", err);
      if (err?.code === "auth/unauthorized-domain" || err?.message?.includes("unauthorized-domain")) {
        setAuthError("unauthorized-domain");
        triggerToast("Authentication failed: Unregistered domain. Please see instructions below.", "rose");
      } else {
        setAuthError(err?.message || "Google Sign-In failed or was cancelled.");
        triggerToast(err?.message || "Google Sign-In failed or was cancelled.", "rose");
      }
    }
  };

  const saveCatalogToTarget = useCallback((items: KitchenItem[]) => {
    saveInventoryToStorage(items, currentUser?.uid);
  }, [currentUser]);

  // --- Live Par Level change updater ---
  const handleParLevelChange = useCallback(async (itemId: string, level: number) => {
    setInventory(prev => {
      const updatedCatalog = prev.map(item => (item.Item_ID === itemId ? { ...item, Par_Level: level } : item));
      saveCatalogToTarget(updatedCatalog);
      return updatedCatalog;
    });
  }, [saveCatalogToTarget]);

  // --- Live Product On Hand change updater ---
  const handleOnHandChange = useCallback(async (itemId: string, count: number) => {
    setInventory(prev => {
      const updatedCatalog = prev.map(item => (item.Item_ID === itemId ? { ...item, On_Hand: count } : item));
      saveCatalogToTarget(updatedCatalog);
      return updatedCatalog;
    });
  }, [saveCatalogToTarget]);

  // --- Catalog Upload Handlers ---
  const handleCatalogUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to 2D array representation first to robustly locate the headers row
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        if (!rows || rows.length === 0) {
          throw new Error("The uploaded spreadsheet contains no records.");
        }

        // Find the index of the header row containing standard catalog keys
        let headerRowIndex = 0;
        let maxScore = -1;
        const potentialKeywords = [
          "category", "code", "article", "item", "name", 
          "purchase", "packaging", "unit", "price", "supplier", 
          "count", "inventory", "rate", "$", "qty", "status"
        ];

        // Scan first 15 rows for the most descriptive header candidate
        const scanLimit = Math.min(rows.length, 15);
        for (let i = 0; i < scanLimit; i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          
          let score = 0;
          row.forEach(cell => {
            if (cell === null || cell === undefined) return;
            const strVal = String(cell).toLowerCase().trim();
            if (!strVal) return;
            
            for (const kw of potentialKeywords) {
              if (strVal.includes(kw)) {
                score += 1;
                break;
              }
            }
          });
          
          if (score > maxScore) {
            maxScore = score;
            headerRowIndex = i;
          }
        }

        // Extract and normalize headers
        const rawHeaders = rows[headerRowIndex] || [];
        const headers = rawHeaders.map((h, idx) => {
          const clean = String(h || "").trim();
          return clean || `COLUMN_${idx}`;
        });

        // Parse subsequent data rows into structured JSON row objects
        const jsonData: any[] = [];
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;
          
          const hasContent = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== "");
          if (!hasContent) continue;

          const obj: Record<string, any> = {};
          headers.forEach((header, colIndex) => {
            obj[header] = row[colIndex] !== undefined ? row[colIndex] : null;
          });
          jsonData.push(obj);
        }

        if (jsonData.length === 0) {
          throw new Error("The uploaded spreadsheet contains no records.");
        }
        
        // Match columns flexibly
        const parsedItems: KitchenItem[] = jsonData.map((row, index) => {
          // Normalize row keys to allow case-insensitive and space-insensitive lookups
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, "");
            normalizedRow[normalizedKey] = row[key];
          });

          // Helper to find key
          const getVal = (aliases: string[], fallback: any = undefined) => {
            for (const alias of aliases) {
              const normAlias = alias.toLowerCase().replace(/[\s_-]+/g, "");
              if (normalizedRow[normAlias] !== undefined && normalizedRow[normAlias] !== null) {
                return normalizedRow[normAlias];
              }
            }
            return fallback;
          };

          // Highly robust mapping based on the photographed template headers
          const category = getVal(["item category", "tem category", "category", "section", "sec", "department", "dept"], "General");
          const itemName = getVal(["article name", "item name", "name", "article", "item", "description", "desc", "ingredient", "product", "title"], "");
          const unitType = getVal(["unit", "inventory unit", "unit type", "packing unit", "purchase packaging"], "Packs");
          const itemID = getVal(["code", "item id", "id", "item code", "sku"], `ITEM-${index + 1001}`);
          const status = getVal(["status", "condition", "active", "state"], "Active");
          
          const rateVal = getVal(["inventory price", "purchase price", "rate", "price"], "10.00");
          const rate = parseFloat(rateVal) || 10.00;

          // Extra template properties from the template image
          const supplier = getVal(["supplier", "vendor"]);
          const purchasePackaging = getVal(["purchase packaging", "pkg", "packaging", "pack size"]);
          const purchasePriceVal = getVal(["purchase price", "buy price"]);
          let purchasePrice: number | undefined = undefined;
          if (purchasePriceVal !== undefined && purchasePriceVal !== null && purchasePriceVal !== "") {
            const parsed = parseFloat(purchasePriceVal);
            if (!isNaN(parsed)) purchasePrice = parsed;
          }
          const purchaseCount = getVal(["purchase count", "qty count"]);
          const inventoryUnit = getVal(["inventory unit", "stock unit"]);
          const inventoryPriceVal = getVal(["inventory price", "stock price"]);
          let inventoryPrice: number | undefined = undefined;
          if (inventoryPriceVal !== undefined && inventoryPriceVal !== null && inventoryPriceVal !== "") {
            const parsed = parseFloat(inventoryPriceVal);
            if (!isNaN(parsed)) inventoryPrice = parsed;
          }
          
          return {
            Item_ID: String(itemID).trim(),
            Category: String(category).trim(),
            Item_Name: String(itemName).trim(),
            Unit_Type: String(unitType).trim(),
            Rate: rate,
            Status: String(status).trim(),
            ...(supplier !== undefined && { Supplier: String(supplier).trim() }),
            ...(purchasePackaging !== undefined && { Purchase_Packaging: String(purchasePackaging).trim() }),
            ...(purchasePrice !== undefined && { Purchase_Price: purchasePrice }),
            ...(purchaseCount !== undefined && { Purchase_Count: purchaseCount }),
            ...(inventoryUnit !== undefined && { Inventory_Unit: String(inventoryUnit).trim() }),
            ...(inventoryPrice !== undefined && { Inventory_Price: inventoryPrice })
          };
        }).filter(item => item.Item_Name && item.Item_Name !== "undefined" && item.Item_Name !== "");
        
        if (parsedItems.length === 0) {
          throw new Error("Columns could not be parsed. Verify spreadsheet has 'Category' and 'Item_Name' titles.");
        }

        // Forgiving active items check: if no explicit status is given, we default to active.
        // Otherwise, match common active-like values such as "Active", "Yes", "Y", "Live", "In Stock", or non-empty strings.
        const activeItemsOnly = parsedItems.filter(item => {
          const s = item.Status.trim().toLowerCase();
          return s === "active" || s === "" || s === "yes" || s === "y" || s === "true" || s === "1" || s === "in stock" || s === "instock" || s === "live";
        });

        if (activeItemsOnly.length === 0) {
          throw new Error("No items in the uploaded spreadsheet are flagged with 'Active' Status.");
        }
        
        // Ensure absolutely unique Item_IDs and safe properties using our central sanitizer
        const uniqueActiveItems = sanitizeInventory(activeItemsOnly);

        setInventory(uniqueActiveItems);
        await saveCatalogToTarget(uniqueActiveItems);
        
        // Zero draft quantities
        setQuantities({});
        setErrorMsg(null);
        
        // Analyze and adapt categories automatically
        const uniqueUploadedCats = Array.from(new Set(
          uniqueActiveItems.map(item => item.Category?.trim()).filter(Boolean)
        ));

        setUserCategories(uniqueUploadedCats);
        localStorage.setItem("kitchen_app_user_categories", JSON.stringify(uniqueUploadedCats));
        
        triggerToast(`Catalog loaded! Dynamic categories initialized: ${uniqueUploadedCats.join(", ")}`, "success");
        
        // Clear input element
        e.target.value = "";
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Failed to parse file. Make sure it has 'Category' and 'Item_Name' columns.");
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Restores Demo Catalog
  const handleResetToDemoCatalog = async () => {
    if (window.confirm("Are you sure you want to restore the default kitchen demo catalog? This will erase current catalog items.")) {
      setInventory(DEFAULT_CATALOG);
      await saveCatalogToTarget(DEFAULT_CATALOG);
      setQuantities({});
      setErrorMsg(null);
      triggerToast("Restored standard demo catalog items.", "info");
    }
  };

  // --- Custom Quick Add Item ---
  const handleAddCustomItem = async (
    code: string | null,
    name: string,
    category: string,
    unit: string,
    rate: number,
    initialQty: number = 1,
    parLevel?: number,
    onHand?: number
  ) => {
    // Determine unique ID - use supplied code or generate one
    let newID = code ? code.trim() : "";
    if (!newID) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      newID = `CUST-${randomSuffix}`;
    }

    // Ensure ID is fully unique to prevent collisions
    const IDExists = inventory.some(item => item.Item_ID === newID);
    if (IDExists) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      newID = `${newID}-${randomSuffix}`;
    }

    const newItem: KitchenItem = {
      Item_ID: newID,
      Category: category,
      Item_Name: name,
      Unit_Type: unit,
      Rate: rate,
      Status: "Active",
      isCustom: true,
      Par_Level: parLevel,
      On_Hand: onHand
    };

    const updatedCatalog = sanitizeInventory([...inventory, newItem]);
    setInventory(updatedCatalog);
    await saveCatalogToTarget(updatedCatalog);

    // Auto-select the quantity set by the user in the form
    setQuantities(prev => ({ ...prev, [newID]: initialQty }));
    triggerToast(`Added custom item: "${name}" (${newID}) with quantity ${initialQty}`, "success");
  };

  // --- Live Rate change updater ---
  const handleRateChange = useCallback(async (itemId: string, rate: number) => {
    setInventory(prev => {
      const updatedCatalog = prev.map(item => (item.Item_ID === itemId ? { ...item, Rate: rate } : item));
      saveCatalogToTarget(updatedCatalog);
      return updatedCatalog;
    });
  }, [saveCatalogToTarget]);

  // --- Live Category change updater for individual items ---
  const handleItemCategoryChange = useCallback(async (itemId: string, newCategory: string) => {
    setInventory(prev => {
      const updatedCatalog = prev.map(item => (item.Item_ID === itemId ? { ...item, Category: newCategory } : item));
      saveCatalogToTarget(updatedCatalog);
      return updatedCatalog;
    });
  }, [saveCatalogToTarget]);

  // --- Global Category tab list rename action ---
  const handleRenameCategory = async (oldCategory: string, newCategory: string) => {
    const trimmedOld = oldCategory.trim();
    const trimmedNew = newCategory.trim();
    if (!trimmedNew || trimmedOld === trimmedNew) return;

    const updatedCatalog = inventory.map(item => {
      if (item.Category === trimmedOld) {
        return { ...item, Category: trimmedNew };
      }
      return item;
    });

    setInventory(updatedCatalog);
    await saveCatalogToTarget(updatedCatalog);
    
    // Keep user's custom tabs sync with new category if present
    try {
      const saved = localStorage.getItem("kitchen_app_user_categories");
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        const next = parsed.map(c => c === trimmedOld ? trimmedNew : c);
        localStorage.setItem("kitchen_app_user_categories", JSON.stringify(next));
        setUserCategories(next);
      }
    } catch (e) {
      console.error(e);
    }

    triggerToast(`Renamed category "${trimmedOld}" to "${trimmedNew}"`, "success");
  };

  // --- Global Category tab list deletion action ---
  const handleDeleteCategory = async (categoryName: string) => {
    const trimmed = categoryName.trim();
    const updatedCatalog = inventory.map(item => {
      if (item.Category === trimmed) {
        return { ...item, Category: "General" };
      }
      return item;
    });

    setInventory(updatedCatalog);
    await saveCatalogToTarget(updatedCatalog);

    // Clean up localStorage custom categories
    try {
      setUserCategories(prev => {
        const next = prev.filter(c => c.trim().toLowerCase() !== trimmed.toLowerCase());
        localStorage.setItem("kitchen_app_user_categories", JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.error(e);
    }

    triggerToast(`Removed category "${trimmed}". Relocated matched items to General.`, "rose");
  };

  // --- Quantity Adjustment Engine ---
  const handleQuantityAdjust = useCallback((itemId: string, qty: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: qty
    }));
  }, []);

  // Clear current shift order draft
  const handleClearDraft = () => {
    if (window.confirm("Are you sure you want to clear your active shift order draft?")) {
      setQuantities({});
      setCustomNotes("");
      triggerToast("Shift order cleared.", "rose");
    }
  };

  // --- Core Submit Order handler ---
  const handleSubmitKitchenOrder = async () => {
    // Compile active order rows
    const orderItems: OrderItem[] = [];
    const formattedDate = liveTime.toLocaleDateString();
    const timestampFormatted = liveTime.toLocaleString();

    inventory.forEach(item => {
      const q = quantities[item.Item_ID] || 0;
      if (q > 0) {
        const rate = item.Rate || 0;
        orderItems.push({
          Timestamp: timestampFormatted,
          Item_ID: item.Item_ID,
          Category: item.Category,
          Item_Name: item.Item_Name,
          Quantity: q,
          Unit_Type: item.Unit_Type,
          Rate: rate,
          Gross: q * rate
        });
      }
    });

    if (orderItems.length === 0) {
      alert("Order draft mapping is empty. Please add items before submitting.");
      return;
    }

    // 1. Generate downloadable Excel sheet
    const finalExportRows = orderItems.map((item, idx) => ({
      Timestamp: item.Timestamp,
      Category: item.Category,
      Item_ID: item.Item_ID,
      Item_Name: item.Item_Name,
      Quantity: item.Quantity,
      Unit: item.Unit_Type,
      Rate: item.Rate,
      Gross: item.Gross,
      Instructions: idx === 0 ? (customNotes || "") : ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(finalExportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kitchen Order Summary");

    // Output file
    const dateSlug = liveTime.toISOString().slice(0, 10);
    const filename = `Kitchen_Order_Dispatch_${dateSlug}_${activeShift.toLowerCase().replace(" ", "_")}.xlsx`;
    XLSX.writeFile(workbook, filename);

    // 2. Add compiled record to history archives
    const recordID = `ORD-${Math.random().toString(36).substr(2, 9)}`;
    const totalVolume = orderItems.reduce((acc, curr) => acc + curr.Quantity, 0);
    const totalGrossValue = orderItems.reduce((acc, curr) => acc + curr.Gross, 0);

    const newRecord: OrderRecord = {
      id: recordID,
      userId: currentUser?.uid || "anonymous",
      timestamp: timestampFormatted,
      items: orderItems,
      totalQuantity: totalVolume,
      totalGross: totalGrossValue,
      notes: customNotes
    };

    const updatedHistory = [...history, newRecord];
    setHistory(updatedHistory);
    saveOrderHistory(updatedHistory);



    // 3. Clear draft quantities & notes
    setQuantities({});
    setCustomNotes("");
    triggerToast("🎉 Order compiled & downloaded! Record added to history.", "success");
  };

  // --- History Archives interaction handlers ---
  const handleClearHistory = async () => {
    if (window.confirm("Danger: Are you sure you want to permanently delete all archived history logs? This cannot be undone.")) {
      setHistory([]);
      saveOrderHistory([]);
      triggerToast("Archived history logs completely wiped.", "rose");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const updated = history.filter(rec => rec.id !== id);
    setHistory(updated);
    saveOrderHistory(updated);
    triggerToast("Order record removed from logs.", "info");
  };

  const handleRestoreRecord = async (record: OrderRecord) => {
    if (window.confirm(`Would you like to restore the quantities from this past order (${record.items.length} items)? This will override your current active draft.`)) {
      const restoredQuantities: Record<string, number> = {};
      
      // We check if the items from the past order still exist in our active catalog
      // If we don't find it, we can dynamically append it so it shows up!
      let catalogNeedsUpdating = false;
      const currentCatalogIds = new Set(inventory.map(item => String(item.Item_ID)));
      const catalogAppendList: KitchenItem[] = [];

      record.items.forEach(hItem => {
         restoredQuantities[hItem.Item_ID] = hItem.Quantity;

        if (!currentCatalogIds.has(String(hItem.Item_ID))) {
          catalogNeedsUpdating = true;
          catalogAppendList.push({
            Item_ID: hItem.Item_ID,
            Category: hItem.Category,
            Item_Name: hItem.Item_Name,
            Unit_Type: hItem.Unit_Type,
            Rate: hItem.Rate || 10.00,
            Status: "Active",
            isCustom: true
          });
        }
      });

      if (catalogNeedsUpdating) {
        const expandedCatalog = sanitizeInventory([...inventory, ...catalogAppendList]);
        setInventory(expandedCatalog);
        await saveCatalogToTarget(expandedCatalog);
      }

      setQuantities(restoredQuantities);
      setCustomNotes(record.notes || "");
      triggerToast(`Restored ${record.items.length} items to active draft!`, "success");
    }
  };

  const stagedCount = useMemo(() => {
    return Object.values(quantities).filter((q): q is number => typeof q === "number" && q > 0).length;
  }, [quantities]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-800 flex flex-col selection:bg-emerald-500/20">
      
      {/* Dynamic Toast Feedback overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] max-w-sm w-full px-4"
          >
            <div className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 ${
              toast.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 animate-pulse"
                : toast.type === "rose"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-cyan-50 border-cyan-200 text-cyan-800"
            }`}>
              {toast.type === "success" ? (
                <div className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-4 w-4" />
                </div>
              ) : toast.type === "rose" ? (
                <div className="p-1 rounded-full bg-rose-100 text-rose-700">
                  <X className="h-4 w-4" />
                </div>
              ) : (
                <div className="p-1 rounded-full bg-cyan-100 text-cyan-700">
                  <Info className="h-4 w-4" />
                </div>
              )}
              <p className="text-xs font-bold font-sans flex-1">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!currentUser ? (
        <LoginScreen
          onGoogleSignIn={handleGoogleSignIn}
          onLocalAdminSignIn={() => {
            const appUser: AppUser = {
              uid: "sandbox-local-admin",
              email: "jeromelpintero@gmail.com",
              displayName: "App Administrator",
              photoURL: null,
              isAdmin: true,
              isSubAccount: false,
              role: "Admin"
            };
            localStorage.setItem("kitchen_app_sandbox_admin_session", JSON.stringify(appUser));
            setCurrentUser(appUser);
            triggerToast("Welcome back! Logged in as Local Administrator.", "success");
          }}
          onSubAccountSignIn={(appUser) => {
            setCurrentUser(appUser);
          }}
          triggerToast={triggerToast}
          authError={authError}
          inventory={inventory}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
        />
      ) : (
        <div className="flex-grow flex flex-col lg:flex-row w-full min-h-screen relative">
          {/* Unified Security Login Portal Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2"
            >
              {/* Left Column: Local Admin Sign-In */}
              <div className="p-8 bg-slate-50 border-r border-slate-100 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans">
                      Admin Portal
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-black text-slate-800 leading-tight">
                    Administrator Workspace Access
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Access the Administrator Workspace instantly. Administrators have exclusive access to manage sub-accounts, configure master ingredient parameters, and clear system archives.
                  </p>
                </div>

                <div className="space-y-3 mt-8 md:mt-0">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-[0.98] cursor-pointer"
                  >
                    <svg className="h-4 w-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.12-.63-.19-1.3-.19-2.06c0-.76.07-1.43.19-2.06l-2.85 2.22z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    Google Admin Sign-In
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200/60"></div>
                    <span className="flex-shrink mx-2 text-[8px] text-slate-400 font-bold uppercase tracking-wider font-sans">or testing mode</span>
                    <div className="flex-grow border-t border-slate-200/60"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const appUser: AppUser = {
                        uid: "sandbox-local-admin",
                        email: "jeromelpintero@gmail.com",
                        displayName: "App Administrator",
                        photoURL: null,
                        isAdmin: true,
                        isSubAccount: false,
                        role: "Admin"
                      };
                      localStorage.setItem("kitchen_app_sandbox_admin_session", JSON.stringify(appUser));
                      setCurrentUser(appUser);
                      setIsLoginModalOpen(false);
                      triggerToast("Welcome back! Logged in as Local Administrator.", "success");
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-sans text-[10px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Shield className="h-3 w-3 text-slate-400 shrink-0" />
                    Sandbox Local Admin Access
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-sans">
                    Secure SSO checks restrict google sign-in on live databases.
                  </p>

                  {authError === "unauthorized-domain" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-left text-amber-800 space-y-1.5 mt-2">
                      <p className="font-bold">Authorized Domains Required</p>
                      <p className="text-[10px] text-amber-700 leading-normal">
                        Firebase blocks auth requests from this domain: <strong className="font-mono text-[9px] select-all bg-white px-1 py-0.5 rounded border border-amber-200">{typeof window !== "undefined" ? window.location.hostname : ""}</strong>. Setup authorized domains in your Firebase Console under Auth settings.
                      </p>
                    </div>
                  )}

                  {authError && authError !== "unauthorized-domain" && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-left text-rose-800 space-y-1 mt-2">
                      <p className="font-bold">Auth Error</p>
                      <p className="text-[10px] text-rose-700 leading-normal">{authError}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Staff Username/Password Form */}
              <div className="p-8 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans">
                      Staff Portal
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-black text-slate-800 leading-tight">
                    Staff & Worker Credentials
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sign in using the username and code registered by your manager. Staff sessions maintain persistent local catalog databases and sync order dispatches to the master admin record.
                  </p>
                </div>

                {/* Subaccount Sign In Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const usernameVal = (target.elements.namedItem("subUsername") as HTMLInputElement).value;
                    const passwordVal = (target.elements.namedItem("subPassword") as HTMLInputElement).value;
                    
                    if (!usernameVal || !passwordVal) {
                      triggerToast("Please input your login credentials.", "rose");
                      return;
                    }

                    try {
                      // Check local storage database hub for subaccount
                      const localSubs = loadSubAccountsFromStorage();
                      const foundLocal = localSubs.find(
                        s => s.username === usernameVal.trim().toLowerCase() && s.password === passwordVal
                      );

                      if (foundLocal) {
                        const appUser: AppUser = {
                          uid: "local-sub-" + foundLocal.username,
                          displayName: foundLocal.displayName,
                          photoURL: null,
                          isAdmin: false,
                          isSubAccount: true,
                          role: foundLocal.role,
                          username: foundLocal.username,
                          adminUid: foundLocal.adminUid
                        };
                        
                        // Save login profile in local storage for refresh preservation
                        localStorage.setItem("kitchen_app_subaccount_session", JSON.stringify(appUser));
                        setCurrentUser(appUser);
                        setIsLoginModalOpen(false);
                        triggerToast(`Staff logged in successfully as: ${foundLocal.displayName}`, "success");
                      } else {
                        triggerToast("Invalid Staff Username or Password. Please try again.", "rose");
                      }
                    } catch (err) {
                      console.error("Credentials verification failed", err);
                      // Fallback: search local storage again
                      const localSubs = loadSubAccountsFromStorage();
                      const foundLocal = localSubs.find(
                        s => s.username === usernameVal.trim().toLowerCase() && s.password === passwordVal
                      );
                      if (foundLocal) {
                        const appUser: AppUser = {
                          uid: "local-sub-" + foundLocal.username,
                          displayName: foundLocal.displayName,
                          photoURL: null,
                          isAdmin: false,
                          isSubAccount: true,
                          role: foundLocal.role,
                          username: foundLocal.username,
                          adminUid: foundLocal.adminUid
                        };
                        localStorage.setItem("kitchen_app_subaccount_session", JSON.stringify(appUser));
                        setCurrentUser(appUser);
                        setIsLoginModalOpen(false);
                        triggerToast(`Staff logged in offline as: ${foundLocal.displayName}`, "success");
                      } else {
                        triggerToast("Authentication failed. Check your password or offline database.", "rose");
                      }
                    }
                  }}
                  className="space-y-3.5 mt-6"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Staff Username
                    </label>
                    <input
                      name="subUsername"
                      type="text"
                      required
                      placeholder="e.g. morningprep"
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Security Password
                      </label>
                      <span className="text-[9px] text-slate-400 font-sans">Plain text password</span>
                    </div>
                    <input
                      name="subPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-sans font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setIsLoginModalOpen(false)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-xs font-sans font-bold rounded-xl hover:bg-slate-50 cursor-pointer transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-sans font-black rounded-xl cursor-pointer shadow-sm transition active:scale-95"
                    >
                      Authenticate
                    </button>
                  </div>
                </form>

                <div className="relative flex py-2.5 mt-2 items-center">
                  <div className="flex-grow border-t border-slate-200/60"></div>
                  <span className="flex-shrink mx-2 text-[8px] text-slate-400 font-bold uppercase tracking-wider font-sans">or single sign-on</span>
                  <div className="flex-grow border-t border-slate-200/60"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-sans text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.12-.63-.19-1.3-.19-2.06c0-.76.07-1.43.19-2.06l-2.85 2.22z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  Sign in with Google SSO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PERSISTENT LEFT DETAILED DASHBOARD SIDEBAR (DESKTOP) */}
      <aside className="hidden lg:flex lg:w-72 bg-white border-r border-slate-200/85 sticky top-0 h-screen flex-col justify-between p-6 shrink-0 shadow-[1px_0_5px_rgba(0,0,0,0.02)] z-30">
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          {/* Brand/System Logo block */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-md shadow-emerald-500/10 shrink-0">
              <Utensils className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="font-display text-sm font-black tracking-tight text-slate-900 leading-none">
                Kitchen ERP
              </h1>
              <span className="text-[9.5px]/none font-bold text-slate-450 font-mono tracking-widest mt-1.5 block">
                {inventory.length} ITEMS COPIED
              </span>
            </div>
          </div>
          
          {renderSidebarContent(false)}

          {/* If there's an active draft, render a small summary prompt */}
          {activeGlobalTab !== "ordering" && stagedCount > 0 && (
            <div 
              onClick={() => setActiveGlobalTab("ordering")}
              className="bg-emerald-50 border border-emerald-200/60 p-4 rounded-2xl flex items-center justify-between shadow-3xs hover:border-emerald-300 transition-all cursor-pointer group animate-fade-in mt-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500 text-white group-hover:scale-110 transition duration-150 shrink-0">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase block font-sans truncate">
                    Active Draft Running
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold font-sans mt-0.5 block truncate">
                    {stagedCount} items staged
                  </span>
                </div>
              </div>
              <div className="text-emerald-500 font-bold text-xs select-none font-sans pl-2">→</div>
            </div>
          )}
        </div>

        {/* Local database indicator at bottom of desktop sidebar */}
        <div className="border-t border-slate-100 pt-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[10px] text-slate-450 uppercase tracking-widest font-mono">
            <span>Durable Db</span>
            <span className="text-emerald-600 font-black animate-pulse flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Active
            </span>
          </div>
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider font-sans">
            Protected Local Cache Sync
          </p>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay Drawer with Framer Motion */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
              className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 p-6 shadow-2xl lg:hidden border-r border-slate-200 flex flex-col justify-between overflow-y-auto"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-md shrink-0">
                      <Utensils className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <h1 className="font-display text-base font-black tracking-tight text-slate-900 leading-none">
                        Kitchen ERP
                      </h1>
                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-widest mt-1 block">
                        MOBILE CONSOLE
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 text-sm"
                  >
                    ✕
                  </button>
                </div>
                {renderSidebarContent(true)}
              </div>
              
              <div className="mt-8 border-t border-slate-100 pt-4 text-center">
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Kitchen ERP v4.0
                </p>
                <p className="text-[9px] text-slate-400 mt-1">
                  Offline-First Local Database Hub
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* RIGHT MAIN WORKSPACE AREA */}
      <div className="flex-grow flex flex-col min-h-screen min-w-0 bg-[#f8fafc]">
        {/* Dynamic header / Top bar of the workspace column */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-xs">
          
          {/* Page title and state indicators based on activeGlobalTab */}
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              <Menu className="h-4 w-4 text-emerald-600" />
            </button>
            
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] text-slate-400 font-bold font-sans uppercase tracking-wider">
                  Workspace
                </span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-[10px] text-slate-500 font-extrabold font-sans uppercase tracking-wider block">
                  {activeGlobalTab === "db_hub" ? "Hub DB" : activeGlobalTab}
                </span>
              </div>
              <h2 className="font-display text-sm font-black tracking-tight text-slate-800 uppercase mt-1 leading-none">
                {activeGlobalTab === "catalog" && "Ingredients Directory"}
                {activeGlobalTab === "ordering" && "Staged Manifest Staging"}
                {activeGlobalTab === "history" && "Transmission Archives"}
                {activeGlobalTab === "consumption" && "Consumption Analytics"}
                {activeGlobalTab === "admin" && "Administrator Terminal"}
                {activeGlobalTab === "db_hub" && "Database Raw Caches"}
              </h2>
            </div>
          </div>

          {/* Controls like Live clock, active shift selection, local currencies */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Time */}
            <div className="hidden xl:flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-505 font-mono">
              <Clock className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              <span>{liveTime.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" })}</span>
            </div>

            {/* Shift Selector */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-0.5 shadow-3xs">
              <span className="text-[9px] text-slate-400 uppercase font-black px-1.5 hidden sm:inline font-sans font-bold">
                Shift
              </span>
              <select
                value={activeShift}
                onChange={(e) => setActiveShift(e.target.value)}
                className="bg-transparent text-xs text-slate-705 font-bold border-none py-1 px-1 focus:ring-0 focus:outline-none cursor-pointer pr-4 font-sans focus:bg-transparent"
              >
                <option value="Morning">Morning</option>
                <option value="Noon">Noon</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-0.5 text-xs shadow-3xs font-sans">
              <span className="text-[9px] text-slate-400 uppercase font-black px-1.5 h-4 flex items-center justify-center shrink-0 border-r border-slate-200 mr-1.5 font-bold">
                Currency
              </span>
              <button
                onClick={() => handleCurrencyChange(currency.code === "ILS" ? { symbol: "$", code: "USD" } : { symbol: "₪", code: "ILS" })}
                className="text-slate-755 hover:text-slate-900 font-extrabold focus:outline-none px-1 py-0.5 rounded transition cursor-pointer select-none text-[11px]"
                title="Toggle Currency Standard"
              >
                {currency.code} ({currency.symbol})
              </button>
            </div>

            {/* Elegant Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              type="button"
              className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 transition shadow-3xs cursor-pointer select-none shrink-0"
              title={isDarkMode ? "Switch to Light theme" : "Switch to Dark theme"}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4 text-amber-400 animate-pulse" />
              ) : (
                <Moon className="h-4 w-4 text-emerald-600" />
              )}
            </button>
          </div>
        </header>

        {/* Workspace Active Stream Container */}
        <main className="flex-grow p-6 sm:p-8 min-w-0">
          <AnimatePresence mode="wait">
              {activeGlobalTab === "catalog" && (
                <motion.div
                  key="catalog"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-8"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="h-5 w-5 text-emerald-600 animate-bounce" />
                      <h2 className="font-display text-lg font-black text-slate-800">
                        Interactive Master Catalog
                      </h2>
                    </div>
                  </div>

                  <ItemGrid
                    items={inventory}
                    quantities={quantities}
                    onQuantityChange={handleQuantityAdjust}
                    onRateChange={handleRateChange}
                    onParLevelChange={handleParLevelChange}
                    onOnHandChange={handleOnHandChange}
                    onAddCustomItem={handleAddCustomItem}
                    onRenameCategory={handleRenameCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onItemCategoryChange={handleItemCategoryChange}
                    userCategories={userCategories}
                    setUserCategories={setUserCategories}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchQtyFilter={searchQtyFilter}
                    setSearchQtyFilter={setSearchQtyFilter}
                    searchExactCode={searchExactCode}
                    setSearchExactCode={setSearchExactCode}
                    currency={currency}
                    onUploadExcel={handleCatalogUpload}
                    isSubAccount={currentUser?.isSubAccount}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    itemNotes={itemNotes}
                    onUpdateItemNote={handleUpdateItemNote}
                    selectedSection={selectedSection}
                    setSelectedSection={setSelectedSection}
                    sectionsList={sectionsList}
                    setSectionsList={setSectionsList}
                    itemSectionTags={itemSectionTags}
                    setItemSectionTags={setItemSectionTags}
                    onTagSection={handleTagSection}
                  />
                </motion.div>
              )}

              {activeGlobalTab === "ordering" && (
                <motion.div
                  key="ordering"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-emerald-600 animate-pulse" />
                        <h2 className="font-display text-lg font-black text-slate-800">
                          Ordering & Manifest Workspace
                        </h2>
                      </div>
                    </div>

                    {/* Integrated Kitchen Sections Control - Moved directly here on the top of the ordering menu */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 border border-slate-200/80 p-3 rounded-2xl min-w-[320px]">
                      <div className="flex items-center justify-between gap-2 shrink-0">
                        <span className="text-slate-700 font-bold text-xs font-sans flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-emerald-600" />
                          Kitchen Sections:
                        </span>
                        {selectedSection !== "All" && (
                          <button
                            type="button"
                            onClick={() => setSelectedSection("All")}
                            className="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full transition cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <div className="flex-1 flex items-center gap-2">
                        <div className="relative w-full">
                          <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition cursor-pointer appearance-none pr-8 font-sans"
                          >
                            <option value="All">All Sections ({Object.values(itemSectionTags).length} tagged)</option>
                            {sectionsList.map((sec) => {
                              const taggedCount = Object.values(itemSectionTags).filter(v => v === sec).length;
                              return (
                                <option key={sec} value={sec}>
                                  {sec} {taggedCount > 0 ? `(${taggedCount})` : ""}
                                </option>
                              );
                            })}
                          </select>
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </div>
                        </div>

                        {selectedSection !== "All" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete the kitchen section "${selectedSection}"?`)) {
                                setSectionsList(prev => {
                                  const next = prev.filter(s => s !== selectedSection);
                                  localStorage.setItem("kitchen_app_user_sections", JSON.stringify(next));
                                  return next;
                                });
                                setItemSectionTags(prev => {
                                  const next = { ...prev };
                                  Object.keys(next).forEach(itemId => {
                                    if (next[itemId] === selectedSection) {
                                      delete next[itemId];
                                    }
                                  });
                                  localStorage.setItem("kitchen_app_item_sections", JSON.stringify(next));
                                  return next;
                                });
                                setSelectedSection("All");
                              }
                            }}
                            className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl transition cursor-pointer shadow-xs text-xs font-bold"
                            title={`Delete ${selectedSection} Section`}
                          >
                            <Trash2 className="p-1.5 h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Inline Creator Trigger */}
                        {isAddingSection ? (
                          <div className="flex items-center gap-1.5 animate-fade-in shrink-0 font-sans">
                            <input
                              id="new-section-input"
                              type="text"
                              placeholder="New section name..."
                              value={newSectionName}
                              onChange={(e) => setNewSectionName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const trimmed = newSectionName.trim();
                                  if (trimmed) {
                                    if (!sectionsList.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
                                      const updated = [...sectionsList, trimmed];
                                      setSectionsList(updated);
                                      localStorage.setItem("kitchen_app_user_sections", JSON.stringify(updated));
                                      setSelectedSection(trimmed);
                                    }
                                    setIsAddingSection(false);
                                    setNewSectionName("");
                                  }
                                } else if (e.key === "Escape") {
                                  setIsAddingSection(false);
                                  setNewSectionName("");
                                }
                              }}
                              className="bg-white border border-slate-300 text-slate-800 font-medium px-2.5 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden max-w-[125px] font-sans"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const trimmed = newSectionName.trim();
                                if (trimmed) {
                                  if (!sectionsList.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
                                    const updated = [...sectionsList, trimmed];
                                    setSectionsList(updated);
                                    localStorage.setItem("kitchen_app_user_sections", JSON.stringify(updated));
                                    setSelectedSection(trimmed);
                                  }
                                  setIsAddingSection(false);
                                  setNewSectionName("");
                                }
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer font-sans"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingSection(false);
                                setNewSectionName("");
                              }}
                              className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer font-sans"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAddingSection(true)}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl transition cursor-pointer shadow-xs font-semibold shrink-0"
                            title="New Kitchen Section"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Smart ERP Speed Search & Autocomplete Order Selector */}
                  <QuickCatalogSearch
                    items={selectedSection === "All" ? inventory : inventory.filter(item => itemSectionTags[item.Item_ID] === selectedSection)}
                    quantities={quantities}
                    onQuantityChange={handleQuantityAdjust}
                    currency={currency}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchExactCode={searchExactCode}
                    setSearchExactCode={setSearchExactCode}
                  />

                  {/* Combined Live Manifest Workspace */}
                  <div className="border-t border-slate-100 pt-8 mt-4">
                    <SidebarCart
                      items={inventory}
                      quantities={quantities}
                      activeShift={activeShift}
                      onQuantityChange={handleQuantityAdjust}
                      onClearDraft={handleClearDraft}
                      onSubmitOrder={handleSubmitKitchenOrder}
                      currency={currency}
                      onCurrencyChange={handleCurrencyChange}
                      notes={customNotes}
                      onNotesChange={setCustomNotes}
                      isSubAccount={currentUser?.isSubAccount}
                      selectedSection={selectedSection}
                      itemSectionTags={itemSectionTags}
                    />
                  </div>
                </motion.div>
              )}

              {activeGlobalTab === "history" && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-emerald-600" />
                      <h2 className="font-display text-lg font-black text-slate-800">
                        Submission Archives & Logs
                      </h2>
                    </div>
                  </div>

                  <OrderHistoryList
                    history={history}
                    onClearHistory={handleClearHistory}
                    onDeleteRecord={(id) => handleDeleteRecord(String(id))}
                    onRestoreRecord={handleRestoreRecord}
                    currency={currency}
                    isSubAccount={currentUser?.isSubAccount}
                    receivedItems={receivedItems}
                    onToggleReceived={handleToggleReceived}
                  />
                </motion.div>
              )}

              {activeGlobalTab === "consumption" && (
                <motion.div
                  key="consumption"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  <ConsumptionDashboard
                    history={history}
                    inventory={inventory}
                    currency={currency}
                    userSections={sectionsList}
                    itemSectionTags={itemSectionTags}
                    isSubAccount={currentUser?.isSubAccount}
                  />
                </motion.div>
              )}

              {activeGlobalTab === "admin" && currentUser?.isAdmin && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-8"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-amber-500 animate-pulse" />
                      <h2 className="font-display text-lg font-black text-slate-800">
                        Admin Console & Staff Accounts Management
                      </h2>
                    </div>
                    <p className="text-slate-500 text-xs sm:text-sm font-sans leading-relaxed">
                      Only administrators can create staff accounts. These credentials allow staff members to sign in securely, load your inventory catalog, and register orders to your database.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Create sub account Form */}
                    <div className="md:col-span-5 bg-white border border-slate-200/85 rounded-2xl p-6 shadow-xs space-y-5">
                      <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Lock className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-sans">
                          Create Staff Account
                        </h3>
                      </div>

                      <form onSubmit={handleCreateSubAccount} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Login Username
                          </label>
                          <input
                            type="text"
                            value={newSubUsername}
                            onChange={(e) => setNewSubUsername(e.target.value)}
                            placeholder="e.g. morningprep"
                            required
                            className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={newSubDisplayName}
                            onChange={(e) => setNewSubDisplayName(e.target.value)}
                            placeholder="e.g. Morning Prep Staff"
                            required
                            className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                            <span>Google Email for Single Sign-On</span>
                            <span className="text-[9px] text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="email"
                            value={newSubEmail}
                            onChange={(e) => setNewSubEmail(e.target.value)}
                            placeholder="e.g. staff.member@gmail.com"
                            className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Security Password (Plain text)
                          </label>
                          <input
                            type="text"
                            value={newSubPassword}
                            onChange={(e) => setNewSubPassword(e.target.value)}
                            placeholder="e.g. secret123"
                            required
                            className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-sans font-mono"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Register Staff Account
                        </button>
                      </form>
                    </div>

                    {/* Sub accounts Listing table */}
                    <div className="md:col-span-7 bg-white border border-slate-200/85 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
                      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-emerald-600" />
                          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-sans">
                            Existing Sub-Accounts
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full font-mono">
                          {subAccounts.length} Registered
                        </span>
                      </div>

                      {subAccounts.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs font-sans">
                          No sub-accounts registered yet. Create one on the left panel!
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full table-auto border-collapse text-left text-xs font-sans">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 font-bold">
                                <th className="pb-2.5">Display Name</th>
                                <th className="pb-2.5">Username</th>
                                <th className="pb-2.5">Google SSO Email</th>
                                <th className="pb-2.5">Password</th>
                                <th className="pb-2.5">Role</th>
                                <th className="pb-2.5 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-600">
                              {subAccounts.map((sub) => (
                                <tr key={sub.username} className="hover:bg-slate-50/50">
                                  <td className="py-3 font-semibold text-slate-800">{sub.displayName}</td>
                                  <td className="py-3 font-mono">{sub.username}</td>
                                  <td className="py-3 text-slate-500 font-mono text-[11px] max-w-[150px] truncate" title={sub.email || "Not linked"}>
                                    {sub.email ? (
                                      <span className="text-emerald-700 bg-emerald-50/70 border border-emerald-100 px-1.5 py-0.5 rounded font-medium">
                                        {sub.email}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic">None</span>
                                    )}
                                  </td>
                                  <td className="py-3 font-mono bg-slate-50/30 px-1 rounded-sm">{sub.password}</td>
                                  <td className="py-3">
                                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">
                                      {sub.role}
                                    </span>
                                  </td>
                                  <td className="py-3 text-right">
                                    <button
                                      onClick={() => handleDeleteSubAccount(sub.username)}
                                      className="text-rose-500 hover:text-rose-700 font-bold text-[10px] transition cursor-pointer"
                                    >
                                      Revoke
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeGlobalTab === "db_hub" && (
                <motion.div
                  key="db_hub"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-8"
                >
                  {/* Top Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-50 rounded-xl">
                          <Database className="h-6 w-6 text-amber-500 animate-pulse" />
                        </div>
                        <div>
                          <h2 className="font-display text-xl font-black text-slate-800 leading-none">
                            Local Storage Database Hub
                          </h2>
                          <p className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wide mt-1 font-mono">
                            Operational Status: Local Host Master Truth Hub Active (Offline-First)
                          </p>
                        </div>
                      </div>
                      <p className="text-slate-500 text-xs sm:text-sm font-sans leading-relaxed max-w-2xl">
                        Your browser's <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs font-mono">localStorage</code> serves as the primary system database hub. All catalog updates, order transactions, and manager sub-account databases persist dynamically.
                      </p>
                    </div>

                    {/* Quick Database Backup / Restore Actions */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <input 
                        type="file" 
                        ref={dbHubFileInputRef} 
                        onChange={handleDbHubImport} 
                        accept=".json" 
                        className="hidden" 
                      />
                      <button
                        onClick={() => dbHubFileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 font-sans font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-blue-600" />
                        Import Dump (.json)
                      </button>
                      <button
                        onClick={handleDbHubExport}
                        className="px-4 py-2.5 bg-slate-800 text-white font-sans font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-slate-900 active:scale-95 transition cursor-pointer shadow-xs"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                        Export Backup (.json)
                      </button>
                    </div>
                  </div>

                  {/* Spreadsheet Synchronization & Catalog Management Card */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-xl">
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider font-sans flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        Spreadsheet Integration & Catalog Seed
                      </h4>
                      <p className="text-slate-500 text-[11px] leading-relaxed font-semibold font-sans">
                        Import bulk warehouse inventory via custom XLSX/CSV spreadsheets, load demo datasets to preview features instantly, or export empty structured sheets to start from scratch.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <input
                        type="file"
                        ref={catalogFileInputRef}
                        onChange={handleCatalogUpload}
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                      />
                      <button
                        onClick={() => catalogFileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-emerald-600 text-white font-sans font-extrabold text-xs rounded-xl flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition cursor-pointer shadow-sm shadow-emerald-600/10"
                        title="Upload Custom Excel/CSV Catalog"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Catalog (XLSX)
                      </button>



                      <button
                        onClick={downloadBlankMasterTemplate}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-sans font-extrabold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition cursor-pointer"
                        title="Get Empty Catalog SpreadSheet Boilerplate"
                      >
                        <Download className="h-3.5 w-3.5 text-slate-500" />
                        Download Template
                      </button>
                    </div>
                  </div>

                  {/* 4-Item Analytical KPI Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Catalog KPI */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition duration-200 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                            Catalog Table
                          </span>
                          <span className="text-2xl font-black text-slate-800 font-sans block">
                            {inventory.length}
                          </span>
                        </div>
                        <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold font-mono">
                          items
                        </span>
                      </div>
                      <div className="border-t border-slate-50 mt-4 pt-3 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Key: <code className="font-mono">..._catalog_v2</code></span>
                        <span className="font-semibold text-emerald-600">Active</span>
                      </div>
                    </div>

                    {/* Archives KPI */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition duration-200 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                            Archives Table
                          </span>
                          <span className="text-2xl font-black text-slate-800 font-sans block">
                            {history.length}
                          </span>
                        </div>
                        <span className="p-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold font-mono">
                          logs
                        </span>
                      </div>
                      <div className="border-t border-slate-50 mt-4 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Key: ..._history_v2</span>
                        <span className="font-semibold text-blue-600 non-mono">Archived</span>
                      </div>
                    </div>

                    {/* Staff Accounts KPI */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition duration-200 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                            Sub-Accounts Table
                          </span>
                          <span className="text-2xl font-black text-slate-800 font-sans block">
                            {subAccounts.length}
                          </span>
                        </div>
                        <span className="p-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold font-mono">
                          users
                        </span>
                      </div>
                      <div className="border-t border-slate-50 mt-4 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Key: ..._hub_v2</span>
                        <span className="font-semibold text-purple-600 non-mono">Secured</span>
                      </div>
                    </div>

                    {/* Estimated Storage Allocation KPI */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition duration-200 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                            Browser Footprint
                          </span>
                          <span className="text-2xl font-black text-slate-800 font-sans block">
                            {(( (localStorage.getItem("kitchen_inventory_catalog_v2") || "").length + (localStorage.getItem("kitchen_order_history_v2") || "").length + (localStorage.getItem("kitchen_subaccounts_hub_v2") || "").length ) / 1024).toFixed(3)} KB
                          </span>
                        </div>
                        <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-bold font-mono">
                          allocated
                        </span>
                      </div>
                      <div className="border-t border-slate-50 mt-4 pt-3 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Max Quota: 5.0 MB</span>
                        <span className="font-semibold text-amber-600">Optimized</span>
                      </div>
                    </div>
                  </div>

                  {/* Core Sync and Nuke Admin Panel */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-slate-600 font-semibold font-sans">
                        Need a fresh scrub of the local Database Hub? All records will be wiped.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDbHubReset}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-sans font-black text-xs rounded-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        Nuke Database Hub
                      </button>
                    </div>
                  </div>


                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Static Humanized Simple Footer */}
          <footer className="border-t border-slate-200 bg-white py-5 px-6 text-center text-xs text-slate-400 font-mono mt-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>Kitchen Order ERP System • Active Session Operator Workspace</div>
            <div className="font-extrabold text-emerald-600 tracking-wider">DURABLE LOCAL DATABASE SYNC ACTIVE</div>
          </footer>
        </div>
      </div>
      )}

    </div>
  );
}
