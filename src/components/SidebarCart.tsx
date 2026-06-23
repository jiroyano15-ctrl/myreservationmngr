import React, { useMemo, useState } from "react";
import { KitchenItem, OrderItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingCart, 
  Trash2, 
  FileSpreadsheet, 
  ArrowRight,
  ChevronRight,
  Package,
  Sparkles,
  DollarSign,
  Plus,
  Minus,
  CheckCircle2,
  ListTodo,
  Coins
} from "lucide-react";

interface SidebarCartProps {
  items: KitchenItem[];
  quantities: Record<string, number>;
  activeShift: string;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onClearDraft: () => void;
  onSubmitOrder: () => void;
  currency?: { symbol: string; code: string };
  onCurrencyChange?: (currency: { symbol: string; code: string }) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  isSubAccount?: boolean;
  selectedSection?: string;
  itemSectionTags?: Record<string, string>;
}

// Deterministic aesthetic styling for custom and standard categories to align with main catalog
const CATEGORY_CHIPS: Record<string, { bg: string; text: string; dot: string }> = {
  Produce: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  Sauces: { bg: "bg-rose-50 border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
  Bakery: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  Meat: { bg: "bg-red-50 border-red-200", text: "text-red-700", dot: "bg-red-500" },
  General: { bg: "bg-sky-50 border-sky-200", text: "text-sky-700", dot: "bg-sky-500" }
};

const getCategoryChipStyle = (cat: string) => {
  if (CATEGORY_CHIPS[cat]) return CATEGORY_CHIPS[cat];
  const hash = cat.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorBands = [
    { bg: "bg-violet-50 border-violet-200", text: "text-violet-700 font-bold", dot: "bg-violet-500" },
    { bg: "bg-teal-50 border-teal-200", text: "text-teal-700 font-bold", dot: "bg-teal-500" },
    { bg: "bg-orange-50 border-orange-200", text: "text-orange-700 font-bold", dot: "bg-orange-500" },
    { bg: "bg-fuchsia-50 border-fuchsia-200", text: "text-fuchsia-700 font-bold", dot: "bg-fuchsia-500" }
  ];
  return colorBands[hash % colorBands.length];
};

export default function SidebarCart({
  items,
  quantities,
  activeShift,
  onQuantityChange,
  onClearDraft,
  onSubmitOrder,
  currency = { symbol: "£", code: "GBP" },
  onCurrencyChange,
  notes,
  onNotesChange,
  isSubAccount = false,
  selectedSection = "All",
  itemSectionTags = {},
}: SidebarCartProps) {
  // Direct printing doesn't need interactive preview state anymore
  
  // Compute total drafted item count regardless of active section filter
  const totalAllDraftedCount = useMemo(() => {
    let count = 0;
    items.forEach(item => {
      if ((quantities[item.Item_ID] || 0) > 0) {
        count++;
      }
    });
    return count;
  }, [items, quantities]);

  // Extract drafted items list matching active section selector
  const draftedItems = useMemo(() => {
    const list: OrderItem[] = [];
    items.forEach(item => {
      const q = quantities[item.Item_ID] || 0;
      if (q > 0) {
        // Filter by kitchen section if selected
        if (selectedSection !== "All") {
          const itemSection = itemSectionTags[item.Item_ID] || "General";
          if (itemSection !== selectedSection) {
            return;
          }
        }

        const rate = item.Rate || 0;
        list.push({
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
    return list;
  }, [items, quantities, selectedSection, itemSectionTags]);

  // Calculations
  const totalItemTypes = draftedItems.length;
  const totalItemVolume = draftedItems.reduce((acc, curr) => acc + curr.Quantity, 0);
  const totalFinancialGross = draftedItems.reduce((acc, curr) => acc + curr.Gross, 0);
  const isCartEmpty = draftedItems.length === 0;

  return (
    <div className="flex flex-col gap-6" id="complete-checkout-workspace">
      
      {isCartEmpty ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[360px] max-w-2xl mx-auto w-full"
          id="empty-cart-container"
        >
          <div className="bg-slate-50 p-5 rounded-2xl text-slate-350 mb-4 border border-dashed border-slate-200 shadow-inner relative">
            <ShoppingCart className="h-9 w-9 text-slate-400" />
            <span className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${totalAllDraftedCount > 0 ? "bg-amber-400 animate-bounce" : "bg-slate-300"}`} />
          </div>
          {totalAllDraftedCount > 0 && selectedSection !== "All" ? (
            <>
              <h3 className="font-display font-black text-slate-800 text-lg tracking-tight">
                No Drafts in "{selectedSection}" Section
              </h3>
              <p className="text-slate-500 text-xs mt-2 max-w-md leading-relaxed font-sans font-medium">
                You have drafted <strong className="text-emerald-600 font-extrabold">{totalAllDraftedCount}</strong> items in total, but none belong to the <strong className="text-slate-700 font-bold">"{selectedSection}"</strong> section. Clear the section filter or select "All" to view and transmit the complete sheet!
              </p>
            </>
          ) : (
            <>
              <h3 className="font-display font-black text-slate-800 text-lg tracking-tight">
                Staging Manifest is Quiet
              </h3>
              <p className="text-slate-500 text-xs mt-2 max-w-md leading-relaxed font-sans font-medium">
                You haven't requested any items for this shift yet. Use the speed search order sheet above to type ingredients, key in quantities, and compile your manifest right here!
              </p>
            </>
          )}
        </motion.div>
      ) : (
        /* Responsive Workspace Grid */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Detailed Interactive Manifest Sheet */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-xs flex flex-col">
            
            {/* Manifest Header Controls */}
            <div className="px-5 py-4 bg-slate-50/75 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-emerald-700 shadow-xs">
                  <ListTodo className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-black text-slate-800 text-sm">
                      Drafted Ingredients Manifest
                    </h3>
                    {selectedSection !== "All" && (
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                        {selectedSection}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-wider mt-0.5">
                    {selectedSection === "All" 
                      ? "Live compilation of shift requirements" 
                      : `Live compilation of "${selectedSection}" shift requirements only`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {!isSubAccount && onCurrencyChange && (
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-650 inline-flex transition hover:border-slate-350 shadow-3xs select-none">
                    <Coins className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 select-none">Curr:</span>
                    <select
                      id="default-currency-select"
                      value={JSON.stringify(currency)}
                      onChange={(e) => {
                        try {
                          onCurrencyChange(JSON.parse(e.target.value));
                        } catch (err) {
                          console.error("Failed to parse currency selection", err);
                        }
                      }}
                      className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-hidden pr-1 cursor-pointer font-sans"
                      title="Choose default currency for the system"
                    >
                      <option value={JSON.stringify({ symbol: "KD", code: "KWD" })}>KWD (KD)</option>
                      <option value={JSON.stringify({ symbol: "£", code: "GBP" })}>GBP (£)</option>
                      <option value={JSON.stringify({ symbol: "$", code: "USD" })}>USD ($)</option>
                      <option value={JSON.stringify({ symbol: "€", code: "EUR" })}>EUR (€)</option>
                      <option value={JSON.stringify({ symbol: "AED", code: "AED" })}>AED</option>
                      <option value={JSON.stringify({ symbol: "SAR", code: "SAR" })}>SAR</option>
                      <option value={JSON.stringify({ symbol: "₱", code: "PHP" })}>PHP (₱)</option>
                      <option value={JSON.stringify({ symbol: "₹", code: "INR" })}>INR (₹)</option>
                      <option value={JSON.stringify({ symbol: "kr", code: "SEK" })}>SEK (kr)</option>
                      <option value={JSON.stringify({ symbol: "kr", code: "NOK" })}>NOK (kr)</option>
                      <option value={JSON.stringify({ symbol: "kr", code: "DKK" })}>DKK (kr)</option>
                      <option value={JSON.stringify({ symbol: "CHF", code: "CHF" })}>CHF</option>
                    </select>
                  </div>
                )}

                <button
                  id="wipe-draft-manifest-btn"
                  onClick={onClearDraft}
                  className="text-xs text-rose-605 hover:text-rose-700 font-bold hover:bg-rose-50 border border-transparent hover:border-rose-100 px-3 py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 bg-white shadow-3xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Wipe Staging
                </button>
              </div>
            </div>

            {/* Interactive Layout Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/30 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-4 pl-5">Code</th>
                    <th className="p-4">Ingredient Description</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Procurement Unit</th>
                    <th className="p-4 text-center w-36">Draft Quantity</th>
                    {!isSubAccount && (
                      <>
                        <th className="p-4 text-right">Unit Rate</th>
                        <th className="p-4 text-right pr-5">Gross Line Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-xs">
                  <AnimatePresence mode="popLayout">
                    {draftedItems.map((orderItem) => {
                      const chip = getCategoryChipStyle(orderItem.Category);
                      return (
                        <motion.tr
                          key={orderItem.Item_ID}
                          layoutId={`sheet-row-${orderItem.Item_ID}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          {/* Item ID Code */}
                          <td className="p-4 pl-5 font-mono text-xs font-bold text-slate-605">
                            {orderItem.Item_ID}
                          </td>

                          {/* Item Name */}
                          <td className="p-4 text-slate-800 font-bold font-sans">
                            {orderItem.Item_Name}
                          </td>

                          {/* Dynamic Category chip */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${chip.bg} ${chip.text}`}>
                              <span className={`h-1 w-1 rounded-full ${chip.dot}`} />
                              {orderItem.Category}
                            </span>
                          </td>

                          {/* Unit type description */}
                          <td className="p-4 text-center text-slate-400 font-medium font-sans">
                            {orderItem.Unit_Type}
                          </td>

                          {/* Interactive Quantity Stepper */}
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl shadow-inner group-hover:bg-white transition-all">
                              <button
                                type="button"
                                onClick={() => onQuantityChange(orderItem.Item_ID, Math.max(0, orderItem.Quantity - 1))}
                                className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                                title="Subtract Unit"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                className="w-10 text-center font-mono font-bold text-xs text-slate-800 bg-transparent border-none focus:outline-hidden"
                                value={orderItem.Quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  onQuantityChange(orderItem.Item_ID, isNaN(val) ? 1 : Math.max(1, val));
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => onQuantityChange(orderItem.Item_ID, orderItem.Quantity + 1)}
                                className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                                title="Add Unit"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>

                          {/* Unit Rate */}
                          {!isSubAccount && (
                            <td className="p-4 text-right font-mono text-slate-500 font-bold">
                              {currency.symbol}{orderItem.Rate.toFixed(2)}
                            </td>
                          )}

                          {/* Gross Price with delete button */}
                          <td className="p-4 text-right pr-5">
                            <div className="flex items-center justify-end gap-3.5">
                              {!isSubAccount && (
                                <span className="font-mono text-xs font-black text-emerald-800">
                                  {currency.symbol}{orderItem.Gross.toFixed(2)}
                                </span>
                              )}
                              <button
                                onClick={() => onQuantityChange(orderItem.Item_ID, 0)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer border border-transparent hover:border-rose-100/60"
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Sub-Manifest statistics */}
            <div className="bg-slate-50/50 p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-sans font-medium">
              <span>Dynamic Staging Pipeline</span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Computed live using encrypted local schemas</span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Control & Transmit Console */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Summary Totals Card - TARGETED FOR FOCUSED ELEMENT */}
          <div 
            id="summary-totals-card"
            className="bg-emerald-600 rounded-2xl border border-emerald-700/80 p-5 text-white shadow-md relative overflow-hidden flex flex-col gap-4 group"
          >
            {/* Aesthetic cosmic/emerald design overlays */}
            <div className="absolute top-0 right-0 h-32 w-32 bg-white/5 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute bottom-0 left-0 h-16 w-16 bg-black/10 rounded-full -ml-8 -mb-8 pointer-events-none" />

            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/85 p-2.5 rounded-xl border border-emerald-500 shadow-sm shrink-0">
                <Package className="h-5 w-5 text-emerald-100" />
              </div>
              <div>
                <h3 className="font-display font-black text-sm uppercase tracking-wider text-emerald-100">
                  Summary Totals
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-emerald-200">
                  <span className="font-extrabold">{totalItemTypes}</span> types
                  <span>•</span>
                  <span className="font-extrabold">{totalItemVolume}</span> cumulative units
                </div>
              </div>
            </div>

            <div className="border-t border-emerald-500/50 pt-4 flex items-end justify-between">
              <div>
                <span className="block text-[9px] uppercase tracking-widest text-emerald-200 font-extrabold">
                  {isSubAccount ? "Total Cumulative Units" : "Cumulative Gross Valuation"}
                </span>
                <span className="block font-sans text-2xl font-black text-white mt-1 leading-none">
                  {isSubAccount ? `${totalItemVolume} units` : `${currency.symbol}${totalFinancialGross.toFixed(2)}`}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-emerald-100 border border-emerald-400/30 text-[9px] font-extrabold uppercase font-mono tracking-wider animate-pulse">
                {selectedSection !== "All" ? `${selectedSection} Section` : `${activeShift} Shift`}
              </span>
            </div>
          </div>

          {/* Delivery instruction / notes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-sans flex items-center justify-between">
              <span>Custom Prep & Shift Notes</span>
              <span className="text-[9px] font-bold text-slate-400 lowercase italic font-sans">
                Optional
              </span>
            </label>
            <textarea
              id="manifest-notes-textarea"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add delivery instruction prompts, prep detail reminders, or supplier notifications..."
              rows={3}
              className="w-full text-xs p-3 border border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 hover:border-slate-300 transition-all font-sans text-slate-700 bg-slate-50 placeholder:text-slate-400 font-medium resize-none shadow-inner"
            />
          </div>

          {/* Core Dispatch Actions */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-3">
            <button
              id="transmit-manifest-action-btn"
              onClick={onSubmitOrder}
              disabled={isCartEmpty}
              className={`w-full py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                isCartEmpty
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.98] shadow-emerald-600/10 hover:shadow-md"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Transmit Manifest File
            </button>

          </div>

        </div>

      </div>
    )}

      {/* Hidden Print-Only Layout representing the physical order manifest copy */}
      <div id="printable-kitchen-manifest" className="hidden print:block font-sans p-8 bg-white text-black text-xs leading-relaxed">
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900">Kitchen Order Manifest</h1>
              <p className="text-sm font-bold text-slate-600 mt-1">Draft Staging Context: {activeShift} Shift</p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-sm tracking-wider uppercase">OFFICIAL REQUISITION</span>
              <p className="text-[10px] text-slate-500 mt-1.5">Printed: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-50/50 p-3 rounded border border-slate-200/60">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Operational Details</h3>
            <p className="font-bold text-slate-700">Target Shift: <span className="font-extrabold text-slate-950">{activeShift}</span></p>
            <p className="font-medium text-slate-650 mt-1">Staging Version: LM-{Math.floor(1000 + Math.random() * 9000)}</p>
          </div>
          <div className="bg-slate-50/50 p-3 rounded border border-slate-200/60">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Operational Summary</h3>
            <p className="font-bold text-slate-750">Item Line Count: <span className="font-extrabold text-slate-950">{totalItemTypes} lines</span></p>
            <p className="font-bold text-slate-750 mt-1">Total Packs Quantity: <span className="font-extrabold text-slate-950">{totalItemVolume} packs</span></p>
          </div>
        </div>

        {/* Content Table */}
        <table className="w-full text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 uppercase text-[9px] font-black text-slate-700 tracking-wider border-b border-slate-300">
              <th className="p-2 border border-slate-300">Code</th>
              <th className="p-2 border border-slate-300">Ingredient Description</th>
              <th className="p-2 border border-slate-300 text-center">Category</th>
              <th className="p-2 border border-slate-300 text-center">Unit</th>
              <th className="p-2 border border-slate-300 text-center">Qty</th>
              {!isSubAccount && (
                <>
                  <th className="p-2 border border-slate-300 text-right">Rate</th>
                  <th className="p-2 border border-slate-300 text-right">Line Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-250">
            {draftedItems.map((order) => (
              <tr key={order.Item_ID} className="text-[11px] leading-tight text-slate-800">
                <td className="p-2 border border-slate-300 font-mono font-bold text-slate-950">{order.Item_ID}</td>
                <td className="p-2 border border-slate-300 font-bold">{order.Item_Name}</td>
                <td className="p-2 border border-slate-300 text-center font-semibold">{order.Category}</td>
                <td className="p-2 border border-slate-300 text-center font-semibold">{order.Unit_Type}</td>
                <td className="p-2 border border-slate-300 text-center font-black font-mono">{order.Quantity}</td>
                {!isSubAccount && (
                  <>
                    <td className="p-2 border border-slate-300 text-right font-mono font-medium">{currency.symbol}{order.Rate.toFixed(2)}</td>
                    <td className="p-2 border border-slate-300 text-right font-mono font-bold text-slate-950">{currency.symbol}{order.Gross.toFixed(2)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!isSubAccount && (
          <div className="flex justify-end mt-4 mb-6 pr-2">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-450 block leading-none">Gross Cumulative Value</span>
              <span className="text-lg font-black text-slate-950 block mt-1 tracking-tight">
                {currency.symbol}{totalFinancialGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {notes && (
          <div className="mt-4 p-3 border border-slate-300 bg-slate-50/50 rounded">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Staging Workspace Remarks / Dispatch Instructions</h4>
            <p className="text-[10.5px] italic text-slate-850 font-medium whitespace-pre-wrap">{notes}</p>
          </div>
        )}

        {/* Print signature blocks */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-12 pr-4 text-center text-[10px] text-slate-400 font-bold">
          <div>
            <div className="h-10 border-b border-dashed border-slate-300"></div>
            <p className="mt-2 text-slate-605">PREPARED BY STATION LEADER</p>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-slate-300"></div>
            <p className="mt-2 text-slate-605">AUTHORIZED STORE MANAGER</p>
          </div>
        </div>
      </div>

    </div>
  );
}
