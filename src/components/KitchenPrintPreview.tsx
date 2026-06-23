import React, { useState, useMemo } from "react";
import { KitchenItem, OrderItem } from "../types";
import { 
  Printer, 
  X, 
  Check, 
  FileText, 
  Eye, 
  Info,
  Sliders,
  DollarSign,
  Truck,
  Edit3
} from "lucide-react";

interface KitchenPrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  items: KitchenItem[];
  quantities: Record<string, number>;
  activeShift: string;
  currency?: { symbol: string; code: string };
  isSubAccount?: boolean;
}

export default function KitchenPrintPreview({
  isOpen,
  onClose,
  items,
  quantities,
  activeShift,
  currency = { symbol: "£", code: "GBP" },
  isSubAccount = false,
}: KitchenPrintPreviewProps) {
  // Option Toggles for the physical kitchen paper order
  const [includeValuation, setIncludeValuation] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [largeFont, setLargeFont] = useState(false);
  const [customKitchenNotes, setCustomKitchenNotes] = useState("");

  // Editable voucher headers persisting to localStorage
  const [branchName, setBranchName] = useState(() => localStorage.getItem("print_branch_name") || "LUMA RESTAURANT");
  const [docNumber, setDocNumber] = useState(() => localStorage.getItem("print_doc_number") || "LM1-2127");
  const [reportDate, setReportDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [remarksText, setRemarksText] = useState(() => localStorage.getItem("print_remarks_text") || "Shift Delivery");

  const handleBranchChange = (val: string) => {
    setBranchName(val);
    localStorage.setItem("print_branch_name", val);
  };
  const handleDocNumberChange = (val: string) => {
    setDocNumber(val);
    localStorage.setItem("print_doc_number", val);
  };
  const handleRemarksChange = (val: string) => {
    setRemarksText(val);
    localStorage.setItem("print_remarks_text", val);
  };

  const draftedItems = useMemo(() => {
    const list: OrderItem[] = [];
    items.forEach(item => {
      const q = quantities[item.Item_ID] || 0;
      if (q > 0) {
        const details = items.find(i => i.Item_ID === item.Item_ID);
        list.push({
          Item_ID: item.Item_ID,
          Category: item.Category,
          Item_Name: item.Item_Name,
          Quantity: q,
          Unit_Type: item.Unit_Type,
          Rate: item.Rate || 0,
          Gross: q * (item.Rate || 0),
          ...((details && details.Supplier) ? { supplier: details.Supplier } : {})
        } as any);
      }
    });
    return list.sort((a, b) => a.Category.localeCompare(b.Category));
  }, [items, quantities]);

  const totalTypes = draftedItems.length;
  const totalQty = draftedItems.reduce((acc, curr) => acc + curr.Quantity, 0);
  const totalValue = draftedItems.reduce((acc, curr) => acc + curr.Gross, 0);

  const decimalPlaces = currency.code === "KWD" ? 3 : 2;

  // Convert decimal total rate to English Words
  const amountInWords = useMemo(() => {
    const num = totalValue;
    const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
    const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
    
    function getWords(n: number): string {
      if (n < 20) return ones[n];
      if (n < 100) {
        const remainder = n % 10;
        return tens[Math.floor(n / 10)] + (remainder ? " " + ones[remainder] : "");
      }
      if (n < 1000) {
        const hundredPart = Math.floor(n / 100);
        const remainder = n % 100;
        return ones[hundredPart] + " HUNDRED" + (remainder ? " AND " + getWords(remainder) : "");
      }
      if (n < 1000000) {
        const thousandPart = Math.floor(n / 1000);
        const remainder = n % 1000;
        return getWords(thousandPart) + " THOUSAND" + (remainder ? " " + getWords(remainder) : "");
      }
      return n.toString();
    }

    if (num <= 0) {
      if (currency.code === "KWD") return "ZERO DINARS ONLY";
      return "ZERO ONLY";
    }

    if (currency.code === "KWD") {
      const dinars = Math.floor(num);
      const fils = Math.round((num - dinars) * 1000);
      
      let words = "";
      if (dinars > 0) {
        words += getWords(dinars) + " DINARS";
      }
      if (fils > 0) {
        if (words) words += " AND ";
        words += getWords(fils) + " FILS";
      }
      return words ? words + " ONLY" : "ZERO DINARS ONLY";
    }

    const major = Math.floor(num);
    const minor = Math.round((num - major) * 100);
    
    let majorUnit = "DOLLARS";
    let minorUnit = "CENTS";
    
    if (currency.code === "GBP") {
      majorUnit = "POUNDS";
      minorUnit = "PENCE";
    } else if (currency.code === "EUR") {
      majorUnit = "EUROS";
      minorUnit = "CENTS";
    } else if (currency.code === "PHP") {
      majorUnit = "PESOS";
      minorUnit = "CENTAVOS";
    } else if (currency.code === "INR") {
      majorUnit = "RUPEES";
      minorUnit = "PAISE";
    } else if (currency.code === "AED" || currency.code === "SAR") {
      majorUnit = currency.code;
      minorUnit = "FILS";
    } else {
      majorUnit = currency.code;
      minorUnit = "CENTS";
    }

    let words = "";
    if (major > 0) {
      words += getWords(major) + " " + majorUnit;
    }
    if (minor > 0) {
      if (words) words += " AND ";
      words += getWords(minor) + " " + minorUnit;
    }
    return words ? words + " ONLY" : `ZERO ${majorUnit} ONLY`;
  }, [totalValue, currency]);

  const formattedReportDate = useMemo(() => {
    if (!reportDate) return "";
    const parts = reportDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return reportDate;
  }, [reportDate]);

  if (!isOpen) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      
      {/* Container holding controls and the preview */}
      <div className="bg-slate-100 hover:shadow-2xl transition-all duration-300 w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col md:flex-row h-[90vh]">
        
        {/* LEFT COLUMN: Controls & Settings */}
        <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col justify-between overflow-y-auto shrink-0">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-emerald-600" />
                <h2 className="font-display font-bold text-slate-800 text-lg">Voucher Settings</h2>
              </div>
              <button 
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-sans leading-relaxed mb-5">
              Customize the printed Consumption Voucher template parameters below. Style is configured to match the paper dispatch receipts exactly.
            </p>

            <div className="space-y-4 font-sans">
              
              {/* Toggle Valuation */}
              {!isSubAccount && (
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition select-none">
                  <input
                    type="checkbox"
                    checked={includeValuation}
                    onChange={(e) => setIncludeValuation(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="block font-semibold text-xs text-slate-800">Include Flat Rates</span>
                    <span className="block text-[10px] text-slate-400">Shows unit rate prices and gross total calculations on the voucher sheet.</span>
                  </div>
                </label>
              )}

              {/* Toggle Signatures */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition select-none">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="block font-semibold text-xs text-slate-800">Verification Sign-offs</span>
                  <span className="block text-[10px] text-slate-400">Adds signature loops: Prepared By, Verified By with cursive hand illustrations.</span>
                </div>
              </label>

              {/* High visibility text scale for rush prep lines */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition select-none">
                <input
                  type="checkbox"
                  checked={largeFont}
                  onChange={(e) => setLargeFont(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="block font-semibold text-xs text-slate-800">Large Printable Font</span>
                  <span className="block text-[10px] text-slate-400">Enlarges line heights and font elements for quick warehouse checking.</span>
                </div>
              </label>

              {/* Invoice Details Customization Column */}
              <div className="border-t border-slate-200 pt-4 space-y-3 font-sans">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Voucher Fields</span>
                
                {/* Branch Name Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Branch Name</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="LUMA RESTAURANT"
                  />
                </div>

                {/* Doc Number Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Doc. Number</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => handleDocNumberChange(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                    placeholder="LM1-2127"
                  />
                </div>

                {/* Date Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Voucher Date</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Remarks Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Remarks</label>
                  <input
                    type="text"
                    value={remarksText}
                    onChange={(e) => handleRemarksChange(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Shift Delivery details"
                  />
                </div>
              </div>

              {/* Chef handwritten instruction area */}
              <div className="space-y-1.5 border-t border-slate-200 pt-3">
                <label className="block text-xs font-bold text-slate-700 font-sans flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                  Additional Notes
                </label>
                <textarea
                  value={customKitchenNotes}
                  onChange={(e) => setCustomKitchenNotes(e.target.value)}
                  placeholder="e.g. Please triple-wrap dry items."
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans leading-relaxed resize-none h-16"
                />
              </div>

            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <button
              onClick={handleBrowserPrint}
              disabled={totalTypes === 0}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 hover:shadow-lg disabled:bg-slate-200 disabled:text-slate-400 text-white font-sans font-bold text-xs tracking-wider uppercase rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Printer className="h-4 w-4" />
              Print Paper Copy
            </button>
            <p className="text-[10px] text-center text-slate-400 font-sans">
              Matches custom formatted paper standard ledger layouts.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Print Layout Preview Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-100">
          
          {/* Preview Navigation Header bar */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 text-slate-600 p-1.5 rounded-lg font-mono text-[10px] uppercase font-bold tracking-wider">
                Voucher Mode
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm text-slate-700">Digital Paper Mockup</h3>
                <span className="text-[10px] text-slate-400 font-sans font-semibold">Fits standard Letter/A4 pages • Solid Grid layout</span>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              Close Print Preview
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Interactive printable viewport */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center custom-scrollbar bg-slate-300">
            
            {/* The actual component printed by native browser printer */}
            <div 
              id="printable-kitchen-manifest"
              className="w-full max-w-[21cm] bg-white text-black p-8 md:p-12 shadow-sm rounded-lg relative font-mono leading-relaxed text-slate-800"
              style={{ minHeight: "29.7cm" }}
            >
              
              {/* Printable Header Details Banner - Exactly like the layout photo */}
              <div className="border-t-4 border-b-2 border-black py-4 text-center select-none relative">
                <h1 className="text-xl md:text-2xl font-black tracking-widest text-black uppercase font-display leading-none">
                  CONSUMPTION VOUCHER
                </h1>
                <div className="text-sm font-extrabold text-black uppercase mt-1 leading-none tracking-widest relative inline-block">
                  COST OF SALE
                  <span className="absolute left-0 right-0 -bottom-1 border-b border-black h-[1px]"></span>
                </div>
              </div>

              {/* Branch, Remarks, Doc. No., Date */}
              <div className="grid grid-cols-12 gap-x-6 text-[11px] font-mono mt-5 pb-4">
                <div className="col-span-7 space-y-2">
                  <div className="flex items-baseline">
                    <span className="font-black text-black w-20 shrink-0 select-none">Branch :</span>
                    <span className="font-bold text-slate-900 border-b border-dashed border-slate-300 pb-0.5 flex-1 uppercase">
                      {branchName}
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-black text-black w-20 shrink-0 select-none">Remarks:</span>
                    <span className="font-medium text-slate-800 border-b border-dashed border-slate-300 pb-0.5 flex-1">
                      {remarksText || "-"}
                    </span>
                  </div>
                </div>
                <div className="col-span-5 space-y-2">
                  <div className="flex items-baseline">
                    <span className="font-black text-black w-24 shrink-0 select-none text-right pr-2">Doc. No. :</span>
                    <span className="font-bold text-slate-900 border-b border-dashed border-slate-300 pb-0.5 flex-1 select-text">
                      {docNumber}
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-black text-black w-24 shrink-0 select-none text-right pr-2">Date :</span>
                    <span className="font-bold text-slate-900 border-b border-dashed border-slate-300 pb-0.5 flex-1">
                      {formattedReportDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kitchen notes details (smaller panel) */}
              {customKitchenNotes.trim() && (
                <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-mono mb-4 text-slate-700 italic">
                  <span className="font-black block uppercase select-none mb-0.5">Special dispatcher notes / details:</span>
                  "{customKitchenNotes}"
                </div>
              )}

              {/* Complete Table Grid Layout - replicates the hardcopy receipt */}
              <div className="mt-2">
                <table className="w-full text-left border-collapse border border-slate-700 text-[10px] font-mono">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-700 font-black text-black text-[10px] h-8 select-none">
                      <th className="border border-slate-700 p-1.5 text-center w-12">Sr. No.</th>
                      <th className="border border-slate-700 p-1.5 w-20">Code</th>
                      <th className="border border-slate-700 p-1.5">Particulars</th>
                      <th className="border border-slate-700 p-1.5 text-right w-20">Qty</th>
                      <th className="border border-slate-700 p-1.5 w-16 text-center">Units</th>
                      {!isSubAccount && (
                        <>
                          <th className="border border-slate-700 p-1.5 text-right w-24">Rate</th>
                          <th className="border border-slate-700 p-1.5 text-right w-28">Gross</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {totalTypes === 0 ? (
                      <tr>
                        <td 
                          colSpan={isSubAccount ? 5 : 7} 
                          className="border border-slate-700 py-10 text-center text-slate-400 italic"
                        >
                          No active items drafted in the cart. Add list items to render.
                        </td>
                      </tr>
                    ) : (
                      draftedItems.map((item, index) => {
                        return (
                          <tr 
                            key={item.Item_ID} 
                            className={`hover:bg-slate-50/50 transition-colors ${largeFont ? "text-xs py-3.5" : "py-1"}`}
                          >
                            {/* Sr. No */}
                            <td className="border border-slate-700 p-1.5 text-center select-none text-slate-500 font-bold">
                              {index + 1}
                            </td>
                            {/* Code */}
                            <td className="border border-slate-700 p-1.5 select-text text-slate-700 font-bold">
                              {item.Item_ID}
                            </td>
                            {/* Combined Particulars String */}
                            <td className="border border-slate-700 p-1.5 select-text text-black font-semibold">
                              {item.Item_Name}
                            </td>
                            {/* Qty (2 Decimals as in photo) */}
                            <td className="border border-slate-700 p-1.5 text-right font-bold text-black select-text">
                              {item.Quantity.toFixed(2)}
                            </td>
                            {/* Unit Type */}
                            <td className="border border-slate-700 p-1.5 text-center text-slate-600 font-bold select-text">
                              {item.Unit_Type}
                            </td>
                            {/* Rate Price */}
                            {!isSubAccount && (
                              <td className="border border-slate-700 p-1.5 text-right text-slate-600 select-text">
                                {includeValuation ? item.Rate.toFixed(decimalPlaces) : "-"}
                              </td>
                            )}
                            {/* Calculated Gross */}
                            {!isSubAccount && (
                              <td className="border border-slate-700 p-1.5 text-right font-bold text-black select-text">
                                {includeValuation ? item.Gross.toFixed(decimalPlaces) : "-"}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                    
                    {/* Summation Row - exactly like photo bottom totals */}
                    <tr className="border-t border-slate-700 bg-slate-50 font-black text-black select-none h-8">
                      <td className="border border-slate-700 text-center" colSpan={3}></td>
                      <td className="border border-slate-755 px-2.5 py-1 text-right font-bold text-slate-900 bg-slate-100/50">
                        {totalQty.toFixed(2)}
                      </td>
                      <td className="border border-slate-700 text-center"></td>
                      {!isSubAccount && (
                        <>
                          <td className="border border-slate-700 text-right"></td>
                          <td className="border border-slate-755 px-2.5 py-1 text-right font-black text-slate-900 bg-slate-100/50">
                            {includeValuation ? totalValue.toFixed(decimalPlaces) : "-"}
                          </td>
                        </>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Amount in words and valuation breakdown */}
              {!isSubAccount && includeValuation && (
                <div className="mt-5 grid grid-cols-12 gap-2 text-[11px] font-bold text-black border-t-2 border-dashed border-slate-300 pt-4 select-none">
                  <div className="col-span-3 text-slate-500 uppercase tracking-widest font-black">Amount in words :</div>
                  <div className="col-span-9 uppercase text-black font-black tracking-wide leading-relaxed">
                    {amountInWords}
                  </div>
                </div>
              )}

              {/* Hand Sign-off Area (Replicates the footer) */}
              {includeSignatures ? (
                <div className="mt-20 pt-8 border-t border-slate-200 select-none">
                  <div className="grid grid-cols-2 gap-12 text-xs">
                    <div className="flex flex-col items-start space-y-2">
                      <span className="font-black text-black uppercase">Prepared by:</span>
                      <div className="relative w-48 h-12 border-b border-black flex items-center justify-start">
                        {/* Beautiful aesthetic cursive sign squiggle from the photo */}
                        <svg className="absolute w-40 h-10 text-emerald-800/85 left-2 -top-1 -rotate-3" viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg">
                          <path 
                            d="M 5,20 C 12,22 25,8 35,10 C 45,12 30,28 42,25 C 52,22 60,12 70,16 C 80,20 65,28 78,24 C 88,20 90,12 95,15 M 20,15 L 85,15" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1.8" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className="w-52 flex flex-col items-start space-y-2">
                        <span className="font-black text-black uppercase">Verified By :</span>
                        <div className="w-48 h-12 border-b border-black"></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 bg-slate-50 p-3 border border-slate-200 border-dashed rounded-xl text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">
                      Consumption Voucher Generated via Kitchen Order Dispatch ledger system
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-12 border-t border-slate-100 pt-4 text-center select-none text-[10px] text-slate-400 uppercase font-bold tracking-widest font-mono">
                  Official Shift Database Verified Copy
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
