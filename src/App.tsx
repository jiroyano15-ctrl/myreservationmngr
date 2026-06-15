/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

// Types & Defaults
import { Guest, TableConfig, RsvpStatus } from "./types";
import { initialGuests, initialTables, initialStaff } from "./data/mockData";

// Config
import { clientConfig } from "./lib/config";

// Cloud
import { supabase } from "@/integrations/supabase/client";
import { getAppState, saveAppState } from "./lib/app-state.functions";

// Specialized Views & Overlays
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import ReservationsView from "./components/ReservationsView";
import TableMapView from "./components/TableMapView";
import EntryModal from "./components/EntryModal";
import StaffManagerModal from "./components/StaffManagerModal";
import SyncConfigPanel from "./components/SyncConfigPanel";
import ConfirmModal from "./components/ConfirmModal";

// Timezone Utilities
import {
  getDetectedTimezone,
  getSystemTime24InTimezone,
} from "./utils/timezone";

interface CloudBlob {
  guests?: Guest[];
  tables?: TableConfig[];
  staffList?: string[];
  restaurantName?: string;
  restaurantPhoto?: string | null;
  timezone?: string;
}

export default function App() {
  const navigate = useNavigate();
  const fetchState = useServerFn(getAppState);
  const persistState = useServerFn(saveAppState);

  const [loggedUsername, setLoggedUsername] = useState<string | null>(null);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // Bootstrap: read current user, then load their cloud state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }
      if (cancelled) return;
      setLoggedUsername(user.email ?? user.id);

      try {
        const result = await fetchState({});
        if (cancelled) return;
        const blob = (result.data ?? {}) as CloudBlob;

        setRawGuests(Array.isArray(blob.guests) && blob.guests.length ? blob.guests : initialGuests);
        setTables(Array.isArray(blob.tables) && blob.tables.length ? blob.tables : initialTables);
        setStaffList(Array.isArray(blob.staffList) && blob.staffList.length ? blob.staffList : initialStaff);
        setRestaurantName(blob.restaurantName || clientConfig.appName);
        setRestaurantPhoto(blob.restaurantPhoto ?? null);
        setTimezone(blob.timezone || "AUTO");
      } catch (err) {
        console.error("Failed to load cloud state", err);
        setRawGuests(initialGuests);
        setTables(initialTables);
        setStaffList(initialStaff);
      } finally {
        if (!cancelled) setCloudLoaded(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAccountKey = (keyName: string) => {
    if (!loggedUsername) return `guest_rsvp_mngr_${keyName}`;
    const safeUser = loggedUsername.toLowerCase().trim().replace(/[@.]/g, "_");
    return `guest_rsvp_mngr_${safeUser}_${keyName}`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showToast("🔓 Signed out");
    navigate({ to: "/auth" });
  };

  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState<"dashboard" | "reservations" | "tablemap">("dashboard");

  // Restaurant brand
  const [restaurantName, setRestaurantName] = useState(clientConfig.appName);
  const [restaurantPhoto, setRestaurantPhoto] = useState<string | null>(null);

  const handleSaveRestaurantName = (name: string) => {
    setRestaurantName(name);
    showToast(`🏨 Restaurant updated to: ${name}`);
  };

  const handleSaveRestaurantPhoto = (photo: string | null) => {
    setRestaurantPhoto(photo);
    showToast(photo ? "📸 Restaurant photo updated" : "🗑️ Restaurant logo reset");
  };

  // Timezone & clock
  const [timezone, setTimezone] = useState("AUTO");
  const [currentTime, setCurrentTime] = useState("");
  const activeTz = timezone === "AUTO" ? getDetectedTimezone() : timezone;

  useEffect(() => {
    const updateTime = () => setCurrentTime(getSystemTime24InTimezone(activeTz));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeTz]);

  // Mobile drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Core data
  const [guests, setRawGuests] = useState<Guest[]>([]);
  const setGuests = React.useCallback((value: Guest[] | ((prev: Guest[]) => Guest[])) => {
    setRawGuests(prev => {
      const resolved = typeof value === "function" ? value(prev) : value;
      return resolved.map(g => {
        let cleanDate = g.date || "";
        if (cleanDate && (cleanDate.includes("T") || cleanDate.includes("Z"))) {
          try {
            const d = new Date(cleanDate);
            if (!isNaN(d.getTime())) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              cleanDate = `${year}-${month}-${day}`;
            } else {
              cleanDate = cleanDate.split("T")[0];
            }
          } catch {
            cleanDate = cleanDate.split("T")[0];
          }
        }
        return { ...g, date: cleanDate };
      });
    });
  }, []);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [staffList, setStaffList] = useState<string[]>([]);

  // Sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Debounced save to cloud whenever the relevant state changes.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerialized = useRef<string>("");
  useEffect(() => {
    if (!cloudLoaded || !loggedUsername) return;
    const blob: CloudBlob = {
      guests,
      tables,
      staffList,
      restaurantName,
      restaurantPhoto,
      timezone,
    };
    const serialized = JSON.stringify(blob);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    setHasUnsavedChanges(true);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setIsSyncing(true);
        await persistState({ data: { data: JSON.parse(serialized) } });
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error("Cloud save failed", err);
        showToast("⚠️ Sync failed — will retry");
      } finally {
        setIsSyncing(false);
      }
    }, 800);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests, tables, staffList, restaurantName, restaurantPhoto, timezone, cloudLoaded, loggedUsername]);

  // Modals
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryModalInitialType, setEntryModalInitialType] = useState<"Reservation" | "Walk-In">("Reservation");
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Toasts
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3500);
  };

  // Handlers
  const handleSaveGuest = (savedGuest: Guest) => {
    const exists = guests.some(g => g.id === savedGuest.id);
    if (exists) {
      setGuests(guests.map(g => (g.id === savedGuest.id ? savedGuest : g)));
      showToast(`✏️ ${savedGuest.name}'s details updated`);
    } else {
      setGuests([savedGuest, ...guests]);
      showToast(`✅ Added reservation for ${savedGuest.name}`);
    }
    setIsEntryModalOpen(false);
    setGuestToEdit(null);
  };

  const handleUpdateGuestStatus = (id: string, newStatus: RsvpStatus) => {
    setGuests(guests.map(g => (g.id === id ? { ...g, status: newStatus } : g)));
    showToast(`⚡ Status updated to: ${newStatus}`);
  };

  const handleDeleteGuest = (id: string) => {
    const target = guests.find(g => g.id === id);
    if (!target) return;
    setConfirmState({
      isOpen: true,
      title: "Remove Booking",
      message: `Are you absolutely sure you want to remove the booking for ${target.name}?`,
      onConfirm: () => {
        setGuests(guests.filter(g => g.id !== id));
        showToast(`🗑️ ${target.name}'s reservation deleted`);
      }
    });
  };

  const handleBulkUpdateGuestStatus = (ids: string[], newStatus: RsvpStatus) => {
    setGuests(guests.map(g => ids.includes(g.id) ? { ...g, status: newStatus } : g));
    showToast(`⚡ Bulk updated ${ids.length} reservation(s) to: ${newStatus}`);
  };

  const handleBulkDeleteGuests = (ids: string[]) => {
    setConfirmState({
      isOpen: true,
      title: "Bulk Delete Bookings",
      message: `Are you absolutely sure you want to delete the ${ids.length} selected reservation(s)?`,
      onConfirm: () => {
        setGuests(guests.filter(g => !ids.includes(g.id)));
        showToast(`🗑️ Bulk deleted ${ids.length} reservation(s)`);
      }
    });
  };

  const handleEditGuestClick = (guest: Guest) => {
    setGuestToEdit(guest);
    setIsEntryModalOpen(true);
  };

  const handleOpenEntryModalDirect = (type: "Reservation" | "Walk-In") => {
    setEntryModalInitialType(type);
    setGuestToEdit(null);
    setIsEntryModalOpen(true);
  };

  const handleUpdateGuestTableDirect = (guestId: string, tableName: string, forceStatus?: RsvpStatus) => {
    setGuests(guests.map(g => (g.id === guestId ? { ...g, table: tableName, status: forceStatus || g.status } : g)));
    showToast(`🔗 Assigned table to guest`);
  };

  const handleUpdateTableConfig = (newTables: TableConfig[]) => {
    setTables(newTables);
    showToast("⚙️ Table configuration updated");
  };

  const handleAddStaff = (name: string) => {
    if (staffList.includes(name)) {
      showToast("👤 Staff member already exists");
      return;
    }
    setStaffList([...staffList, name]);
    showToast(`👤 Staff ${name} registered`);
  };

  const handleRemoveStaff = (index: number) => {
    const targetName = staffList[index];
    setStaffList(staffList.filter((_, i) => i !== index));
    showToast(`🗑️ ${targetName} removed`);
  };

  const handleManualSaveAll = async () => {
    if (!cloudLoaded) return;
    try {
      setIsSyncing(true);
      const blob = { guests, tables, staffList, restaurantName, restaurantPhoto, timezone };
      await persistState({ data: { data: JSON.parse(JSON.stringify(blob)) } });
      setHasUnsavedChanges(false);
      showToast("☁️ Saved to your account");
    } catch (err) {
      console.error(err);
      showToast("⚠️ Save failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiscardChanges = () => {
    showToast("ℹ️ Auto-sync is on — changes save automatically");
  };

  const handleImportGuests = (imported: Guest[]) => {
    setGuests(imported);
    showToast(`📊 Imported ${imported.length} reservations`);
  };

  const handleClearAllGuests = () => {
    setGuests([]);
    showToast("🧹 All reservations cleared");
  };

  const exportCSV = () => {
    const headers = ["ID", "Name", "Phone", "Type", "Date", "Time", "Pax", "Table Assigned", "Status", "Booked By", "Special Request Notes"];
    const rows = guests.map(r => [
      r.id, r.name, r.phone || "", r.type, r.date, r.time, r.pax, r.table, r.status, r.staff || "",
      (r.notes || "").replace(/\n/g, " ")
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guests_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("💾 Reservation list exported as CSV");
  };

  const formatFriendlyDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', timeZone: activeTz };
    return new Date().toLocaleDateString(undefined, options);
  };

  // Wait for first cloud load before painting (prevents brief flash of default data).
  if (!cloudLoaded) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy text-sm font-semibold">Loading your account…</div>
      </div>
    );
  }

  return (
    <div id="guest-rsvp-manager-applet" className="min-h-screen bg-cream text-navy font-sans antialiased flex flex-col lg:flex-row relative">

      {/* Toast */}
      <div
        id="applet-toast-banner"
        className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl bg-navy border border-gold text-gold font-bold text-xs shadow-xl transition-all duration-300 transform z-[2100] flex items-center gap-2.5 ${
          isToastVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
        <span>{toastMessage}</span>
      </div>

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openEntryModal={handleOpenEntryModalDirect}
        openStaffModal={() => setIsStaffModalOpen(true)}
        openSyncModal={() => setIsSyncModalOpen(true)}
        exportCSV={exportCSV}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isSynced={!hasUnsavedChanges && !isSyncing}
        sheetUrlConfigured={true}
        username={loggedUsername}
        onLogout={handleLogout}
        restaurantName={restaurantName}
        setRestaurantName={handleSaveRestaurantName}
        restaurantPhoto={restaurantPhoto}
        setRestaurantPhoto={handleSaveRestaurantPhoto}
        hasUnsavedChanges={hasUnsavedChanges}
        onManualSave={handleManualSaveAll}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-gray-200 min-h-[72px] sticky top-0 z-30 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              id="sidebar-toggle-hamburger"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 bg-slate-50 border border-gray-200 text-navy rounded-xl hover:bg-slate-100 transition cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="font-serif text-xl font-extrabold text-navy leading-none">
                {activeTab === "dashboard" && "Dashboard Snapshots"}
                {activeTab === "reservations" && "Reservations Registry"}
                {activeTab === "tablemap" && "Dining Floor Grid"}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-1 uppercase">
                {activeTab === "dashboard" && "Live Metrics Analytics & Snapshot"}
                {activeTab === "reservations" && "Search, Filter, Export & Modify List"}
                {activeTab === "tablemap" && "Interactive Seating map and linking"}
              </p>
            </div>

            <span id="header-today-date-badge" className="hidden sm:inline-block bg-gold-pale border border-gold-light text-gold text-xs font-bold px-4 py-1.5 rounded-full uppercase ml-2 tracking-wide">
              📅 {formatFriendlyDate()} <span className="ml-1 text-navy opacity-80">🕒 {currentTime}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              isSyncing ? "bg-amber-50 text-amber-700 border-amber-200" :
              hasUnsavedChanges ? "bg-slate-50 text-slate-600 border-slate-200" :
              "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? "bg-amber-500 animate-pulse" : hasUnsavedChanges ? "bg-slate-400" : "bg-emerald-500"}`} />
              {isSyncing ? "Syncing…" : hasUnsavedChanges ? "Saving…" : "Synced to cloud"}
            </span>

            <button
              id="header-quick-walkin-btn"
              onClick={() => handleOpenEntryModalDirect("Walk-In")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-full border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              🚶 Log Walk-In
            </button>

            <button
              id="header-quick-booking-btn"
              onClick={() => handleOpenEntryModalDirect("Reservation")}
              className="px-4 py-2 bg-gold hover:bg-gold-light text-white font-bold text-xs rounded-full border border-gold-light transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              ➕ Book Reservation
            </button>
          </div>
        </header>

        {hasUnsavedChanges && (
          <div id="unsaved-changes-banner" className="bg-amber-100 border-b border-amber-300 px-6 py-2.5 flex items-center justify-between text-navy text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="truncate">Changes are auto-syncing to your account…</span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="px-3.5 py-1 text-slate-600 bg-white hover:bg-slate-50 border border-slate-250 rounded-lg text-[10px] font-bold transition cursor-pointer"
              >
                Info
              </button>
              <button
                type="button"
                onClick={handleManualSaveAll}
                className="px-4 py-1 text-white bg-amber-500 hover:bg-amber-600 rounded-lg text-[10px] font-bold transition cursor-pointer shadow-xs"
              >
                Save Now
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === "dashboard" && (
            <DashboardView
              guests={guests}
              onEditGuest={handleEditGuestClick}
              onDeleteGuest={handleDeleteGuest}
              onUpdateStatus={handleUpdateGuestStatus}
              timezone={activeTz}
            />
          )}

          {activeTab === "reservations" && (
            <ReservationsView
              guests={guests}
              onEditGuest={handleEditGuestClick}
              onDeleteGuest={handleDeleteGuest}
              onUpdateStatus={handleUpdateGuestStatus}
              onBulkUpdateStatus={handleBulkUpdateGuestStatus}
              onBulkDeleteGuests={handleBulkDeleteGuests}
            />
          )}

          {activeTab === "tablemap" && (
            <TableMapView
              guests={guests}
              tables={tables}
              onUpdateTableConfig={handleUpdateTableConfig}
              onUpdateGuestTable={handleUpdateGuestTableDirect}
              openEntryModal={handleOpenEntryModalDirect}
              timezone={activeTz}
            />
          )}
        </main>
      </div>

      <EntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setGuestToEdit(null);
        }}
        onSave={handleSaveGuest}
        guestToEdit={guestToEdit}
        tables={tables}
        staffList={staffList}
        initialType={entryModalInitialType}
        timezone={activeTz}
        guestsKey={getAccountKey("guests")}
      />

      <StaffManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
        onAddStaff={handleAddStaff}
        onRemoveStaff={handleRemoveStaff}
      />

      <SyncConfigPanel
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        guests={guests}
        onImportGuests={handleImportGuests}
        onClearAllGuests={handleClearAllGuests}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
