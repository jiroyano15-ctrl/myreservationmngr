import React, { useEffect, useRef } from "react";
import { 
  Clock, 
  Upload, 
  Download, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Utensils,
  LogIn,
  LogOut,
  UserCheck,
  Coins,
  Menu
} from "lucide-react";
import { AppUser } from "../types";

interface HeaderProps {
  liveTime: Date;
  activeShift: string;
  setActiveShift: (shift: string) => void;
  catalogLength: number;
  errorMessage: string | null;
  clearError: () => void;
  user?: AppUser | null;

  // Currency properties
  currency: { symbol: string; code: string };
  onCurrencyChange: (currency: { symbol: string; code: string }) => void;

  // Sidebar toggle
  onToggleMobileSidebar?: () => void;
}

export default function Header({
  liveTime,
  activeShift,
  setActiveShift,
  catalogLength,
  errorMessage,
  clearError,
  user,
  currency,
  onCurrencyChange,
  onToggleMobileSidebar
}: HeaderProps) {

  // Format Date elegant
  const formatFullDate = (d: Date): string => {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFullTime = (d: Date): string => {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 py-5 sm:px-6 lg:px-8 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Brand & Shift Info */}
        <div className="flex items-start justify-between gap-4 w-full lg:w-auto">
          <div className="flex items-start gap-4">
            <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-md shadow-emerald-500/20 shrink-0">
              <Utensils className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-black tracking-tight text-slate-900">
                  Kitchen Ordering System
                </h1>
                
                <span className={`inline-flex items-center font-sans text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  user 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" 
                    : "bg-slate-50 text-slate-700 border-slate-200/80"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${user ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                  {user ? `${user.role || "Admin"} Session Active` : "Offline Database Hub"}
                </span>
              </div>
              
              {/* Meta Data & Real Time clock */}
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {formatFullDate(liveTime)} at {formatFullTime(liveTime)}
                </span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span>Catalog Size: <strong className="text-slate-700">{catalogLength} Active Items</strong></span>
              </div>
            </div>
          </div>

          {/* Mobile Sidebar Navigation Toggle */}
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              type="button"
              className="lg:hidden p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 cursor-pointer transition select-none flex items-center gap-1.5 text-xs font-black shadow-xs shrink-0 self-center"
              title="Toggle Navigation Menu"
            >
              <Menu className="h-5 w-5 text-emerald-600" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          )}
        </div>


      </div>

      {/* Error notification bar if failed to upload */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto mt-4 bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3 text-rose-800">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold font-sans">Catalog Import Suspended</h4>
            <p className="text-xs text-rose-700 mt-1">{errorMessage}</p>
          </div>
          <button
            onClick={clearError}
            className="text-xs font-mono font-bold text-rose-500 hover:text-rose-700 px-1 py-0.5 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </header>
  );
}
