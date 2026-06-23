import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { KitchenItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "./ConfirmModal";
import { 
  Search, 
  Plus, 
  Minus, 
  Leaf, 
  Droplet, 
  Sparkles, 
  Utensils, 
  FolderPlus, 
  Flame,
  CheckCircle,
  X,
  PlusCircle,
  Grid,
  Table,
  DollarSign,
  Info,
  Edit2,
  Trash2,
  Barcode,
  PackagePlus,
  Calculator,
  Tag,
  Scaling,
  ChevronDown,
  Receipt,
  Upload,
  ArrowUpDown,
  SlidersHorizontal,
  AlertTriangle,
  Star,
  StickyNote
} from "lucide-react";

interface ItemGridProps {
  items: KitchenItem[];
  quantities: Record<string, number>;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRateChange: (itemId: string, rate: number) => void;
  onParLevelChange?: (itemId: string, level: number) => void;
  onOnHandChange?: (itemId: string, count: number) => void;
  onAddCustomItem: (
    code: string | null,
    name: string,
    category: string,
    unit: string,
    rate: number,
    initialQty?: number,
    parLevel?: number,
    onHand?: number
  ) => void;
  onRenameCategory: (oldCategory: string, newCategory: string) => void;
  onDeleteCategory: (category: string) => void;
  onItemCategoryChange: (itemId: string, newCategory: string) => void;
  userCategories: string[];
  setUserCategories: React.Dispatch<React.SetStateAction<string[]>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchQtyFilter?: string;
  setSearchQtyFilter?: (filter: string) => void;
  searchExactCode?: string;
  setSearchExactCode?: (code: string) => void;
  currency?: { symbol: string; code: string };
  onUploadExcel?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSubAccount?: boolean;
  favorites?: string[];
  onToggleFavorite?: (itemId: string) => void;
  itemNotes?: Record<string, string>;
  onUpdateItemNote?: (itemId: string, note: string) => void;
  selectedSection?: string;
  setSelectedSection?: React.Dispatch<React.SetStateAction<string>>;
  sectionsList?: string[];
  setSectionsList?: React.Dispatch<React.SetStateAction<string[]>>;
  itemSectionTags?: Record<string, string>;
  setItemSectionTags?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onTagSection?: (itemId: string, section: string) => void;
}

// Category design mapping
const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; dot: string; icon: any }> = {
  Produce: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", icon: Leaf },
  Sauces: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500", icon: Droplet },
  Bakery: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500", icon: Sparkles },
  Meat: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500", icon: Flame },
  General: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", dot: "bg-sky-500", icon: Utensils }
};

// Helper utility to resolve dynamic high-contrast styling for custom or user categories
const getCategoryStyle = (cat: string) => {
  if (CATEGORY_STYLES[cat]) {
    return CATEGORY_STYLES[cat];
  }
  // Generate a deterministic aesthetic style for custom categories
  const hash = cat.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorBands = [
    { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700 font-bold", dot: "bg-violet-500" },
    { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700 font-bold", dot: "bg-teal-500" },
    { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900 font-bold", dot: "bg-orange-500" },
    { bg: "bg-fuchsia-50", border: "border-fuchsia-200", text: "text-fuchsia-700 font-bold", dot: "bg-fuchsia-500" },
    { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700 font-bold", dot: "bg-indigo-500" },
  ];
  const color = colorBands[hash % colorBands.length];
  return {
    ...color,
    icon: Sparkles
  };
};

interface ItemCardProps {
  item: KitchenItem;
  qty: number;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRateChange: (itemId: string, rate: number) => void;
  onItemCategoryChange: (itemId: string, newCategory: string) => void;
  categoriesList: string[];
  currency?: { symbol: string; code: string };
  onParLevelChange?: (itemId: string, level: number) => void;
  onOnHandChange?: (itemId: string, count: number) => void;
  isSubAccount?: boolean;
  isFavorite: boolean;
  onToggleFavorite?: (itemId: string) => void;
  note?: string;
  onOpenNoteEditor?: (itemId: string) => void;
  isMapped?: boolean;
  onRemoveOverride?: () => void;
  itemSection?: string;
  sectionsList?: string[];
  onTagSection?: (itemId: string, section: string) => void;
}

const ItemCard = React.memo(function ItemCard({
  item,
  qty,
  onQuantityChange,
  onRateChange,
  onItemCategoryChange,
  categoriesList,
  currency = { symbol: "£", code: "GBP" },
  onParLevelChange,
  onOnHandChange,
  isSubAccount = false,
  isFavorite,
  onToggleFavorite,
  note,
  onOpenNoteEditor,
  isMapped = false,
  onRemoveOverride,
  itemSection = "",
  sectionsList = [],
  onTagSection,
}: ItemCardProps) {
  const isSelected = qty > 0;
  const styles = getCategoryStyle(item.Category);
  const rate = item.Rate || 0;
  const gross = qty * rate;

  return (
    <motion.div
      layoutId={String(item.Item_ID)}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={`bg-white rounded-xl border p-3.5 shadow-xs group hover:shadow-md transition-all relative flex flex-col justify-between ${
        isSelected
          ? "border-emerald-500/65 ring-2 ring-emerald-500/3"
          : "border-slate-200/70 hover:border-slate-300"
      }`}
    >
      {/* Selected Badge Indicator overlay */}
      {isSelected && (
        <div className="absolute top-2.5 right-2.5 text-emerald-600 animate-bounce">
          <CheckCircle className="h-3.5 w-3.5 fill-emerald-100" />
        </div>
      )}

      {/* Top Content Info */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="relative group/sel">
            <select
              value={item.Category}
              onChange={(e) => onItemCategoryChange(item.Item_ID, e.target.value)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold ${styles.bg} ${styles.text} border ${styles.border} focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer font-sans appearance-none pr-3.5`}
            >
              {categoriesList.filter(c => c !== "All").map(c => (
                <option key={c} value={c} className="text-slate-800 bg-white font-sans font-normal text-xs">{c}</option>
              ))}
            </select>
            <span className="absolute right-0.5 top-1 pointer-events-none text-[8px] opacity-60">▼</span>
          </div>

          {/* Section Selector */}
          <div className="relative group/secSel">
            <select
              value={itemSection}
              onChange={(e) => onTagSection?.(item.Item_ID, e.target.value)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer font-sans appearance-none pr-3.5"
            >
              <option value="" className="text-slate-400 bg-white font-sans font-normal text-xs">Section: None</option>
              {sectionsList.map(sec => (
                <option key={sec} value={sec} className="text-slate-800 bg-white font-sans font-normal text-xs">{sec}</option>
              ))}
            </select>
            <span className="absolute right-0.5 top-1 pointer-events-none text-[8px] opacity-60 text-slate-400">▼</span>
          </div>
          
          {item.isCustom && (
            <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[9.5px] font-bold border-dashed">
              Custom
            </span>
          )}

          {isMapped && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveOverride?.();
              }}
              className="bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded text-[9.5px] font-bold border-dashed hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition flex items-center gap-1 cursor-pointer focus:outline-none"
              title="Click to revert to original spreadsheet category"
            >
              <span>Mapped</span>
              <X className="h-2 w-2 text-sky-500 hover:text-rose-500 font-bold" />
            </button>
          )}
          
          <div className="font-mono text-[9px] text-slate-400 font-medium ml-auto flex items-center gap-1 select-none relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(item.Item_ID);
              }}
              className="hover:scale-110 active:scale-90 transition-all text-amber-500 cursor-pointer focus:outline-hidden"
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Star className={`h-3 w-3 ${isFavorite ? "fill-amber-400 text-amber-500" : "text-slate-300 hover:text-amber-500"}`} />
            </button>

            {/* Internal Note Trigger */}
            <div className="relative group/note flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenNoteEditor?.(item.Item_ID);
                }}
                className="hover:scale-110 active:scale-90 transition-all cursor-pointer focus:outline-none"
                title={note ? "Edit Internal Note" : "Add Internal Note"}
              >
                <StickyNote className={`h-3 w-3 ${note ? "text-amber-500 fill-amber-300/20" : "text-slate-300 hover:text-amber-500"}`} />
              </button>
              
              {/* Tooltip on Hover */}
              {note && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/note:flex flex-col gap-1 z-[150] bg-slate-950/95 border border-slate-800 text-white text-[11px] p-2 rounded-xl shadow-xl w-48 pointer-events-none transition-all duration-200">
                  <div className="font-sans font-bold text-[10px] text-amber-405 tracking-wider uppercase flex items-center gap-1">
                    <StickyNote className="h-2.5 w-2.5" />
                    <span>Internal Note</span>
                  </div>
                  <p className="font-sans font-medium text-slate-100 leading-relaxed whitespace-pre-wrap text-left">{note}</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-slate-950" />
                </div>
              )}
            </div>

            <span className="text-[8.5px]">ID: {item.Item_ID}</span>
          </div>
        </div>

        <h3 className="font-sans font-extrabold text-slate-800 text-xs sm:text-xs leading-snug group-hover:text-slate-950 transition line-clamp-1 pb-0.5" title={item.Item_Name}>
          {item.Item_Name}
        </h3>
      </div>

       {/* Middle: editable Rates and Gross calculation */}
      <div className="mt-2 bg-slate-50/70 p-2 rounded-lg border border-slate-100/60 space-y-1 font-sans text-[11px]">
        <div className="flex items-center justify-between text-slate-500">
          <span>Unit type:</span>
          <span className="font-bold text-slate-700">{item.Unit_Type}</span>
        </div>
        
        {!isSubAccount && item.Supplier && (
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
            <span>Supplier:</span>
            <span className="font-semibold text-slate-600 max-w-[120px] truncate" title={item.Supplier}>{item.Supplier}</span>
          </div>
        )}

        {item.Purchase_Packaging && (
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Pack style:</span>
            <span className="font-semibold text-slate-600 truncate max-w-[120px]" title={item.Purchase_Packaging}>{item.Purchase_Packaging}</span>
          </div>
        )}

        {!isSubAccount && typeof item.Purchase_Price === "number" && !isNaN(item.Purchase_Price) && (
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Pur. Price:</span>
            <span className="font-semibold text-slate-600">{currency.symbol}{item.Purchase_Price.toFixed(2)}</span>
          </div>
        )}

        {item.Purchase_Count !== undefined && (
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Pack Count:</span>
            <span className="font-semibold text-slate-600">{item.Purchase_Count}</span>
          </div>
        )}
        
        {/* Price Rate input */}
        {!isSubAccount && (
          <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100">
            <span>Rate Cost:</span>
            <div className="flex items-center font-mono font-bold text-slate-700">
              <span className="mr-0.5">{currency.symbol}</span>
              <input
                type="number"
                step="0.10"
                min="0"
                value={rate}
                onChange={(e) => onRateChange(item.Item_ID, parseFloat(e.target.value) || 0)}
                className="w-12 text-right bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-0.5 text-slate-800 text-[10.5px] font-bold"
              />
            </div>
          </div>
        )}

        {/* Par Level & On Hand Inputs (Personal Catalog Use) */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 font-sans text-[10px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400 font-bold uppercase text-[8.5px]">Par Level:</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={item.Par_Level ?? 0}
              onChange={(e) => onParLevelChange?.(item.Item_ID, parseInt(e.target.value, 15) || 0)}
              className="w-full text-center bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded py-0.5 text-slate-805 font-mono text-[10px]"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400 font-bold uppercase text-[8.5px]">On Hand:</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={item.On_Hand ?? 0}
              onChange={(e) => onOnHandChange?.(item.Item_ID, parseInt(e.target.value, 15) || 0)}
              className={`w-full text-center bg-white border focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded py-0.5 font-mono text-[10px] ${
                typeof item.Par_Level === "number" && typeof item.On_Hand === "number" && item.On_Hand < item.Par_Level
                  ? "border-amber-300 text-amber-700 bg-amber-50"
                  : "border-slate-200 text-slate-805"
              }`}
            />
          </div>
        </div>

        {/* Warning Alert if stock is below target par level */}
        {typeof item.Par_Level === "number" && typeof item.On_Hand === "number" && item.On_Hand < item.Par_Level && (
          <div className="bg-amber-50/40 border border-amber-200/60 text-amber-800 text-[9px] font-bold px-1.5 py-1 rounded flex items-center gap-1 font-sans justify-center select-none leading-tight">
            <AlertTriangle className="h-2.5 w-2.5 text-amber-600 shrink-0" />
            <span>Below Par ({item.Par_Level - item.On_Hand} reordered)</span>
          </div>
        )}

        {/* Gross sum */}
        {!isSubAccount && (
          <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200 text-[11px] font-bold">
            <span className="text-slate-500">Gross total:</span>
            <span className={`font-mono ${gross > 0 ? "text-emerald-700 font-black text-xs" : "text-slate-400 font-normal"}`}>
              {currency.symbol}{gross.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Bottom controls and unit info */}
      <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between gap-1.5">
        <span className="text-[9.5px] font-mono text-slate-400 font-bold">
          Qty Ordered:
        </span>

        {qty === 0 ? (
          <button
            onClick={() => onQuantityChange(item.Item_ID, 1)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-sans font-bold text-xs cursor-pointer border border-emerald-200 transition-all active:scale-95 shadow-2xs"
          >
            <Plus className="h-3 w-3" />
            <span>Order</span>
          </button>
        ) : (
          /* Numeric Adjuster controls */
          <div className="flex items-center bg-slate-50 p-0.5 rounded border border-slate-200/40">
            {/* Minus */}
            <button
              onClick={() => onQuantityChange(item.Item_ID, Math.max(0, qty - 1))}
              className={`p-1 rounded hover:bg-white text-slate-500 hover:text-slate-900 transition flex items-center justify-center ${
                qty === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
              disabled={qty === 0}
            >
              <Minus className="h-3 w-3" />
            </button>

            {/* Quantity direct text box */}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={qty}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                const num = val === "" ? 0 : parseInt(val, 10);
                onQuantityChange(item.Item_ID, num);
              }}
              className="w-8 text-center font-mono text-xs font-black text-slate-800 bg-transparent border-0 focus:outline-none select-all"
            />

            {/* Plus */}
            <button
              onClick={() => onQuantityChange(item.Item_ID, qty + 1)}
              className="p-1 rounded hover:bg-white text-slate-500 hover:text-slate-900 cursor-pointer transition flex items-center justify-center"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

interface ItemRowProps {
  item: KitchenItem;
  qty: number;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRateChange: (itemId: string, rate: number) => void;
  onItemCategoryChange: (itemId: string, newCategory: string) => void;
  categoriesList: string[];
  showSupplier: boolean;
  showPurchasePackaging: boolean;
  showPurchasePrice: boolean;
  showPurchaseCount: boolean;
  currency?: { symbol: string; code: string };
  onParLevelChange?: (itemId: string, level: number) => void;
  onOnHandChange?: (itemId: string, count: number) => void;
  isSubAccount?: boolean;
  isFavorite: boolean;
  onToggleFavorite?: (itemId: string) => void;
  note?: string;
  onOpenNoteEditor?: (itemId: string) => void;
  isMapped?: boolean;
  onRemoveOverride?: () => void;
  itemSection?: string;
  sectionsList?: string[];
  onTagSection?: (itemId: string, section: string) => void;
}

const ItemRow = React.memo(function ItemRow({
  item,
  qty,
  onQuantityChange,
  onRateChange,
  onItemCategoryChange,
  categoriesList,
  showSupplier,
  showPurchasePackaging,
  showPurchasePrice,
  showPurchaseCount,
  currency = { symbol: "£", code: "GBP" },
  onParLevelChange,
  onOnHandChange,
  isSubAccount = false,
  isFavorite,
  onToggleFavorite,
  note,
  onOpenNoteEditor,
  isMapped = false,
  onRemoveOverride,
  itemSection = "",
  sectionsList = [],
  onTagSection,
}: ItemRowProps) {
  const isSelected = qty > 0;
  const styles = getCategoryStyle(item.Category);
  const rate = item.Rate || 0;
  const gross = qty * rate;

  return (
    <tr className={`hover:bg-slate-50/50 transition-colors ${isSelected ? "bg-emerald-50/15" : ""}`}>
      {/* Code */}
      <td className="p-4 font-mono text-xs font-bold text-slate-600">
        <div className="flex items-center gap-2 select-none relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(item.Item_ID);
            }}
            className="hover:scale-115 active:scale-90 transition-all text-amber-500 cursor-pointer focus:outline-hidden"
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-amber-400 text-amber-500" : "text-slate-300 hover:text-amber-500"}`} />
          </button>

          {/* Internal Note Trigger */}
          <div className="relative group/note flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenNoteEditor?.(item.Item_ID);
              }}
              className="hover:scale-115 active:scale-90 transition-all cursor-pointer focus:outline-none"
              title={note ? "Edit Internal Note" : "Add Internal Note"}
            >
              <StickyNote className={`h-3.5 w-3.5 ${note ? "text-amber-500 fill-amber-300/20" : "text-slate-300 hover:text-amber-500"}`} />
            </button>
            
            {/* Tooltip on Hover */}
            {note && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/note:flex flex-col gap-1 z-[150] bg-slate-950/95 border border-slate-800 text-white text-[11px] p-2.5 rounded-xl shadow-xl w-48 pointer-events-none transition-all duration-200">
                <div className="font-sans font-bold text-[10px] text-amber-405 tracking-wider uppercase flex items-center gap-1">
                  <StickyNote className="h-2.5 w-2.5" />
                  <span>Internal Note</span>
                </div>
                <p className="font-sans font-medium text-slate-100 leading-relaxed whitespace-pre-wrap text-left font-normal normal-case">{note}</p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-slate-950" />
              </div>
            )}
          </div>

          <span>{item.Item_ID}</span>
        </div>
      </td>
      
      {/* Category & Section */}
      <td className="p-4">
        <div className="flex flex-col gap-1 min-w-[124px]">
          {/* Category Select */}
          <div className="relative inline-block w-full">
            <select
              value={item.Category}
              onChange={(e) => onItemCategoryChange(item.Item_ID, e.target.value)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${styles.bg} ${styles.text} border ${styles.border} focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer font-sans appearance-none pr-4 w-full`}
            >
              {categoriesList.filter(c => c !== "All").map(c => (
                <option key={c} value={c} className="text-slate-800 bg-white font-sans font-normal text-xs">{c}</option>
              ))}
            </select>
            <span className="absolute right-1 top-1.5 pointer-events-none text-[8px] opacity-60">▼</span>
          </div>

          {/* Section Selector */}
          <div className="relative inline-block w-full">
            <select
              value={itemSection}
              onChange={(e) => onTagSection?.(item.Item_ID, e.target.value)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer font-sans appearance-none pr-4 w-full"
            >
              <option value="" className="text-slate-400 bg-white font-sans font-normal text-xs">No Section</option>
              {sectionsList.map(sec => (
                <option key={sec} value={sec} className="text-slate-800 bg-white font-sans font-normal text-xs">{sec}</option>
              ))}
            </select>
            <span className="absolute right-1 top-1.5 pointer-events-none text-[8px] opacity-65 text-slate-400">▼</span>
          </div>
        </div>
      </td>

      {/* Item Name */}
      <td className="p-4 font-medium text-slate-950">
        <div className="flex items-center gap-2 flex-wrap">
          <span>{item.Item_Name}</span>
          {item.isCustom && (
            <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded text-[9px] font-bold">
              Custom
            </span>
          )}
          {isMapped && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveOverride?.();
              }}
              className="bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.2 rounded text-[9px] font-bold border-dashed hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition flex items-center gap-1 cursor-pointer focus:outline-none"
              title="Click to revert to original spreadsheet category"
            >
              <span>Mapped</span>
              <X className="h-20 w-2 text-sky-500 hover:text-rose-500 font-bold" style={{ width: '8px', height: '8px' }} />
            </button>
          )}
        </div>
      </td>

      {/* Dynamic extra columns */}
      {showSupplier && !isSubAccount && (
        <td className="p-4 text-slate-600 text-xs font-sans max-w-[140px] truncate" title={item.Supplier}>
          {item.Supplier || "-"}
        </td>
      )}

      {showPurchasePackaging && (
        <td className="p-4 text-slate-500 text-xs font-mono">
          {item.Purchase_Packaging || "-"}
        </td>
      )}

      {showPurchasePrice && !isSubAccount && (
        <td className="p-4 text-right font-mono text-xs text-slate-600">
          {typeof item.Purchase_Price === "number" && !isNaN(item.Purchase_Price) ? `${currency.symbol}${item.Purchase_Price.toFixed(2)}` : "-"}
        </td>
      )}

      {showPurchaseCount && (
        <td className="p-4 text-center font-mono text-xs text-slate-600">
          {item.Purchase_Count ?? "-"}
        </td>
      )}

      {/* Packing Unit */}
      <td className="p-4 text-slate-500 font-mono text-xs">
        {item.Unit_Type}
      </td>

      {/* Par Level Input */}
      <td className="p-4 text-center">
        <input
          type="number"
          min="0"
          value={item.Par_Level ?? 0}
          onChange={(e) => onParLevelChange?.(item.Item_ID, parseInt(e.target.value, 10) || 0)}
          className="w-16 text-center bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded py-0.5 text-slate-800 font-mono text-xs"
        />
      </td>

      {/* On Hand Input + Alert check */}
      <td className="p-4 text-center">
        <div className="flex flex-col items-center gap-1 justify-center">
          <input
            type="number"
            min="0"
            value={item.On_Hand ?? 0}
            onChange={(e) => onOnHandChange?.(item.Item_ID, parseInt(e.target.value, 10) || 0)}
            className={`w-16 text-center bg-white border rounded py-0.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              typeof item.Par_Level === "number" && typeof item.On_Hand === "number" && item.On_Hand < item.Par_Level
                ? "border-amber-300 text-amber-700 bg-amber-50"
                : "border-slate-200 text-slate-800"
            }`}
            title={typeof item.Par_Level === "number" && typeof item.On_Hand === "number" && item.On_Hand < item.Par_Level ? `Below Par Level of ${item.Par_Level}` : ""}
          />
          {typeof item.Par_Level === "number" && typeof item.On_Hand === "number" && item.On_Hand < item.Par_Level && (
            <span className="text-[9px] text-amber-600 font-extrabold flex items-center gap-0.5" title="Reorder required">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0 animate-pulse text-amber-600" />
              <span>Below Par</span>
            </span>
          )}
        </div>
      </td>

      {/* Rate price */}
      {!isSubAccount && (
        <td className="p-4 text-right font-mono font-bold text-slate-700">
          <div className="flex items-center justify-end gap-1">
            <span>{currency.symbol}</span>
            <input
              type="number"
              step="0.10"
              min="0"
              value={rate}
              onChange={(e) => onRateChange(item.Item_ID, parseFloat(e.target.value) || 0)}
              className="w-16 text-right bg-transparent border-b border-dashed border-slate-300 hover:border-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-0 text-slate-800"
            />
          </div>
        </td>
      )}

      {/* Quantity control */}
      <td className="p-4 text-center text-nowrap">
        {qty === 0 ? (
          <button
            onClick={() => onQuantityChange(item.Item_ID, 1)}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-sans font-bold text-xs cursor-pointer border border-emerald-200 transition-all active:scale-95 shadow-2xs"
          >
            <Plus className="h-2.5 w-2.5" />
            <span>Order</span>
          </button>
        ) : (
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
            <button
              onClick={() => onQuantityChange(item.Item_ID, Math.max(0, qty - 1))}
              className={`p-1 rounded hover:bg-white text-slate-500 hover:text-slate-900 transition flex items-center justify-center ${
                qty === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
              disabled={qty === 0}
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={qty}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                const num = val === "" ? 0 : parseInt(val, 10);
                onQuantityChange(item.Item_ID, num);
              }}
              className="w-8 text-center font-mono text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none"
            />
            <button
              onClick={() => onQuantityChange(item.Item_ID, qty + 1)}
              className="p-1 rounded hover:bg-white text-slate-500 hover:text-slate-900 cursor-pointer transition flex items-center justify-center"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}
      </td>

      {/* Gross dynamic */}
      {!isSubAccount && (
        <td className="p-4 text-right font-mono font-bold text-slate-900">
          <span className={gross > 0 ? "text-emerald-700" : "text-slate-400"}>
            {currency.symbol}{gross.toFixed(2)}
          </span>
        </td>
      )}
    </tr>
  );
});

export default function ItemGrid({
  items,
  quantities,
  onQuantityChange,
  onRateChange,
  onParLevelChange,
  onOnHandChange,
  onAddCustomItem,
  onRenameCategory,
  onDeleteCategory,
  onItemCategoryChange,
  userCategories,
  setUserCategories,
  searchQuery,
  setSearchQuery,
  searchQtyFilter = "all",
  setSearchQtyFilter,
  searchExactCode = "",
  setSearchExactCode,
  currency = { symbol: "£", code: "GBP" },
  onUploadExcel,
  isSubAccount = false,
  favorites = [],
  onToggleFavorite,
  itemNotes = {},
  onUpdateItemNote,
  selectedSection = "All",
  setSelectedSection = () => {},
  sectionsList = ["Main Kitchen", "Prep Station", "Dry Storage", "Walk-In Cooler"],
  setSectionsList = () => {},
  itemSectionTags = {},
  setItemSectionTags = () => {},
  onTagSection,
}: ItemGridProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showOnlyDrafted, setShowOnlyDrafted] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Custom sections list and item tagging features
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

  const handleTagSection = onTagSection || (() => {});

  // Ref and state for Press and hold (Long Press) gesture handling
  const pressTimerRef = useRef<any>(null);
  const isLongPressActive = useRef(false);
  const [pressingItem, setPressingItem] = useState<{
    type: "category" | "section";
    name: string;
  } | null>(null);

  const startPressTimer = useCallback((type: "category" | "section", name: string, onLongPress: () => void) => {
    isLongPressActive.current = false;
    setPressingItem({ type, name });
    
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    
    pressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      onLongPress();
      setPressingItem(null);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 850); // 850ms hold threshold to delete
  }, []);

  const clearPressTimer = useCallback((onShortPress?: () => void) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressingItem(null);
    if (!isLongPressActive.current && onShortPress) {
      onShortPress();
    }
    isLongPressActive.current = false;
  }, []);

  const cancelPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressingItem(null);
    isLongPressActive.current = false;
  }, []);

  // Persistent user custom category overrides (saved independently from primary DB catalog)
  const [userCategoryOverrides, setUserCategoryOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("kitchen_app_user_category_mappings");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("kitchen_app_user_category_mappings", JSON.stringify(userCategoryOverrides));
  }, [userCategoryOverrides]);

  const handleItemCategoryOverride = useCallback((itemId: string, newCategory: string) => {
    const originalItem = items.find(it => it.Item_ID === itemId);
    const originalCategory = originalItem?.Category || "General";
    
    setUserCategoryOverrides(prev => {
      const next = { ...prev };
      if (newCategory === originalCategory) {
        delete next[itemId];
      } else {
        next[itemId] = newCategory;
      }
      return next;
    });
  }, [items]);

  const handleRemoveOverride = useCallback((itemId: string) => {
    setUserCategoryOverrides(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  // Dynamically resolve categorized items with custom overrides overlay in memory (Zero-write to DB)
  const resolvedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      Category: userCategoryOverrides[item.Item_ID] || item.Category
    }));
  }, [items, userCategoryOverrides]);

  // Master catalog mapping search states & calculations (Zero write to DB)
  const [masterItemSearch, setMasterItemSearch] = useState("");
  const [selectedMasterItemId, setSelectedMasterItemId] = useState("");

  const eligibleMasterItems = useMemo(() => {
    return resolvedItems.filter(item => item.Category !== selectedCategory);
  }, [resolvedItems, selectedCategory]);

  const searchedMasterItems = useMemo(() => {
    if (!masterItemSearch) return eligibleMasterItems.slice(0, 100);
    const q = masterItemSearch.toLowerCase().trim();
    return eligibleMasterItems.filter(item => 
      String(item.Item_Name || "").toLowerCase().includes(q) || 
      String(item.Item_ID || "").toLowerCase().includes(q)
    ).slice(0, 100);
  }, [eligibleMasterItems, masterItemSearch]);

  // Note editor states
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [noteDraftText, setNoteDraftText] = useState("");

  const handleOpenNoteEditor = useCallback((itemId: string) => {
    setEditingNoteItemId(itemId);
    setNoteDraftText(itemNotes[itemId] || "");
  }, [itemNotes]);

  // Persistent Sorting Options
  const [sortBy, setSortBy] = useState<"name" | "price" | "category" | "code">(() => {
    const saved = localStorage.getItem("kitchen_app_sort_by");
    return (saved as any) || "name";
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    const saved = localStorage.getItem("kitchen_app_sort_order");
    return (saved as "asc" | "desc") || "asc";
  });

  useEffect(() => {
    localStorage.setItem("kitchen_app_sort_by", sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem("kitchen_app_sort_order", sortOrder);
  }, [sortOrder]);
  
  // Sentinel ref and observer for auto streaming load-on-scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Local debounced search query state to prevent UI re-render lag while typing
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 120);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // Custom quick-add form state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("General");
  const [customQuantity, setCustomQuantity] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState("Case");
  const [customRate, setCustomRate] = useState<number>(10);
  const [customParLevel, setCustomParLevel] = useState<number>(0);
  const [customOnHand, setCustomOnHand] = useState<number>(0);

  // Adding category inline form state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategoryInline, setIsAddingCategoryInline] = useState(false);
  const [newCategoryInlineName, setNewCategoryInlineName] = useState("");

  // Sync customCategory default choice with selected tab if specific Category is active
  useEffect(() => {
    if (selectedCategory && selectedCategory !== "All") {
      setCustomCategory(selectedCategory);
    }
  }, [selectedCategory]);

  // Dynamically inspect existing categories from loaded spreadsheet
  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    
    resolvedItems.forEach(item => {
      if (item.Category) list.add(item.Category);
    });
    userCategories.forEach(cat => list.add(cat));
    
    if (list.size === 0) {
      list.add("General");
    }
    
    return ["All", ...Array.from(list)];
  }, [resolvedItems, userCategories]);

  // Compute quantity drafted per category for badge counts
  const categoryOrderDraftedCount = useMemo(() => {
    const counts: Record<string, number> = {};
    resolvedItems.forEach(item => {
      const q = quantities[item.Item_ID] || 0;
      if (q > 0) {
        counts[item.Category] = (counts[item.Category] || 0) + 1;
        counts["All"] = (counts["All"] || 0) + 1;
      }
    });
    return counts;
  }, [resolvedItems, quantities]);

  // High-velocity performance index builder: tokenize and cache all item properties
  const searchIndex = useMemo(() => {
    const indexMap = new Map<string, string[]>();
    resolvedItems.forEach(item => {
      const tokens = [
        String(item.Item_Name || "").toLowerCase(),
        String(item.Category || "").toLowerCase(),
        String(item.Item_ID || "").toLowerCase(),
        String(item.Supplier || "").toLowerCase()
      ].filter(Boolean);
      indexMap.set(item.Item_ID, tokens);
    });
    return indexMap;
  }, [resolvedItems]);

  // Filter and sort items based on search, category, draft status, and active sort preferences
  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedExact = (searchExactCode || "").trim().toLowerCase();
    let results = [];
    
    results = resolvedItems.filter(item => {
      // 1. Category tab selector filter - bypass if actively searching by name or exact code
      const isSearching = !!(normalizedQuery || normalizedExact);
      const matchesCategory = isSearching || selectedCategory === "All" || item.Category === selectedCategory;
      if (!matchesCategory) return false;

      // 1b. Workflow Section filter
      const itemSection = itemSectionTags[item.Item_ID] || "";
      if (selectedSection && selectedSection !== "All" && itemSection !== selectedSection) {
        return false;
      }

      // 2. Active status filter
      const matchesStatus = item.Status?.toLowerCase() === "active" || item.Status === "Active" || item.isCustom;
      if (!matchesStatus) return false;

      // 3. Favorites filter
      const matchesFavorites = !showOnlyFavorites || favorites.includes(item.Item_ID);
      if (!matchesFavorites) return false;

      // 4. Exact item code lookup filter ("show only item exactly code looking for")
      if (normalizedExact) {
        if (item.Item_ID.toLowerCase().trim() !== normalizedExact) {
          return false;
        }
      }

      // 5. Quantity / Stock column filter ("and quantity")
      const qtyDrafted = quantities[item.Item_ID] || 0;
      const isDrafted = qtyDrafted > 0;
      
      const onHand = item.On_Hand ?? 0;
      const parLevel = item.Par_Level ?? 0;
      const isBelowPar = typeof item.Par_Level === "number" && typeof item.On_Hand === "number" && onHand < parLevel;

      if (searchQtyFilter === "drafted" || showOnlyDrafted) {
        if (!isDrafted) return false;
      } else if (searchQtyFilter === "below_par") {
        if (!isBelowPar) return false;
      } else if (searchQtyFilter === "in_stock") {
        if (onHand <= 0) return false;
      } else if (searchQtyFilter === "out_of_stock") {
        if (onHand > 0) return false;
      }

      // 6. Name / text keyword search match ("code to search item name will show vise versa")
      if (normalizedQuery) {
        const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
        const tokens = searchIndex.get(item.Item_ID);
        if (!tokens) return false;

        // Multi-word streaming match checking (item name or code is handled because tokens includes name, ID, category, and supplier)
        const matched = queryWords.every(word => tokens.some(token => token.includes(word)));
        if (!matched) return false;
      }

      return true;
    });

    // Direct performance sorting injection
    const sorted = [...results];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = (a.Item_Name || "").localeCompare(b.Item_Name || "", undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortBy === "price") {
        const pA = a.Rate || 0;
        const pB = b.Rate || 0;
        cmp = pA - pB;
      } else if (sortBy === "category") {
        cmp = (a.Category || "").localeCompare(b.Category || "", undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortBy === "code") {
        cmp = (a.Item_ID || "").localeCompare(b.Item_ID || "", undefined, { numeric: true, sensitivity: 'base' });
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [resolvedItems, searchQuery, searchExactCode, searchQtyFilter, selectedCategory, selectedSection, itemSectionTags, showOnlyDrafted, showOnlyFavorites, favorites, quantities, searchIndex, sortBy, sortOrder]);

  // Fast progressive stream pagination state
  const [streamPage, setStreamPage] = useState(1);

  // Automatically reset stream page size on search/filter boundaries
  useEffect(() => {
    setStreamPage(1);
  }, [searchQuery, searchExactCode, searchQtyFilter, selectedCategory, selectedSection, showOnlyDrafted, showOnlyFavorites]);

  const streamedItems = useMemo(() => {
    return filteredItems.slice(0, streamPage * 60);
  }, [filteredItems, streamPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Increment streaming page to load next page chunk
          setStreamPage(prev => prev + 1);
        }
      },
      { rootMargin: "250px" } // preload before user hits exact bottom edge
    );

    observer.observe(sentinel);
    return () => {
      observer.unobserve(sentinel);
    };
  }, [filteredItems.length, streamedItems.length]);

  const hasExtraColumns = useMemo(() => {
    return {
      supplier: false, // Hidden per user request Focus Mode
      purchasePackaging: false, // Hidden per user request Focus Mode
      purchasePrice: false, // Hidden per user request Focus Mode
      purchaseCount: streamedItems.some(item => item.Purchase_Count !== undefined && item.Purchase_Count !== null && item.Purchase_Count !== ""),
      inventoryUnit: streamedItems.some(item => item.Inventory_Unit !== undefined && item.Inventory_Unit !== null && item.Inventory_Unit !== ""),
      inventoryPrice: streamedItems.some(item => typeof item.Inventory_Price === "number" && !isNaN(item.Inventory_Price)),
    };
  }, [streamedItems]);

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onAddCustomItem(
      customCode.trim() || null,
      customName.trim(),
      customCategory,
      customUnit.trim(),
      customRate,
      customQuantity,
      customParLevel,
      customOnHand
    );
    setCustomCode("");
    setCustomName("");
    setCustomCategory("General");
    setCustomQuantity(1);
    setCustomUnit("Case");
    setCustomRate(10);
    setCustomParLevel(0);
    setCustomOnHand(0);
    setShowQuickAdd(false);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <style>{`
        @keyframes holdFill {
          0% { width: 0%; opacity: 0.8; }
          100% { width: 100%; opacity: 1; }
        }
      `}</style>
      
      <ConfirmModal
        isOpen={categoryToDelete !== null}
        title="Delete Category"
        message={`Are you sure you want to delete the custom category "${categoryToDelete}"? All custom items belonging to this category will stay, but the category itself will be removed. This action cannot be undone.`}
        onConfirm={() => {
          if (categoryToDelete) {
            // Clean up any persistent localized in-memory category overrides matching this deleted category
            setUserCategoryOverrides(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(itemId => {
                if (next[itemId] === categoryToDelete) {
                  delete next[itemId];
                }
              });
              return next;
            });
            
            if (onDeleteCategory) {
              onDeleteCategory(categoryToDelete);
            }
            if (selectedCategory === categoryToDelete) {
              setSelectedCategory("All");
            }
          }
        }}
        onClose={() => setCategoryToDelete(null)}
      />

      <ConfirmModal
        isOpen={sectionToDelete !== null}
        title="Delete Kitchen Section"
        message={`Are you sure you want to delete the custom section "${sectionToDelete}"? All tagged items will remain intact, but their section tags will be cleared. This action cannot be undone.`}
        onConfirm={() => {
          if (sectionToDelete) {
            setSectionsList(prev => {
              const next = prev.filter(s => s !== sectionToDelete);
              localStorage.setItem("kitchen_app_user_sections", JSON.stringify(next));
              return next;
            });
            setItemSectionTags(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(itemId => {
                if (next[itemId] === sectionToDelete) {
                  delete next[itemId];
                }
              });
              localStorage.setItem("kitchen_app_item_sections", JSON.stringify(next));
              return next;
            });
            if (selectedSection === sectionToDelete) {
              setSelectedSection("All");
            }
          }
          setSectionToDelete(null);
        }}
        onClose={() => setSectionToDelete(null)}
      />

      {/* Search and Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Bar Input */}
        <div className="relative flex-1 max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by SKU code or item name..."
            className="w-full bg-slate-50/60 border border-slate-200 hover:border-slate-300 focus:bg-white pl-10 pr-9 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400/85 text-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View mode toggle + Filters */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* View Toggles */}
          <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200/40 flex">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-950"
              }`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "table" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-950"
              }`}
              title="Table view"
            >
              <Table className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              showOnlyFavorites
                ? "bg-amber-50 text-amber-800 border-amber-300 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${showOnlyFavorites ? "fill-amber-400 text-amber-500 animate-pulse" : "text-slate-400 hover:text-amber-505"}`} />
            {showOnlyFavorites ? "Viewing Favorites" : "Favorites Only"}
          </button>

          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5 text-emerald-600" />
            Quick Add
          </button>
        </div>
      </div>

      {/* Quick Add Custom Item Segment */}
      <div id="quick-add-form-anchor" className="scroll-mt-24" />
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50 border border-slate-200 rounded-2xl shadow-md"
          >
            <form onSubmit={handleQuickAddSubmit} className="p-6 flex flex-col gap-6">
              
              {/* Form Title banner */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <PackagePlus className="h-5 w-5 text-emerald-600 animate-pulse" />
                  <div>
                    <h4 className="font-display font-black text-slate-800 text-sm">Quick Catalog Integration</h4>
                    <span className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-wider">Deploy customized ingredients instantly</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Input fields split columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Column A: Primary Specification */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-4">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
                    <Tag className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Classification Specs</span>
                  </div>

                  <div className="space-y-3 font-sans text-xs">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Unique Code (Item ID)
                      </label>
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value)}
                          placeholder="e.g. CUST-101"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white pl-9 pr-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Ingredient / Product Name
                      </label>
                      <div className="relative">
                        <Utensils className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="e.g. Fresh Cranberries"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white pl-9 pr-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-600 font-semibold">
                          Primary Category
                        </label>
                        {!isAddingCategoryInline && (
                          <button
                            type="button"
                            onClick={() => setIsAddingCategoryInline(true)}
                            className="text-[10px] text-emerald-600 hover:text-emerald-800 hover:underline font-bold cursor-pointer"
                          >
                            + Create New
                          </button>
                        )}
                      </div>

                      {isAddingCategoryInline ? (
                        <div className="flex items-center gap-1.5 animate-fade-in bg-slate-50 p-1.5 rounded-xl border border-slate-200 font-sans">
                          <input
                            type="text"
                            placeholder="Enter category name..."
                            value={newCategoryInlineName}
                            onChange={(e) => setNewCategoryInlineName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const trimmed = newCategoryInlineName.trim();
                                if (trimmed) {
                                  if (!userCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
                                    const updated = [...userCategories, trimmed];
                                    setUserCategories(updated);
                                    localStorage.setItem("kitchen_app_user_categories", JSON.stringify(updated));
                                  }
                                  setCustomCategory(trimmed);
                                  setIsAddingCategoryInline(false);
                                  setNewCategoryInlineName("");
                                }
                              } else if (e.key === "Escape") {
                                setIsAddingCategoryInline(false);
                                setNewCategoryInlineName("");
                              }
                            }}
                            className="bg-white border border-slate-200 text-slate-800 font-medium px-2.5 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden flex-1 font-sans"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newCategoryInlineName.trim();
                              if (trimmed) {
                                if (!userCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
                                  const updated = [...userCategories, trimmed];
                                  setUserCategories(updated);
                                  localStorage.setItem("kitchen_app_user_categories", JSON.stringify(updated));
                                }
                                setCustomCategory(trimmed);
                                setIsAddingCategoryInline(false);
                                setNewCategoryInlineName("");
                              }
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer font-sans shrink-0"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingCategoryInline(false);
                              setNewCategoryInlineName("");
                            }}
                            className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer font-sans shrink-0"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <select
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans"
                        >
                          {categoriesList.filter(c => c !== "All").map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column B: Volumetrics & Costing */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-4">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
                    <Calculator className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Costing & Volume Metrics</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-sans text-xs">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-slate-600 font-semibold mb-1">
                        Default Units
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={customQuantity}
                        onChange={(e) => setCustomQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        placeholder="1"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-slate-600 font-semibold mb-1">
                        Packaging / Unit Type
                      </label>
                      <div className="relative">
                        <Scaling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={customUnit}
                          onChange={(e) => setCustomUnit(e.target.value)}
                          placeholder="e.g. Bag (10 lbs)"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white pl-9 pr-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-slate-600 font-semibold mb-1">
                        Est. Unit Rate ({currency.symbol} Price)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">{currency.symbol}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={customRate}
                          onChange={(e) => setCustomRate(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="10.00"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white pl-8 pr-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-slate-600 font-semibold mb-1">
                        Required Par Level (Min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customParLevel}
                        onChange={(e) => setCustomParLevel(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        placeholder="e.g. 15"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-slate-600 font-semibold mb-1">
                        Product On Hand (Stock)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customOnHand}
                        onChange={(e) => setCustomOnHand(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        placeholder="e.g. 5"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* High visibility Live Valuation sub-panel */}
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
                      <Receipt className="h-4 w-4 text-emerald-600" />
                      <span>Immediate Valuation Gross:</span>
                    </div>
                    <span className="font-mono text-base font-black text-emerald-950">
                      {currency.symbol}{(customQuantity * customRate).toFixed(2)}
                    </span>
                  </div>
                </div>

              </div>

              {/* Form Footer Action Area */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-600 font-sans font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer transition shadow-lg shadow-emerald-600/10 active:scale-[0.98]"
                >
                  Confirm & Deploy Ingredient
                </button>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2-Column Responsive Board Layout: Vertical Category Sidebar on left, workspace content on right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Column: Vertical Category Sidebar Control Menu */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm flex flex-col gap-5">
          {/* Categories Block */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-bold text-sm font-sans">
                  Categories
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="relative w-full">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3.5 py-3 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition cursor-pointer appearance-none pr-9 font-sans"
                >
                  {categoriesList.map((cat) => {
                    const count = categoryOrderDraftedCount[cat] || 0;
                    return (
                      <option key={cat} value={cat}>
                        {cat} {count > 0 && cat !== "All" ? `(${count})` : ""}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>

              {userCategories.includes(selectedCategory) && (
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(selectedCategory)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl transition cursor-pointer shadow-xs text-xs font-bold font-sans hover:text-rose-700"
                  title={`Delete ${selectedCategory} Category`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Custom Category</span>
                </button>
              )}
            </div>

            {/* Integrated Inline Category Creator Inside Vertical Side Menu */}
            <div className="pt-2">
              {isCreatingCategory ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = newCategoryName.trim();
                    if (trimmed) {
                      if (!categoriesList.some(cat => cat.toLowerCase() === trimmed.toLowerCase())) {
                        const updated = [...userCategories, trimmed];
                        setUserCategories(updated);
                        localStorage.setItem("kitchen_app_user_categories", JSON.stringify(updated));
                        setSelectedCategory(trimmed);
                      }
                      setIsCreatingCategory(false);
                      setNewCategoryName("");
                    }
                  }}
                  className="flex items-center gap-1 bg-emerald-50/50 border border-emerald-200/50 rounded-xl p-1"
                >
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category..."
                    className="px-2 py-1 text-xs bg-transparent border-none focus:outline-none w-full font-bold text-slate-800 placeholder:text-slate-400 font-sans"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setIsCreatingCategory(false);
                        setNewCategoryName("");
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg transition text-[10px] font-black shrink-0 cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold bg-emerald-50/30 hover:bg-emerald-50 text-emerald-800 border border-emerald-200/40 border-dashed transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-600" />
                  <span>New Category</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Main Workspace Contents (Map Card & Main active viewport) */}
        <div className="lg:col-span-3 flex flex-col gap-6 w-full">

          {/* Bottom Section: Main Catalog Active Viewport */}
          <div className="relative w-full">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 px-6 bg-white rounded-3xl border border-dashed border-slate-300/85 shadow-sm max-w-2xl mx-auto flex flex-col items-center gap-6"
            >
              <div className="h-16 w-16 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-2xl border border-emerald-100 shadow-xs shrink-0">
                <Upload className="h-8 w-8 animate-bounce" />
              </div>
              <div>
                <h3 className="font-display text-lg font-black text-slate-800 tracking-tight">
                  No Catalog Loaded
                </h3>
                <p className="text-slate-500 text-xs mt-2 max-w-md mx-auto leading-relaxed">
                  Your kitchen catalog database is currently empty. Please upload an Excel (.xlsx / .xls) product spreadsheet, and our system will automatically adapt your category tabs, items, codes, and pricing ratios.
                </p>
              </div>

              {onUploadExcel ? (
                <div>
                  <button
                    onClick={() => {
                      const inputEl = document.createElement("input");
                      inputEl.type = "file";
                      inputEl.accept = ".xlsx,.xls,.csv";
                      inputEl.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files && files[0]) {
                          const event = {
                            target: {
                              files: files,
                              value: ""
                            }
                          } as any;
                          onUploadExcel(event);
                        }
                      };
                      inputEl.click();
                    }}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs px-6 py-3 rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/10 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Upload .XLSX Spreadsheet</span>
                  </button>
                </div>
              ) : null}
            </motion.div>
          ) : filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-14 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center gap-4"
            >
              <div className="text-slate-300 font-sans text-4xl">📂</div>
              <div className="text-slate-700 font-display font-black text-sm uppercase tracking-wider">
                Category "{selectedCategory}" is Empty
              </div>
              <p className="text-slate-400 text-xs max-w-sm mx-auto font-sans leading-relaxed -mt-1.5 font-medium">
                {showOnlyDrafted 
                  ? `You have not drafted any items in "${selectedCategory}" yet. Add items under this category to start cataloging.`
                  : `We couldn't locate any items cataloged under "${selectedCategory}". You can add custom items directly to this category.`}
              </p>

              {selectedCategory !== "All" && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomCategory(selectedCategory);
                    setShowQuickAdd(true);
                    setTimeout(() => {
                      const el = document.getElementById("quick-add-form-anchor");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  className="mt-2 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-sans font-black text-[11px] uppercase tracking-wider px-4.5 py-3 rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/10"
                >
                  <Plus className="h-4 w-4" />
                  Add Custom Item to "{selectedCategory}"
                </button>
              )}
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div 
              key="grid-container"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              layout="position"
            >
              {streamedItems.map((item) => (
                <ItemCard
                  key={item.Item_ID}
                  item={item}
                  qty={quantities[item.Item_ID] || 0}
                  onQuantityChange={onQuantityChange}
                  onRateChange={onRateChange}
                  onParLevelChange={onParLevelChange}
                  onOnHandChange={onOnHandChange}
                  onItemCategoryChange={handleItemCategoryOverride}
                  categoriesList={categoriesList}
                  currency={currency}
                  isSubAccount={isSubAccount}
                  isFavorite={favorites.includes(item.Item_ID)}
                  onToggleFavorite={onToggleFavorite}
                  note={itemNotes[item.Item_ID]}
                  onOpenNoteEditor={handleOpenNoteEditor}
                  isMapped={!!userCategoryOverrides[item.Item_ID]}
                  onRemoveOverride={() => handleRemoveOverride(item.Item_ID)}
                  itemSection={itemSectionTags[item.Item_ID]}
                  sectionsList={sectionsList}
                  onTagSection={handleTagSection}
                />
              ))}
            </motion.div>
          ) : (
            // Full interactive responsive table!
            <motion.div
              key="table-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
              layout="position"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Code</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Item Name</th>
                      {hasExtraColumns.supplier && !isSubAccount && <th className="p-4">Supplier</th>}
                      {hasExtraColumns.purchasePackaging && <th className="p-4">Purchase Pack</th>}
                      {hasExtraColumns.purchasePrice && !isSubAccount && <th className="p-4 text-right">Purchase Price ({currency.symbol})</th>}
                      {hasExtraColumns.purchaseCount && <th className="p-4 text-center mr-2">Purchase Count</th>}
                      <th className="p-4">Packing Unit</th>
                      <th className="p-4 text-center">Par Level</th>
                      <th className="p-4 text-center">On Hand</th>
                      {!isSubAccount && <th className="p-4 text-right">Rate ({currency.symbol})</th>}
                      <th className="p-4 text-center">Quantity</th>
                      {!isSubAccount && <th className="p-4 text-right">Gross Total ({currency.symbol})</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {streamedItems.map(item => (
                      <ItemRow
                        key={item.Item_ID}
                        item={item}
                        qty={quantities[item.Item_ID] || 0}
                        onQuantityChange={onQuantityChange}
                        onRateChange={onRateChange}
                        onParLevelChange={onParLevelChange}
                        onOnHandChange={onOnHandChange}
                        onItemCategoryChange={handleItemCategoryOverride}
                        categoriesList={categoriesList}
                        showSupplier={hasExtraColumns.supplier}
                        showPurchasePackaging={hasExtraColumns.purchasePackaging}
                        showPurchasePrice={hasExtraColumns.purchasePrice}
                        showPurchaseCount={hasExtraColumns.purchaseCount}
                        currency={currency}
                        isSubAccount={isSubAccount}
                        isFavorite={favorites.includes(item.Item_ID)}
                        onToggleFavorite={onToggleFavorite}
                        note={itemNotes[item.Item_ID]}
                        onOpenNoteEditor={handleOpenNoteEditor}
                        isMapped={!!userCategoryOverrides[item.Item_ID]}
                        onRemoveOverride={() => handleRemoveOverride(item.Item_ID)}
                        itemSection={itemSectionTags[item.Item_ID]}
                        sectionsList={sectionsList}
                        onTagSection={handleTagSection}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* High-Velocity Fast-Stream Sentinel Loader & Action Indicator */}
        {filteredItems.length > streamedItems.length && (
          <div 
            ref={sentinelRef}
            className="flex flex-col items-center justify-center p-6 mt-4 bg-slate-50 border border-slate-200/50 rounded-2xl border-dashed"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 font-sans">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Fast-Stream Indexing Active ({filteredItems.length - streamedItems.length} items remaining)</span>
            </div>
            <button
              onClick={() => setStreamPage(p => p + 1)}
              className="mt-2.5 px-4 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer"
            >
              Force Stream Next Chunk
            </button>
          </div>
        )}
      </div>
    </div>
  </div>

      {/* Internal Note Editor Modal */}
      <AnimatePresence>
        {editingNoteItemId && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 p-6 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-amber-500" />
                  <h3 className="font-sans font-bold text-slate-800 text-sm">
                    Edit Internal Note
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingNoteItemId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">
                  Note Content (visible on hover)
                </label>
                <textarea
                  value={noteDraftText}
                  onChange={(e) => setNoteDraftText(e.target.value)}
                  placeholder="E.g., Special order priority item. Checked by supervisor on shift."
                  className="w-full h-28 rounded-xl border border-slate-200 p-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans leading-relaxed resize-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setNoteDraftText("");
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl text-xs font-semibold border border-slate-200 transition cursor-pointer"
                >
                  Clear Notes
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingNoteItemId(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateItemNote?.(editingNoteItemId, noteDraftText);
                      setEditingNoteItemId(null);
                    }}
                    className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-[0.98] cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
