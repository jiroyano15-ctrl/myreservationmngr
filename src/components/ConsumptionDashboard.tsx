import React, { useMemo, useState } from "react";
import { OrderRecord, KitchenItem } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  Package, 
  Coins, 
  ShoppingBag, 
  AlertTriangle,
  Flame,
  CalendarDays,
  Layers,
  Sparkles,
  Tag,
  ArrowUpRight,
  Info
} from "lucide-react";

interface ConsumptionDashboardProps {
  history: OrderRecord[];
  inventory: KitchenItem[];
  currency?: { symbol: string; code: string };
  userSections?: string[];
  itemSectionTags?: Record<string, string>;
  isSubAccount?: boolean;
}

export default function ConsumptionDashboard({
  history,
  inventory,
  currency = { symbol: "£", code: "GBP" },
  userSections = ["Main Kitchen", "Prep Station", "Dry Storage", "Walk-In Cooler"],
  itemSectionTags = {},
  isSubAccount = false,
}: ConsumptionDashboardProps) {
  
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<"1day" | "1week" | "1month">("1month");

  // Determine date ranges for the last selected filter
  const { 
    filteredRecords,
    metricStats,
    topIngredients,
    categorySplits,
    shortages,
    dailyTrendData
  } = useMemo(() => {
    const now = new Date();
    const daysLimit = timeFilter === "1day" ? 1 : timeFilter === "1week" ? 7 : 30;
    const filterStartDate = new Date(now.getTime() - daysLimit * 24 * 60 * 60 * 1000);

    // 1. Robust chronological parsing of all historical order logs
    const parsedRecords = (history || []).map(record => {
      let dateObj = new Date(record.timestamp);
      if (isNaN(dateObj.getTime())) {
        try {
          const parts = record.timestamp.split(',')[0].trim().split('/');
          if (parts.length === 3) {
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const y = parseInt(parts[2], 10);
            const parsed = new Date(y, m, d);
            if (!isNaN(parsed.getTime())) {
              dateObj = parsed;
            }
          }
        } catch {
          // ignore fallback
        }
      }
      
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date();
      }

      return {
        record,
        date: dateObj,
      };
    });

    // 2. Filter records within past selected active interval days
    const pastFilteredIntervalRecords = parsedRecords.filter(({ date }) => {
      return date >= filterStartDate && date <= now;
    });

    // 3. Filter order items by active customized kitchen section tags
    let totalOrdersCount = 0;
    let totalPacksConsumed = 0;
    let totalEstimatedSpend = 0;
    const ingredientConsumptionMap: Record<string, { qty: number; cost: number; name: string; category: string }> = {};
    const categoryStatsMap: Record<string, { qty: number; cost: number }> = {};

    pastFilteredIntervalRecords.forEach(({ record, date }) => {
      let containsMatchedItems = false;
      
      record.items.forEach(item => {
        const targetSection = itemSectionTags[item.Item_ID] || "General";
        // Check section filter
        if (selectedSection !== "All" && targetSection !== selectedSection) {
          return; // skip if doesn't match selected section filter
        }

        containsMatchedItems = true;

        // Sum quantities and prices
        totalPacksConsumed += item.Quantity;
        const lineGross = item.Gross || (item.Quantity * (item.Rate || 0));
        totalEstimatedSpend += lineGross;

        // Ingredient breakdown
        if (!ingredientConsumptionMap[item.Item_ID]) {
          ingredientConsumptionMap[item.Item_ID] = {
            qty: 0,
            cost: 0,
            name: item.Item_Name,
            category: item.Category
          };
        }
        ingredientConsumptionMap[item.Item_ID].qty += item.Quantity;
        ingredientConsumptionMap[item.Item_ID].cost += lineGross;

        // Category breakdown
        if (!categoryStatsMap[item.Category]) {
          categoryStatsMap[item.Category] = { qty: 0, cost: 0 };
        }
        categoryStatsMap[item.Category].qty += item.Quantity;
        categoryStatsMap[item.Category].cost += lineGross;
      });

      if (containsMatchedItems) {
        totalOrdersCount++;
      }
    });

    // 4. Create Top 5 Most Consumed Items list
    const topIngredientsList = Object.entries(ingredientConsumptionMap)
      .map(([id, stats]) => ({
        id,
        ...stats
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const maxQtyConsumed = topIngredientsList.length > 0 ? topIngredientsList[0].qty : 1;

    // 5. Create category percentage splits
    const categorySplitsList = Object.entries(categoryStatsMap)
      .map(([name, stats]) => ({
        name,
        qty: stats.qty,
        cost: stats.cost
      }))
      .sort((a, b) => b.cost - a.cost);

    const totalCostSum = totalEstimatedSpend || 1;

    // 6. Alert list of highly consumed items below Par stock level
    const shortageAlerts = [];
    for (const [itemId, stats] of Object.entries(ingredientConsumptionMap)) {
      const match = inventory.find(i => i.Item_ID === itemId);
      if (match) {
        const par = match.Par_Level || 0;
        const onHand = match.On_Hand || 0;
        if (par > 0 && onHand < par) {
          shortageAlerts.push({
            id: itemId,
            name: match.Item_Name,
            category: match.Category,
            onHand,
            par,
            totalConsumed30d: stats.qty,
            unit: match.Unit_Type || "Packs"
          });
        }
      }
    }
    // Sort shortages by most heavily consumed in the last period to prioritize attention
    shortageAlerts.sort((a, b) => b.totalConsumed30d - a.totalConsumed30d);

    // 7. Aggregate timeline charts grouped by dynamic intervals
    const dailyTicks: Record<string, { qty: number; cost: number; orders: number }> = {};
    const isOneDay = daysLimit === 1;

    if (isOneDay) {
      // 12 ticks of 2-hour slots for detail
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 2 * 60 * 60 * 1000);
        const hour = String(d.getHours()).padStart(2, "0");
        const dateKey = `${hour}:00`;
        dailyTicks[dateKey] = { qty: 0, cost: 0, orders: 0 };
      }
    } else {
      for (let i = daysLimit - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const dateKey = `${mm}/${dd}`;
        dailyTicks[dateKey] = { qty: 0, cost: 0, orders: 0 };
      }
    }

    pastFilteredIntervalRecords.forEach(({ record, date }) => {
      let dateKey = "";
      if (isOneDay) {
        const hour = Math.floor(date.getHours() / 2) * 2;
        dateKey = `${String(hour).padStart(2, "0")}:00`;
      } else {
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        dateKey = `${mm}/${dd}`;
      }

      if (dailyTicks[dateKey] !== undefined) {
        record.items.forEach(item => {
          const targetSection = itemSectionTags[item.Item_ID] || "General";
          if (selectedSection !== "All" && targetSection !== selectedSection) return;

          dailyTicks[dateKey].qty += item.Quantity;
          dailyTicks[dateKey].cost += item.Gross || (item.Quantity * (item.Rate || 0));
        });
        dailyTicks[dateKey].orders += 1;
      }
    });

    const dailyTrendData = Object.entries(dailyTicks).map(([date, stats]) => ({
      date,
      Quantity: stats.qty,
      Cost: parseFloat(stats.cost.toFixed(2)),
      Orders: stats.orders
    }));

    return {
      filteredRecords: pastFilteredIntervalRecords,
      metricStats: {
        totalOrders: totalOrdersCount,
        totalUnits: totalPacksConsumed,
        totalCost: parseFloat(totalEstimatedSpend.toFixed(2)),
        uniqueIngredients: Object.keys(ingredientConsumptionMap).length
      },
      topIngredients: topIngredientsList.map(item => ({
        ...item,
        percentageOfMax: Math.round((item.qty / maxQtyConsumed) * 100)
      })),
      categorySplits: categorySplitsList.map(item => ({
        ...item,
        percentageOfTotal: Math.round((item.cost / totalCostSum) * 100)
      })),
      shortages: shortageAlerts.slice(0, 8),
      dailyTrendData
    };
  }, [history, inventory, selectedSection, itemSectionTags, timeFilter]);

  const decimalPlaces = currency.code === "KWD" ? 3 : 2;

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* Upper Information Banner */}
      <div className="bg-gradient-to-r from-emerald-555 to-emerald-600/10 border border-emerald-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-start gap-3.5">
          <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-md shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/50">
                Live Analytics
              </span>
              <span className="text-slate-450 text-[10px]">
                • {timeFilter === "1day" ? "1-Day Outlook" : timeFilter === "1week" ? "1-Week Outlook" : "1-Month Outlook"}
              </span>
            </div>
            <h2 className="font-display text-xl font-black text-slate-800">
              Kitchen Consumption Intelligence
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xl">
              Dynamic auditing of stock consumption, spending cost maps, and supply requisitions over the rolling {timeFilter === "1day" ? "24-hour" : timeFilter === "1week" ? "7-day" : "30-day"} operation interval.
            </p>
          </div>
        </div>

        {/* Rolling Status Indicator / Interactive Time Interval Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200/70 shadow-3xs shrink-0 select-none">
          <div className="flex items-center gap-2.5 px-2.5 py-1">
            <CalendarDays className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <div className="text-left font-sans hidden sm:block">
              <span className="text-[9px] uppercase font-bold text-slate-405 block tracking-widest leading-none">Time Filter</span>
              <span className="text-[11px] font-bold text-slate-600 block mt-1 tracking-tight">Select Scope</span>
            </div>
          </div>
          
          <div className="flex bg-slate-50 border border-slate-200/50 p-1 rounded-xl gap-1">
            <button
              onClick={() => setTimeFilter("1day")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider transition-all duration-150 cursor-pointer ${
                timeFilter === "1day"
                  ? "bg-slate-900 border-slate-900 text-white shadow-[0_2px_4px_rgba(0,0,0,0.06)]"
                  : "bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/40"
              }`}
            >
              1 DAY
            </button>
            <button
              onClick={() => setTimeFilter("1week")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider transition-all duration-150 cursor-pointer ${
                timeFilter === "1week"
                  ? "bg-slate-900 border-slate-900 text-white shadow-[0_2px_4px_rgba(0,0,0,0.06)]"
                  : "bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/40"
              }`}
            >
              1 WEEK
            </button>
            <button
              onClick={() => setTimeFilter("1month")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider transition-all duration-150 cursor-pointer ${
                timeFilter === "1month"
                  ? "bg-slate-900 border-slate-900 text-white shadow-[0_2px_4px_rgba(0,0,0,0.06)]"
                  : "bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/40"
              }`}
            >
              1 MONTH
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Kitchen Section Filter Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between items-start gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold font-sans text-slate-600">Filter consumption by Assigned Station:</span>
        </div>
        
        {/* Scrollable button pills */}
        <div className="flex flex-wrap gap-1.5 max-w-full overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedSection("All")}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              selectedSection === "All"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            }`}
          >
            All Stations
          </button>
          {userSections.map(section => (
            <button
              key={section}
              onClick={() => setSelectedSection(section)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                selectedSection === section
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600"
              }`}
            >
              {section}
            </button>
          ))}
        </div>
      </div>

      {/* KPI stats dashboard grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Packs Consumed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs hover:border-slate-300 transition flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold leading-none block">Total Units Dispatched</span>
            <span className="font-sans font-black text-slate-800 text-xl block mt-1 tracking-tight">
              {metricStats.totalUnits.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Ingredient items staged</span>
          </div>
        </div>

        {/* Total Spending */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs hover:border-slate-300 transition flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold leading-none block">Estimated Spend</span>
            <span className="font-sans font-black text-slate-800 text-xl block mt-1 tracking-tight">
              {isSubAccount ? (
                <span className="text-xs text-slate-400 font-bold block mt-1">Restricted for Staff</span>
              ) : (
                `${currency.symbol}${metricStats.totalCost.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}`
              )}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">{isSubAccount ? "Authorization Required" : "Accumulated material cost"}</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs hover:border-slate-300 transition flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold leading-none block">Manifest Dispatches</span>
            <span className="font-sans font-black text-slate-800 text-xl block mt-1 tracking-tight">
              {metricStats.totalOrders}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Procured shift orders</span>
          </div>
        </div>

        {/* Variety Spanned */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs hover:border-slate-300 transition flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold leading-none block">Unique Ingredients</span>
            <span className="font-sans font-black text-slate-800 text-xl block mt-1 tracking-tight">
              {metricStats.uniqueIngredients}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Active catalog line items</span>
          </div>
        </div>

      </div>

      {/* Main Graph Analysis & Shortage list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: 30-Day Scrollable Timeline Graph */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-sans font-bold text-slate-800 text-[13px] sm:text-sm">
                Ingredient Consumption Timeline Trend (30 Days)
              </h3>
              <p className="text-[10.5px] text-slate-400 font-medium">
                Day-by-day staging and dispatch levels of stock volume.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
              <span className="h-2 w-2 rounded-full bg-emerald-555 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-800 font-mono">STABILITY TREND</span>
            </div>
          </div>

          <div className="h-72 w-full mt-2">
            {metricStats.totalOrders === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Info className="h-6 w-6 text-slate-300 animate-pulse" />
                <span className="text-xs font-medium">No order history recorded for this filtered station in the last 30 days.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dailyTrendData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    dy={8}
                    className="font-sans font-medium"
                  />
                  
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false} 
                    dx={-4}
                    className="font-sans font-medium"
                  />

                  <Tooltip 
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl shadow-lg font-sans text-xs flex flex-col gap-1.5">
                            <p className="font-bold border-b border-slate-800 pb-1 text-slate-300">Date: {data.date}</p>
                            <p>Staged Quantity: <span className="font-extrabold text-emerald-400 font-mono text-sm pl-1">{data.Quantity} packs</span></p>
                            {!isSubAccount && (
                              <p>Cost Transmitted: <span className="font-extrabold text-amber-400 font-mono text-sm pl-1">{currency.symbol}{data.Cost.toFixed(2)}</span></p>
                            )}
                            <p>Orders: <span className="font-extrabold text-blue-400 font-mono pl-1">{data.Orders}</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="Quantity"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#consumptionGradient)"
                    name="Consumed Packs"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Outstanding Category Split */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div>
            <h3 className="font-sans font-bold text-slate-800 text-[13px] sm:text-sm">
              Category Cost Share
            </h3>
            <p className="text-[10.5px] text-slate-400 font-medium">
              Transmitted spending distribution or volume split.
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-3 justify-center">
            {categorySplits.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No category consumption logged.</p>
            ) : (
              categorySplits.map((cat, i) => {
                const colorMap: Record<string, string> = {
                  "Produce": "bg-emerald-500",
                  "Pantry": "bg-amber-400",
                  "Meat": "bg-rose-500",
                  "Bakery": "bg-yellow-600",
                  "Dairy": "bg-blue-400",
                  "Seafood": "bg-cyan-500",
                  "Beverages": "bg-indigo-500",
                };
                
                const bgClass = colorMap[cat.name] || "bg-slate-450";
                
                return (
                  <div key={cat.name} className="flex flex-col gap-1.5 font-sans">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700 font-bold flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${bgClass}`} />
                        {cat.name}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px] font-bold">
                        {isSubAccount ? (
                          `${cat.qty} Units`
                        ) : (
                          `${currency.symbol}${cat.cost.toFixed(1)} (${cat.percentageOfTotal}%)`
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-50">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${bgClass}`}
                        style={{ width: `${isSubAccount ? Math.min(100, Math.round((cat.qty / (metricStats.totalUnits || 1)) * 100)) : cat.percentageOfTotal}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Advanced insights block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 heavy consumers list */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-105 pb-3">
            <Flame className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
            <div>
              <h3 className="font-sans font-bold text-slate-800 text-[13px] sm:text-sm">
                Top Consumed Ingredients
              </h3>
              <p className="text-[10.5px] text-slate-400 font-medium">
                The 5 ingredients requested in the highest volumes during this period.
              </p>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-slate-100">
            {topIngredients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No individual ingredient consumption records found. Ensure items are added to drafts and transmitted dynamically!
              </div>
            ) : (
              topIngredients.map((item, idx) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4 font-sans group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px] font-mono shadow-inner">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs truncate max-w-xs">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400">{item.category}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[8px] bg-slate-50 border border-slate-200/50 px-1 font-mono rounded text-slate-500">ID: {item.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity bar and total indicator */}
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-slate-900 text-xs font-mono">{item.qty} units</span>
                    <div className="w-24 bg-slate-50 border border-slate-200/40 h-1.5 rounded-full overflow-hidden mt-1">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${item.percentageOfMax}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Shortage Watch / Highly Consumed below Par alerts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-105 pb-3">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
            <div>
              <h3 className="font-sans font-bold text-slate-800 text-[13px] sm:text-sm">
                Urgent Stock Deficit Alert (Consumption vs. Par)
              </h3>
              <p className="text-[10.5px] text-slate-400 font-medium">
                Consumed lines active in selected interval but currently below defined target Par level.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[295px] pr-1 scrollbar-thin">
            {shortages.length === 0 ? (
              <div className="py-12 px-4 text-center text-emerald-600 bg-emerald-50/50 border border-dashed border-emerald-100 rounded-2xl flex flex-col items-center gap-2">
                <span className="text-lg">✓</span>
                <span className="text-xs font-sans font-bold">Excellent: All highly consumed items are fully stocked to target Par levels!</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {shortages.map((item) => {
                  const currentPercent = Math.round((item.onHand / item.par) * 100);
                  return (
                    <div 
                      key={item.id} 
                      className="p-3 bg-rose-50/45 border border-rose-100/70 rounded-xl flex items-center justify-between gap-4 font-sans"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded border border-rose-200/50">
                            {item.id}
                          </span>
                          <p className="font-bold text-slate-800 text-xs truncate max-w-xs">{item.name}</p>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">
                          Active Period Demands: <strong className="text-slate-700">{item.totalConsumed30d} packs</strong>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-sans font-medium text-slate-500">
                          Stock: <span className="font-bold text-rose-600">{item.onHand}</span> / {item.par} {item.unit}
                        </div>
                        <span className="inline-flex mt-1 bg-rose-100 text-rose-700 text-[9px] font-black font-mono px-1.5 py-0.5 rounded">
                          Deficit: -{item.par - item.onHand} ({currentPercent}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
