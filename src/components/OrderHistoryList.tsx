import React, { useState } from "react";
import { OrderRecord, OrderItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  History, 
  Trash2, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  ArrowUpRight,
  Package,
  Calendar,
  RotateCcw,
  Clock,
  CheckCircle2
} from "lucide-react";
import * as XLSX from "xlsx";

interface OrderHistoryListProps {
  history: OrderRecord[];
  onClearHistory: () => void;
  onDeleteRecord: (id: string) => void;
  onRestoreRecord: (record: OrderRecord) => void;
  currency?: { symbol: string; code: string };
  isSubAccount?: boolean;
  receivedItems?: Record<string, boolean>;
  onToggleReceived?: (recordId: string, itemId: string, idx: number) => void;
}

export default function OrderHistoryList({
  history,
  onClearHistory,
  onDeleteRecord,
  onRestoreRecord,
  currency = { symbol: "£", code: "GBP" },
  isSubAccount = false,
  receivedItems = {},
  onToggleReceived,
}: OrderHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Toggle rows
  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Re-download historic order sheet
  const handleDownloadHistoricalFile = (record: OrderRecord, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid expanding the row when downloading

    const finalOrder = record.items.map(item => {
      const base: any = {
        Timestamp: record.timestamp,
        Category: item.Category,
        Item_ID: item.Item_ID,
        Item_Name: item.Item_Name,
        Quantity: item.Quantity,
        Unit: item.Unit_Type,
      };
      if (!isSubAccount) {
        base.Rate = item.Rate || 0;
        base.Gross = item.Gross || (item.Quantity * (item.Rate || 0));
      }
      return base;
    });

    const worksheet = XLSX.utils.json_to_sheet(finalOrder);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kitchen Order");
    
    const fileSuffix = record.id.slice(0, 5);
    XLSX.writeFile(workbook, `Kitchen_Order_Historical_${fileSuffix}.xlsx`);
  };

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center shadow-sm">
        <div className="flex justify-center mb-3">
          <div className="bg-slate-50 p-3 rounded-full text-slate-400 border border-dashed border-slate-200/80">
            <History className="h-6 w-6" />
          </div>
        </div>
        <h3 className="font-sans font-bold text-slate-700 text-xs">No Submissions Recorded</h3>
        <p className="text-slate-400 text-[10px] sm:text-xs mt-1 max-w-xs mx-auto leading-relaxed font-sans">
          When you transmit draft orders to the warehouse, a durable copy of your order manifest history is logged here containing rates, items, and calculated totals.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header controls */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-800">
          <History className="h-4 w-4 text-slate-500" />
          <h3 className="font-sans font-bold text-xs">Submission History Archives</h3>
        </div>
        <button
          onClick={onClearHistory}
          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1 rounded-lg cursor-pointer transition"
        >
          Wipe Archives
        </button>
      </div>

      {/* History interactive list items */}
      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
        {history.slice().reverse().map((record) => {
          const isExpanded = expandedId === record.id;
          const totalPacksCount = record.items.reduce((sum, i) => sum + i.Quantity, 0);
          const totalGrossVal = record.items.reduce((sum, i) => sum + (i.Gross || (i.Quantity * (i.Rate || 0))), 0);
          const isAllReceived = record.items.length > 0 && record.items.every((item, idx) => !!receivedItems[`${record.id}_${item.Item_ID}_${idx}`]);

          return (
            <div key={record.id} className="hover:bg-slate-50/50 transition duration-150">
              
              {/* Collapsed Display Summary Row */}
              <div 
                onClick={() => toggleExpanded(record.id)}
                className="px-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Arrow toggle */}
                  <div className="text-slate-400 group-hover:text-slate-600">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        ID: {record.id.slice(0, 8).toUpperCase()}
                      </span>
                      {isAllReceived ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-sans text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 select-none">
                          <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                          COMPLETED
                        </span>
                      ) : (
                        <span className="bg-amber-100/80 text-amber-900 border border-amber-200/80 font-sans text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 select-none">
                          <Clock className="h-2.5 w-2.5 shrink-0 animate-pulse text-amber-600" />
                          PENDING
                        </span>
                      )}
                      {!isSubAccount ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 font-sans text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {currency.symbol}{totalGrossVal.toFixed(2)}
                        </span>
                      ) : (
                        <span className="bg-indigo-50 text-indigo-800 border border-indigo-100 font-sans text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {totalPacksCount} units
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 font-sans">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{record.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* Left controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="hidden sm:inline-block font-mono text-[11px] text-slate-500 mr-1.5">
                    {totalPacksCount} units
                  </span>

                  {/* Redownload history spreadsheet */}
                  <button
                    onClick={(e) => handleDownloadHistoricalFile(record, e)}
                    className="p-1 px-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer border border-slate-100 bg-white"
                    title="Download Spreadsheet"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>

                  {/* Restore past elements directly */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestoreRecord(record);
                    }}
                    className="p-1 px-1.5 rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 transition cursor-pointer border border-slate-100 bg-white"
                    title="Re-populate Draft"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete individual record */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRecord(record.id);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete Record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded Breakdown Row */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-50 px-4 pb-4 border-t border-slate-100"
                  >
                    <div className="pt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">
                      Order breakdown details:
                    </div>
                    
                    <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                      {record.items.map((item, idx) => {
                        const calculatedGross = item.Gross || (item.Quantity * (item.Rate || 0));
                        const itemKey = `${record.id}_${item.Item_ID}_${idx}`;
                        const isReceived = !!receivedItems[itemKey];

                        return (
                          <div 
                            key={idx}
                            className={`bg-white rounded-lg p-2.5 border flex items-center justify-between text-xs transition duration-150 ${
                              isReceived ? "border-emerald-200 bg-emerald-50/10 shadow-xs" : "border-slate-200/40 shadow-xs"
                            }`}
                          >
                            <div className="min-w-0 flex-1 flex items-center gap-2.5">
                              <input 
                                type="checkbox"
                                checked={isReceived}
                                onChange={() => onToggleReceived?.(record.id, item.Item_ID, idx)}
                                className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                                title={isReceived ? "Mark item as pending" : "Mark item as received"}
                              />
                              <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-700 shrink-0 bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono">
                                  {item.Category}
                                </span>
                                <span className={`font-medium transition-all ${isReceived ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800"}`}>
                                  {item.Item_Name}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 font-sans text-slate-500 text-[11px]">
                              {isReceived ? (
                                <span className="flex items-center gap-1 font-sans text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 select-none shrink-0" title="Received">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                  <span>Received</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 font-sans text-[10px] font-bold text-amber-700 bg-amber-50/60 border border-amber-200 rounded px-1.5 py-0.5 select-none shrink-0" title="Pending">
                                  <Clock className="h-3 w-3 text-amber-500 shrink-0 animate-pulse" />
                                  <span>Pending</span>
                                </span>
                              )}

                              {!isSubAccount ? (
                                <>
                                  <span className="font-mono text-slate-400 text-[10px]">
                                    {item.Quantity} x {currency.symbol}{item.Rate?.toFixed(2)}
                                  </span>
                                  <span className="font-mono bg-emerald-50 text-emerald-800 border border-emerald-100 rounded px-1.5 py-0.5 font-bold">
                                    {currency.symbol}{calculatedGross.toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="font-mono bg-slate-50 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 font-bold">
                                  {item.Quantity} {item.Unit_Type || "units"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {record.notes && (
                      <div className="mt-3 bg-amber-50/40 border border-amber-100/75 rounded-xl p-3 text-xs text-slate-705 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-s-xl" />
                        <span className="font-sans font-bold text-amber-800 uppercase text-[9px] tracking-wider block mb-1 pl-1.5">
                          Order Notes / Delivery Instructions:
                        </span>
                        <p className="font-sans font-medium italic whitespace-pre-wrap leading-relaxed text-slate-600 pl-1.5">
                          {record.notes}
                        </p>
                      </div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          );
        })}
      </div>
    </div>
  );
}
