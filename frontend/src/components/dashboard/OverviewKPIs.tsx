import React from "react";
import { ArrowUpRight, ArrowDownRight, PiggyBank, Hourglass } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { usePeriodStore } from "@/store/usePeriodStore";
import { formatKToman, getJalaliPeriodLabel } from "@/utils/jalali";
import { OverviewAnalytics } from "@/types";

export const OverviewKPIs: React.FC = () => {
  const { selectedPeriod, selectedRange } = usePeriodStore();

  const { data: overview, isLoading } = useQuery<OverviewAnalytics>({
    queryKey: ["analytics", "overview", selectedPeriod, selectedRange],
    queryFn: async () => {
      const queryParam = selectedRange
        ? `period=${selectedPeriod}&range=${selectedRange}`
        : `period=${selectedPeriod}`;
      const res = await apiClient.get<OverviewAnalytics>(`/analytics/overview?${queryParam}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-dark-surface/60 border border-dark-border" />
        ))}
      </div>
    );
  }

  if (!overview) return null;

  const isNetPositive = parseFloat(overview.net_savings) >= 0;
  const periodLabel = overview.period_label || getJalaliPeriodLabel(overview.period);

  return (
    <div className="space-y-3">
      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Income Card */}
        <div className="p-4 rounded-2xl bg-dark-surface border border-dark-border relative overflow-hidden group hover:border-inflow/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">
              {selectedRange ? "Total Inflow" : "Monthly Inflow"}
            </span>
            <div className="p-1.5 rounded-lg bg-inflow/10 text-inflow">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-mono font-bold text-white tracking-tight tabular-nums flex items-baseline gap-1.5">
            <span>+{formatKToman(overview.total_income)}</span>
            <span className="text-xs font-sans font-normal text-slate-400">k-Toman</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Recorded in {periodLabel}
          </p>
        </div>

        {/* Expense Card */}
        <div className="p-4 rounded-2xl bg-dark-surface border border-dark-border relative overflow-hidden group hover:border-outflow/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">
              {selectedRange ? "Total Outflow" : "Monthly Outflow"}
            </span>
            <div className="p-1.5 rounded-lg bg-outflow/10 text-outflow">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-mono font-bold text-white tracking-tight tabular-nums flex items-baseline gap-1.5">
            <span>-{formatKToman(overview.total_expense)}</span>
            <span className="text-xs font-sans font-normal text-slate-400">k-Toman</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Burn rate:</span>
            <span className="font-mono tabular-nums text-slate-300 font-medium">
              {formatKToman(overview.daily_burn_rate)} k-T/day
            </span>
          </div>
        </div>

        {/* Net Savings Card */}
        <div className="p-4 rounded-2xl bg-dark-surface border border-dark-border relative overflow-hidden group hover:border-brand/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Net Savings</span>
            <div className={`p-1.5 rounded-lg ${isNetPositive ? "bg-inflow/10 text-inflow" : "bg-outflow/10 text-outflow"}`}>
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-mono font-bold tracking-tight tabular-nums flex items-baseline gap-1.5 ${isNetPositive ? "text-inflow" : "text-outflow"}`}>
            <span>{isNetPositive ? "+" : ""}{formatKToman(overview.net_savings)}</span>
            <span className="text-xs font-sans font-normal text-slate-400">k-Toman</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-slate-400">Savings Rate:</span>
            <span className={`font-mono tabular-nums font-semibold px-1.5 py-0.2 rounded ${
              overview.savings_rate_percentage > 20
                ? "bg-inflow/15 text-inflow"
                : "bg-slate-800 text-slate-300"
            }`}>
              {overview.savings_rate_percentage}%
            </span>
          </div>
        </div>

        {/* Runway Card */}
        <div className="p-4 rounded-2xl bg-dark-surface border border-dark-border relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Liquidity Runway</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-mono font-bold text-white tracking-tight tabular-nums">
            {overview.runway_days >= 999 ? "∞ Stable" : `${overview.runway_days} Days`}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Cash pool:</span>
            <span className="font-mono tabular-nums text-slate-300 font-medium">
              {formatKToman(overview.total_liquidity)} k-Toman
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
