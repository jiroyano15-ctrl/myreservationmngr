import React, { useMemo, useState } from "react";
import { OrderRecord } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { ShoppingBag, Package, Coins, CalendarDays } from "lucide-react";

interface DailyOrderVolumeChartProps {
  history: OrderRecord[];
  currency?: { symbol: string; code: string };
  isSubAccount?: boolean;
}

type SelectedMetric = "orders" | "units" | "cost";

export default function DailyOrderVolumeChart({
  history,
  currency = { symbol: "£", code: "GBP" },
  isSubAccount = false,
}: DailyOrderVolumeChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<SelectedMetric>("orders");

  // Parse order record times and compute consecutive 7-day stats
  const { chartData, dateStats, totalOrders, totalUnits, totalCost } = useMemo(() => {
    if (!history || history.length === 0) {
      return {
        chartData: [],
        dateStats: { start: "", end: "" },
        totalOrders: 0,
        totalUnits: 0,
        totalCost: 0,
      };
    }

    // Sort history chronologically to ensure natural parsing
    const parsedRecords = history.map(record => {
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
          // ignore parsing fallback errors
        }
      }
      
      // Secondary fallback
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date();
      }

      return {
        record,
        date: dateObj,
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Find the latest order date in the history, or default to current date
    let maxDate = new Date();
    if (parsedRecords.length > 0) {
      const times = parsedRecords.map(r => r.date.getTime());
      maxDate = new Date(Math.max(...times));
    }

    const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());

    // Generate consecutive last 7 days going backward from endDate
    const days: { dateStr: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDate.getTime());
      d.setDate(endDate.getDate() - i);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${d.getDate()} ${months[d.getMonth()]}`;
      
      days.push({ dateStr, label });
    }

    let overallOrders = 0;
    let overallUnits = 0;
    let overallCost = 0;

    // Aggregate values for each date
    const chartData = days.map(day => {
      let dailyOrders = 0;
      let dailyUnits = 0;
      let dailyCost = 0;

      parsedRecords.forEach(({ record, date }) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const recStr = `${yyyy}-${mm}-${dd}`;

        if (recStr === day.dateStr) {
          dailyOrders++;
          const orderPacks = record.items.reduce((sum, item) => sum + item.Quantity, 0);
          const orderGross = record.items.reduce((sum, item) => sum + (item.Gross || (item.Quantity * (item.Rate || 0))), 0);
          dailyUnits += orderPacks;
          dailyCost += orderGross;
        }
      });

      overallOrders += dailyOrders;
      overallUnits += dailyUnits;
      overallCost += dailyCost;

      return {
        date: day.dateStr,
        label: day.label,
        orders: dailyOrders,
        units: dailyUnits,
        cost: parseFloat(dailyCost.toFixed(2)),
      };
    });

    const formatShortDate = (dStr: string) => {
      try {
        const parts = dStr.split("-");
        const monthNum = parseInt(parts[1], 10) - 1;
        const dayNum = parseInt(parts[2], 10);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${dayNum} ${months[monthNum]}`;
      } catch {
        return dStr;
      }
    };

    return {
      chartData,
      dateStats: {
        start: formatShortDate(days[0].dateStr),
        end: formatShortDate(days[6].dateStr),
      },
      totalOrders: overallOrders,
      totalUnits: overallUnits,
      totalCost: parseFloat(overallCost.toFixed(2)),
    };
  }, [history]);

  // Metric-specific config
  const metricConfigs = {
    orders: {
      title: "Orders Count",
      color: "#3b82f6", // Indigo-blue
      accentBg: "bg-blue-50 text-blue-700 border-blue-100",
      icon: ShoppingBag,
      value: totalOrders,
      formatter: (v: number) => `${v} ${v === 1 ? "order" : "orders"}`,
    },
    units: {
      title: "Packs Ordered",
      color: "#10b981", // Emerald-green
      accentBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      icon: Package,
      value: totalUnits,
      formatter: (v: number) => `${v.toLocaleString()} units`,
    },
    cost: {
      title: "Total Cost",
      color: "#14b8a6", // Teal
      accentBg: "bg-teal-50 text-teal-700 border-teal-100",
      icon: Coins,
      value: totalCost,
      formatter: (v: number) => `${currency.symbol}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    }
  };

  const currentConfig = metricConfigs[selectedMetric];

  // Tooltip custom styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const formattedValue = selectedMetric === "cost" 
        ? `${currency.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        : val.toLocaleString();

      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-md font-sans">
          <p className="font-semibold text-slate-800 text-[11px] mb-1">{label}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentConfig.color }} />
            <p className="text-slate-600 text-[11px]">
              <span className="font-bold text-slate-700">{formattedValue}</span>{" "}
              {selectedMetric === "orders" ? "orders" : selectedMetric === "units" ? "units" : ""}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!history || history.length === 0) {
    return null; // Don't show chart if history is completely empty
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col gap-5">
      
      {/* Chart Headline & Period Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-sans font-bold text-slate-800 text-sm">
            Activity Analytics
          </h3>
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Daily order trends from <strong>{dateStats.start}</strong> to <strong>{dateStats.end}</strong> (Last 7 Days)</span>
          </div>
        </div>
      </div>

      {/* Tabs / Metric Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        
        {/* Total Orders Metric Toggle */}
        <button
          onClick={() => setSelectedMetric("orders")}
          type="button"
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
            selectedMetric === "orders"
              ? "bg-blue-50/50 border-blue-200 shadow-xs"
              : "bg-white hover:bg-slate-50 border-slate-200/60"
          }`}
        >
          <div className={`p-2 rounded-lg border transition ${
            selectedMetric === "orders" ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-100"
          }`}>
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-400 font-sans text-[10px] font-medium leading-tight">Total Volume</p>
            <p className="text-slate-800 font-sans font-extrabold text-base leading-snug mt-0.5">
              {totalOrders} <span className="font-normal text-[11px] text-slate-500">Orders</span>
            </p>
          </div>
        </button>

        {/* Total Units Metric Toggle */}
        <button
          onClick={() => setSelectedMetric("units")}
          type="button"
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
            selectedMetric === "units"
              ? "bg-emerald-50/50 border-emerald-200 shadow-xs"
              : "bg-white hover:bg-slate-50 border-slate-200/60"
          }`}
        >
          <div className={`p-2 rounded-lg border transition ${
            selectedMetric === "units" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-100"
          }`}>
            <Package className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-400 font-sans text-[10px] font-medium leading-tight">Total Pack Units</p>
            <p className="text-slate-800 font-sans font-extrabold text-base leading-snug mt-0.5">
              {totalUnits} <span className="font-normal text-[11px] text-slate-500">Units</span>
            </p>
          </div>
        </button>

        {/* Total Cost Metric Toggle (Available for Admins / Non-SubAccounts only) */}
        {!isSubAccount ? (
          <button
            onClick={() => setSelectedMetric("cost")}
            type="button"
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
              selectedMetric === "cost"
                ? "bg-teal-50/50 border-teal-200 shadow-xs"
                : "bg-white hover:bg-slate-50 border-slate-200/60"
            }`}
          >
            <div className={`p-2 rounded-lg border transition ${
              selectedMetric === "cost" ? "bg-teal-100 text-teal-800 border-teal-200" : "bg-slate-50 text-slate-500 border-slate-100"
            }`}>
              <Coins className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 font-sans text-[10px] font-medium leading-tight">Total Gross Cost</p>
              <p className="text-slate-800 font-sans font-extrabold text-base leading-snug mt-0.5">
                {currency.symbol}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-slate-200/40 bg-slate-50/20 text-slate-400 text-left select-none sm:col-span-1">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-400 border border-slate-200">
              <Coins className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 font-sans text-[10px] font-medium leading-tight">Cost Visibility</p>
              <p className="text-slate-400 font-sans text-[11px] leading-tight mt-0.5">
                Restricted for Staff Accounts
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Main Line Chart Stage */}
      <div className="h-64 sm:h-72 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentConfig.color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={currentConfig.color} stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            <XAxis 
              dataKey="label" 
              stroke="#94a3b8" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              dy={10}
              className="font-sans font-medium"
            />
            
            <YAxis 
              stroke="#94a3b8" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              dx={-5}
              allowDecimals={selectedMetric === "cost"}
              className="font-sans font-medium"
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f1f5f9', strokeWidth: 1.5 }} />

            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke={currentConfig.color}
              strokeWidth={3}
              dot={{ stroke: currentConfig.color, strokeWidth: 2, r: 4, fill: "#ffffff" }}
              activeDot={{ r: 6, strokeWidth: 0, fill: currentConfig.color }}
              name={currentConfig.title}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
