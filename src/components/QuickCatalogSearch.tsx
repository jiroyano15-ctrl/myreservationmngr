import React, { useState, useMemo, useRef, useEffect } from "react";
import { KitchenItem } from "../types";
import { 
  X, 
  CornerDownLeft, 
  Grid
} from "lucide-react";

interface QuickCatalogSearchProps {
  items: KitchenItem[];
  quantities: Record<string, number>;
  onQuantityChange: (itemId: string, qty: number) => void;
  currency: { symbol: string; code: string };
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchExactCode: string;
  setSearchExactCode: (val: string) => void;
}

export function QuickCatalogSearch({
  items,
  quantities,
  onQuantityChange,
  currency,
  searchQuery,
  setSearchQuery,
  searchExactCode,
  setSearchExactCode,
}: QuickCatalogSearchProps) {
  // Direct entry spreadsheet row states
  const [activeCode, setActiveCode] = useState("");
  const [selectedItem, setSelectedItem] = useState<KitchenItem | null>(null);
  const [activeQty, setActiveQty] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestIndex, setFocusedSuggestIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Clean suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute live suggest matches based on the typed search code or name
  const suggestions = useMemo(() => {
    const query = activeCode.trim().toLowerCase();
    if (!query) return [];

    return items
      .filter((item) => {
        const nameMatch = item.Item_Name.toLowerCase().includes(query);
        const idMatch = item.Item_ID.toLowerCase().includes(query);
        const catMatch = (item.Category || "").toLowerCase().includes(query);
        return nameMatch || idMatch || catMatch;
      })
      .slice(0, 8); // Floating directory size upper bound
  }, [items, activeCode]);

  // Sync back to standard main search states for general catalog search if activeCode changes
  useEffect(() => {
    setSearchQuery(activeCode);
  }, [activeCode, setSearchQuery]);

  // Load a selected item into the fast SQL active entry row
  const handleSelectItem = (item: KitchenItem) => {
    setSelectedItem(item);
    setActiveCode(item.Item_ID);
    setSearchQuery(item.Item_Name);
    setSearchExactCode(item.Item_ID);
    setShowSuggestions(false);
    setFocusedSuggestIndex(-1);
    
    // Auto shift focus instantly to the Quantity field
    setTimeout(() => {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    }, 15);
  };

  // Keyboard navigation control inside the item name/code search field
  const handleItemFieldKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter" && activeCode.trim() !== "") {
        // Find best match if exact enter hit
        const exactMatch = items.find(
          (it) => it.Item_ID.toLowerCase().trim() === activeCode.toLowerCase().trim()
        );
        if (exactMatch) {
          e.preventDefault();
          handleSelectItem(exactMatch);
        } else if (suggestions.length > 0) {
          e.preventDefault();
          handleSelectItem(suggestions[0]);
        }
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedSuggestIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedSuggestIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const indexToSelect = focusedSuggestIndex >= 0 ? focusedSuggestIndex : 0;
      if (suggestions[indexToSelect]) {
        handleSelectItem(suggestions[indexToSelect]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Compute active preview item dynamically based on selected or first suggestion
  const previewItem = useMemo(() => {
    if (selectedItem) return selectedItem;
    if (suggestions.length > 0) {
      if (focusedSuggestIndex >= 0 && suggestions[focusedSuggestIndex]) {
        return suggestions[focusedSuggestIndex];
      }
      return suggestions[0];
    }
    return null;
  }, [selectedItem, suggestions, focusedSuggestIndex]);

  // Stage active input item, calculate and reset focus immediately
  const handleCommitActiveRow = () => {
    const itemToCommit = previewItem;
    if (!itemToCommit) {
      return;
    }

    const qtyToStage = parseFloat(activeQty);
    if (!isNaN(qtyToStage) && qtyToStage >= 0) {
      onQuantityChange(itemToCommit.Item_ID, qtyToStage);
    } else {
      // Default fallback to 1 unit if left empty
      onQuantityChange(itemToCommit.Item_ID, 1);
    }

    resetActiveInputs();
  };

  const resetActiveInputs = () => {
    setActiveCode("");
    setSelectedItem(null);
    setActiveQty("");
    setSearchExactCode("");
    setShowSuggestions(false);
    setFocusedSuggestIndex(-1);

    // Focus instantly right back to the Item field for rapid action continuous order entry
    setTimeout(() => {
      itemInputRef.current?.focus();
    }, 15);
  };

  return (
    <div 
      ref={containerRef}
      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col gap-4 relative font-sans md:w-[715.4px] w-full"
      id="fast-erp-order-sheet-container"
    >
      {/* Spreadsheet grid component */}
      <div className="border border-slate-200 rounded-xl shadow-xs bg-slate-50/50">
        <table className="w-full text-left border-collapse text-xs select-none">
          <thead>
            <tr className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="p-3 border-r border-slate-200/60 w-[220px] bg-slate-50">Item (Code / Search)</th>
              <th className="p-3 border-r border-slate-200/60 bg-slate-50">Description</th>
              <th className="p-3 border-r border-slate-200/60 text-center w-[120px] bg-slate-50">Units</th>
              <th className="p-3 text-right w-[150px] bg-slate-50">Quantity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {/* Active entry row to directly stage orders */}
            <tr className="bg-slate-50/95 border-b border-emerald-500/35 active-spreadsheet-row shadow-sm">
              <td className="p-2 border-r border-slate-200/60 relative bg-slate-50/95">
                <div className="relative flex items-center">
                  <input
                    ref={itemInputRef}
                    type="text"
                    value={activeCode}
                    onChange={(e) => {
                      setActiveCode(e.target.value);
                      setShowSuggestions(true);
                      setFocusedSuggestIndex(-1);
                      if (selectedItem) setSelectedItem(null);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleItemFieldKeyDown}
                    placeholder="Type name / ID code..."
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded pl-2.5 pr-2.5 py-1.5 text-xs font-semibold focus:outline-none placeholder:text-slate-400 text-slate-800 placeholder:font-normal"
                    autoComplete="off"
                  />
                  {activeCode && (
                    <button
                      onClick={() => {
                        setActiveCode("");
                        setSelectedItem(null);
                      }}
                      className="absolute right-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Floating catalog suggest catalog directory inside the active row segment */}
                {showSuggestions && activeCode.trim().length > 0 && (
                  <div 
                    className="absolute left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden text-xs w-[480px] origin-top-left"
                    id="fast-suggest-popup-dropdown"
                  >
                    {/* popup directory records list */}
                    <div className="max-h-[140px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent overscroll-contain divide-y divide-slate-100 z-50">
                      {suggestions.length > 0 ? (
                        suggestions.map((item, index) => {
                          const isSelected = index === focusedSuggestIndex;
                          const onHand = item.On_Hand ?? 0;
                          const parLevel = item.Par_Level ?? 0;
                          const isBelowPar = parLevel > 0 && onHand < parLevel;

                          return (
                            <div
                              key={item.Item_ID}
                              onClick={() => handleSelectItem(item)}
                              onMouseEnter={() => setFocusedSuggestIndex(index)}
                              className={`grid grid-cols-12 items-center p-2.5 transition-colors cursor-pointer select-none ${
                                isSelected ? "bg-emerald-50 text-emerald-950 font-semibold" : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className="col-span-6 flex flex-col gap-0.5 px-1 min-w-0">
                                <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                  {item.Item_ID}
                                </span>
                                <span className="text-slate-900 font-bold truncate">
                                  {item.Item_Name}
                                </span>
                              </div>
                              <div className="col-span-3 text-center">
                                <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isBelowPar 
                                    ? "bg-rose-50 text-rose-700 border border-rose-100" 
                                    : "bg-slate-100 text-slate-700"
                                }`}>
                                  {onHand}
                                </span>
                              </div>
                              <div className="col-span-3 text-right pr-2 text-slate-500 font-sans truncate">
                                    {item.Unit_Type || "Packs"}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-slate-400 italic font-sans text-xs bg-slate-50/50">
                          No database matching records found for "{activeCode}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </td>
              <td className="p-2 border-r border-slate-200/60 bg-emerald-50/5 text-slate-600 font-medium bg-slate-50/95">
                {previewItem ? (
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold ${selectedItem ? "text-slate-800" : "text-emerald-700/80 italic font-medium"}`}>
                      {previewItem.Item_Name}
                    </span>
                    {!selectedItem && (
                      <span className="text-[9px] text-emerald-600 font-sans font-semibold">Suggested Match</span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Auto-resolved from input...</span>
                )}
              </td>
              <td className="p-2 border-r border-slate-200/60 bg-emerald-50/5 text-slate-550 font-mono text-center bg-slate-50/95">
                {previewItem ? (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedItem ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-705 border border-emerald-200/50"}`}>
                    {previewItem.Unit_Type || "Packs"}
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
              <td className="p-2 bg-emerald-50/10 bg-slate-50/95">
                <div className="relative flex items-center">
                  <input
                    ref={qtyInputRef}
                    type="text"
                    value={activeQty}
                    onChange={(e) => setActiveQty(e.target.value.replace(/[^0-9.]/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCommitActiveRow();
                      }
                    }}
                    placeholder="1.00"
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-right focus:outline-none text-slate-800"
                  />
                  <div className="absolute left-2 text-[10px] text-slate-400 font-sans pointer-events-none uppercase font-bold flex items-center gap-1">
                    <CornerDownLeft className="h-3 w-3 text-emerald-500 opacity-60 animate-pulse" />
                    <span>Enter</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
