import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Users, 
  Lock, 
  UtensilsCrossed, 
  Clock, 
  Sparkles, 
  Check, 
  ArrowRight,
  Database,
  Terminal,
  Activity,
  Globe,
  AlertTriangle,
  Copy,
  ExternalLink,
  Search,
  Tag,
  Filter,
  Package,
  Sun,
  Moon
} from "lucide-react";
import { AppUser, SubAccount, KitchenItem } from "../types";
import { loadSubAccountsFromStorage, loadInventoryFromStorage } from "../data";
import { motion } from "motion/react";

interface LoginScreenProps {
  onGoogleSignIn: () => void;
  onLocalAdminSignIn: () => void;
  onSubAccountSignIn: (user: AppUser) => void;
  triggerToast: (message: string, type: "success" | "info" | "rose") => void;
  authError?: string | null;
  inventory?: KitchenItem[];
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function LoginScreen({
  onGoogleSignIn,
  onLocalAdminSignIn,
  onSubAccountSignIn,
  triggerToast,
  authError,
  inventory,
  isDarkMode = false,
  onToggleDarkMode
}: LoginScreenProps) {
  const [subUsername, setSubUsername] = useState("");
  const [subPassword, setSubPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());
  const [copied, setCopied] = useState(false);
  
  const [activeCatalog, setActiveCatalog] = useState<KitchenItem[]>([]);
  const [invSearchQuery, setInvSearchQuery] = useState("");
  const [selectedInvCategory, setSelectedInvCategory] = useState("All");

  useEffect(() => {
    if (inventory && inventory.length > 0) {
      setActiveCatalog(inventory);
    } else {
      setActiveCatalog(loadInventoryFromStorage());
    }
  }, [inventory]);

  const currentDomain = typeof window !== "undefined" ? window.location.hostname : "";

  const categories = ["All", ...Array.from(new Set(activeCatalog.map(item => item.Category).filter(Boolean)))];

  const filteredCatalog = activeCatalog.filter(item => {
    const q = invSearchQuery.toLowerCase().trim();
    const nameMatch = item.Item_Name.toLowerCase().includes(q);
    const idMatch = item.Item_ID.toLowerCase().includes(q);
    const supplierMatch = item.Supplier ? item.Supplier.toLowerCase().includes(q) : false;
    const catMatch = selectedInvCategory === "All" || item.Category === selectedInvCategory;
    return (nameMatch || idMatch || supplierMatch) && catMatch;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopied(true);
    triggerToast("Domain copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  // Update live time
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current active shift
  const getActiveShift = () => {
    const hr = liveTime.getHours();
    if (hr >= 5 && hr < 11) return { name: "Produce", emoji: "🌅" };
    if (hr >= 11 && hr < 16) return { name: "Bakery & Sauce", emoji: "☀️" };
    if (hr >= 16 && hr < 22) return { name: "Meat", emoji: "🌆" };
    return { name: "Warehouse", emoji: "🌙" };
  };

  const currentShift = getActiveShift();

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subUsername || !subPassword) {
      triggerToast("Please enter both staff username and security password.", "rose");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      try {
        const localSubs = loadSubAccountsFromStorage();
        const found = localSubs.find(
          s => s.username === subUsername.trim().toLowerCase() && s.password === subPassword
        );

        if (found) {
          const appUser: AppUser = {
            uid: "local-sub-" + found.username,
            displayName: found.displayName,
            photoURL: null,
            isAdmin: false,
            isSubAccount: true,
            role: found.role,
            username: found.username,
            adminUid: found.adminUid
          };
          onSubAccountSignIn(appUser);
          triggerToast(`Logged in successfully as ${found.displayName}`, "success");
        } else {
          // Check if there are no subaccounts configured yet, provide a helper toast
          if (localSubs.length === 0) {
            triggerToast("No staff accounts found. Log in as an Admin to create staff credentials first.", "info");
          } else {
            triggerToast("Invalid Staff Username or Security Password.", "rose");
          }
        }
      } catch (err) {
        console.error("Staff log in failed", err);
        triggerToast("Authentication failed. Please verify credentials.", "rose");
      } finally {
        setIsSubmitting(false);
      }
    }, 400); // Small realistic security delay
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-emerald-500/20">
      
      {/* Upper Navigation Indicator Bar */}
      <div className="bg-slate-900 text-slate-400 py-3 px-6 text-xs flex justify-between items-center border-b border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-500" />
          <span className="font-mono text-[10px] uppercase font-black tracking-wider text-slate-300">
            kitchen ops system terminal #kosv3
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-sans text-[10px] uppercase tracking-wider text-slate-300 font-bold">Local DB Hub: Ready</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono font-medium text-slate-300">
              {liveTime.toLocaleTimeString("en-US", { hour12: false })}
            </span>
          </div>
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              type="button"
              className="flex items-center justify-center p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer select-none"
              title={isDarkMode ? "Switch to Light theme" : "Switch to Dark theme"}
            >
              {isDarkMode ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:py-16 flex flex-col justify-center items-center">
        
        {/* Welcome branding banner */}
        <div className="text-center mb-10 w-full max-w-xl">
          <div className="inline-flex items-center justify-center bg-emerald-600 text-white p-4 rounded-2xl shadow-xl shadow-emerald-500/20 mb-5 animate-bounce">
            <UtensilsCrossed className="h-8 w-8" />
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Kitchen Operations Suite
          </h2>
          <p className="mt-3.5 text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            High-efficiency order orchestration & real-time inventory management. Log in to start receiving and routing active orders.
          </p>

          {/* Quick Stats Grid deleted as requested */}
        </div>

        {/* Credentials Form Card */}
        <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 font-sans">
            
            {/* Left Portal: Staff Authentication */}
            <div className="p-6 sm:p-8 space-y-5 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center gap-2 text-emerald-600 justify-center sm:justify-start">
                    <Users className="h-5 w-5" />
                    <span className="font-mono text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 rounded-full">
                      Staff Portal
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">
                    Staff Authentication
                  </h3>
                  <p className="text-xs text-slate-500">
                    Input your custom worker username and security password registered by your active system administrator.
                  </p>
                </div>

                {/* Subaccount Form */}
                <form onSubmit={handleStaffSubmit} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                      Staff Username
                    </label>
                    <input
                      name="staffUsername"
                      type="text"
                      value={subUsername}
                      onChange={(e) => setSubUsername(e.target.value)}
                      required
                      placeholder="e.g. morningprep"
                      className="w-full px-4 py-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-sans shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                        Security Password
                      </label>
                      <span className="text-[9px] text-slate-400">Plain text password</span>
                    </div>
                    <input
                      name="staffPassword"
                      type="password"
                      value={subPassword}
                      onChange={(e) => setSubPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-sans font-mono shadow-inner"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10 transition duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{isSubmitting ? "Verifying Credentials..." : "Access Live Workspace"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Demonstration helper alerts */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 shadow-inner text-left mt-4">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-sans flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" /> Need a test staff account?
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Staff accounts must be registered first via the Admin commands. Sign in as Admin first on the right side, navigate to Sub-Accounts under database settings, and register staff credentials!
                </p>
              </div>
            </div>

            {/* Right Portal: Administrator Command Center */}
            <div className="p-6 sm:p-8 space-y-5 bg-slate-50/25">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center gap-2 text-emerald-600 justify-center sm:justify-start">
                  <Shield className="h-5 w-5" />
                  <span className="font-mono text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                    Control Center
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  Administrator Center
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Log in to configure inventory parameters, import spreadsheets, audit sub-accounts, and access global database hubs.
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-[0.98] cursor-pointer"
                >
                  <svg className="h-4 w-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.12-.63-.19-1.3-.19-2.06c0-.76.07-1.43.19-2.06l-2.85 2.22z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  Google Admin SSO Sign-In
                </button>

                {authError === "unauthorized-domain" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-3 mt-1 text-left text-slate-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-800 font-sans text-sm">
                          Authorized Domains Required
                        </h4>
                        <p className="text-amber-700 font-sans text-[11px] leading-relaxed mt-0.5">
                          Firebase blocks login from this dynamic preview environment. You need to authorize this domain inside your Firebase Authentication settings first.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-amber-200/60 rounded-xl p-2.5 font-mono text-[10px] text-slate-600 flex items-center justify-between gap-2 shadow-inner">
                      <span className="truncate select-all">{currentDomain}</span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-sans font-bold text-[9px] rounded-md transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 pl-1.5 border-l-2 border-amber-300 text-[10.5px] leading-relaxed text-slate-600 font-medium">
                      <p>
                        <strong className="text-amber-800">1.</strong> Go to your <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-bold inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="h-2.5 w-2.5" /></a>.
                      </p>
                      <p>
                        <strong className="text-amber-800">2.</strong> Go to <strong>Authentication</strong> ➔ <strong>Settings</strong> ➔ <strong>Authorized domains</strong>.
                      </p>
                      <p>
                        <strong className="text-amber-800">3.</strong> Click <strong>"Add Domain"</strong> and paste the copied domain from above, then save.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-amber-200/50">
                      <p className="text-[10px] text-amber-800 font-bold mb-1.5">
                        💡 Want to test instantly without modifying Firebase domain settings?
                      </p>
                      <button
                        type="button"
                        onClick={onLocalAdminSignIn}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-[10px] font-black py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-xs"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>Bypass via Sandbox Administrator Access</span>
                      </button>
                    </div>
                  </div>
                )}

                {authError && authError !== "unauthorized-domain" && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs mt-1 text-left text-slate-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-rose-800 font-sans text-sm">
                          Authentication Error
                        </h4>
                        <p className="text-rose-700 font-sans text-[11px] leading-relaxed mt-0.5">
                          {authError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3.5 text-[8px] text-slate-400 font-bold uppercase tracking-widest font-sans">local grading & preview mode</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button
                  type="button"
                  onClick={onLocalAdminSignIn}
                  className="w-full bg-slate-100 hover:bg-slate-200/90 text-slate-700 font-sans text-xs font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 cursor-pointer border border-slate-200/60"
                >
                  <Shield className="h-4 w-4 text-emerald-600 animate-pulse" />
                  Sandbox Local Admin Access (One-click login)
                </button>

                <p className="text-[10px] text-slate-400 text-center leading-relaxed mt-2 text-slate-500">
                  Sandbox login simulates immediate offline administrative tokens. Live Google SSO will only authorize configured project owners.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Live Catalog / Inventory Explorer Section */}
        <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mt-8 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-2xl border border-emerald-100">
                <Database className="h-5.5 w-5.5 text-emerald-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-slate-800 tracking-tight font-sans">
                  Live Master Catalog Explorer
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans leading-normal">
                  Real-time read-only stock lookup for kitchen staff and administrators before active session login.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50/60 px-4 py-2 rounded-2xl border border-emerald-200/50 font-mono text-xs font-bold text-emerald-800 self-start sm:self-center">
              <Package className="h-4 w-4 text-emerald-600" />
              <span>Catalog Records:</span>
              <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg text-[10.5px] ml-1 shadow-sm font-black text-center">
                {activeCatalog.length}
              </span>
            </div>
          </div>

          {/* Filtering and search controls */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-grow">
              <input
                type="text"
                value={invSearchQuery}
                onChange={(e) => setInvSearchQuery(e.target.value)}
                placeholder="Lookup standard products, ID numbers, supplier strings..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-sans shadow-3xs"
              />
              <span className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              {invSearchQuery && (
                <button
                  type="button"
                  onClick={() => setInvSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-450 hover:text-slate-650 bg-slate-100 font-bold px-1.5 py-0.5 rounded cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Select Filters */}
            <div className="flex flex-wrap items-center gap-1.5 self-start xl:self-center">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1 mr-1.5 font-sans">
                <Filter className="h-3.5 w-3.5 text-slate-400" /> Category:
              </span>
              <div className="flex items-center gap-1">
                {categories.slice(0, 4).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedInvCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      selectedInvCategory === cat
                        ? "bg-slate-900 text-white shadow-sm border border-slate-900"
                        : "bg-white border border-slate-200/80 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                {categories.length > 4 && (
                  <select
                    value={categories.includes(selectedInvCategory) && categories.indexOf(selectedInvCategory) >= 4 ? selectedInvCategory : ""}
                    onChange={(e) => {
                      if (e.target.value) setSelectedInvCategory(e.target.value);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer focus:outline-none"
                  >
                    <option value="">More Directories...</option>
                    {categories.slice(4).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Table / List Grid scroll wrapper */}
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-3xs max-w-full">
            <div className="overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar">
              {filteredCatalog.length > 0 ? (
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 backdrop-blur-xs text-slate-400 font-extrabold uppercase border-b border-slate-200 tracking-wider text-[9.5px]">
                      <th className="py-3 px-4">Identifier ID</th>
                      <th className="py-3 px-4">Ingredient Name</th>
                      <th className="py-3 px-4">Directory Category</th>
                      <th className="py-3 px-4 text-right">Standard Cost Price</th>
                      <th className="py-3 px-4 text-center">Packaging Unit</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCatalog.map(item => (
                      <tr key={item.Item_ID} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 font-mono font-black text-slate-450 select-all tracking-wider text-[11px]" style={{ maxWidth: "125px" }}>
                          {item.Item_ID}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-800 text-[12px]">
                          {item.Item_Name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg text-[9.5px] border border-emerald-100/50 shadow-3xs select-none">
                            <Tag className="h-2.5 w-2.5 text-emerald-600" />
                            {item.Category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-700 text-[12px]">
                          ₪{item.Rate.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                          {item.Unit_Type}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.Status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {item.Status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-14 text-center text-slate-450 flex flex-col items-center justify-center gap-2">
                  <Database className="h-8 w-8 text-slate-350 animate-bounce" />
                  <span className="text-xs font-black text-slate-700">No Catalog items found matching your filters</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Try expanding search query terms or changing filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Helpful user reminders / credits */}
        <p className="mt-8 text-[11px] text-slate-400 text-center font-sans">
          This system uses an offline-first storage engine for immediate zero-latency execution.
        </p>
      </div>

      {/* Footer footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center">
        <p className="text-[10px] text-slate-400 font-mono tracking-wide">
          © {new Date().getFullYear()} Kitchen Operations Suite. Protected by Sandbox Sandbox. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
