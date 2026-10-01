import React, { useState } from "react";
import { Calendar, Flame, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { usePeriodStore } from "@/store/usePeriodStore";
import { formatKToman, getJalaliPeriodLabel } from "@/utils/jalali";
import { HeatmapDayItem, HeatmapResponse } from "@/types";

export const SpendingHeatmap: React.FC = () => {
  const selectedPeriod = usePeriodStore((s) => s.selectedPeriod);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDayItem | null>(null);

  const { data, isLoading } = useQuery<HeatmapResponse>({
    queryKey: ["analytics", "heatmap", selectedPeriod],
    queryFn: async () => {
      const res = await apiClient.get<HeatmapResponse>(`/analytics/heatmap?period=${selectedPeriod}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-dark-surface border border-dark-border min-h-[260px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading daily spend activity...</p>
      </div>
    );
  }

  const days = data?.days || [];
  const maxSpend = parseFloat(data?.max_daily_spend || "0");
  const daysWithSpend = days.filter((d) => parseFloat(d.amount) > 0).length;

  // Determine intensity color based on ratio of day spend to peak spend
  const getCellColor = (amountStr: string) => {
    const val = parseFloat(amountStr);
    if (!val || val === 0 || maxSpend === 0) {
      return "bg-[#162032] border-[#1E293B] text-slate-500";
    }
    const ratio = val / maxSpend;
    if (ratio < 0.25) {
      return "bg-emerald-950/70 border-emerald-800/60 text-emerald-400";
    } else if (ratio < 0.55) {
      return "bg-emerald-700/80 border-emerald-600/80 text-white";
    } else if (ratio < 0.8) {
      return "bg-amber-600/80 border-amber-500/80 text-white shadow-sm shadow-amber-500/20";
    } else {
      return "bg-outflow border-red-500 text-white shadow-md shadow-outflow/30";
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-dark-surface border border-dark-border relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Daily Spending Heatmap</h3>
            <p className="text-[11px] text-slate-400">
              Calendar intensity for {getJalaliPeriodLabel(selectedPeriod)} ({data?.total_days || 30} days)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>0 spend</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#162032] border border-[#1E293B]" />
            <div className="w-3 h-3 rounded bg-emerald-950/70 border border-emerald-800/60" />
            <div className="w-3 h-3 rounded bg-emerald-700/80 border border-emerald-600/80" />
            <div className="w-3 h-3 rounded bg-amber-600/80 border border-amber-500/80" />
            <div className="w-3 h-3 rounded bg-outflow border border-red-500" />
          </div>
          <span>Peak spend</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-11 lg:grid-cols-16 gap-2 my-2">
        {days.map((d) => (
          <div
            key={d.day}
            onMouseEnter={() => setHoveredDay(d)}
            onMouseLeave={() => setHoveredDay(null)}
            className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${getCellColor(
              d.amount
            )}`}
          >
            <span className="text-[10px] font-mono font-bold leading-none">{d.day}</span>
            {parseFloat(d.amount) > 0 && (
              <span className="text-[8px] font-mono opacity-80 mt-0.5 truncate max-w-full">
                {parseFloat(d.amount).toFixed(0)}k
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer Info / Hovered Tooltip */}
      <div className="mt-4 pt-3 border-t border-dark-border/60 flex items-center justify-between text-xs min-h-[32px]">
        {hoveredDay ? (
          <div className="flex items-center gap-2 text-white animate-fade-in">
            <span className="font-semibold text-cyan-400">{hoveredDay.date_label}:</span>
            <span className="font-mono font-bold text-white">
              {formatKToman(hoveredDay.amount)}
            </span>
            <span className="text-slate-400 text-[11px]">
              ({hoveredDay.transaction_count} {hoveredDay.transaction_count === 1 ? "entry" : "entries"})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-brand" />
              <span>
                Active spending days: <strong className="text-white">{daysWithSpend}</strong> / {days.length}
              </span>
            </span>
            {maxSpend > 0 && (
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-outflow" />
                <span>
                  Peak day burn: <strong className="text-white font-mono">{formatKToman(maxSpend)}</strong>
                </span>
              </span>
            )}
          </div>
        )}
        <span className="text-[10px] text-slate-500 hidden sm:inline">Hover square to inspect</span>
      </div>
    </div>
  );
};
