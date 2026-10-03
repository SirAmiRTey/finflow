import React from "react";
import { AlertCircle, Wallet, Calendar, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { usePeriodStore } from "@/store/usePeriodStore";
import { formatKToman, formatJalaliDate, getJalaliPeriodLabel } from "@/utils/jalali";
import { TopExpensesResponse } from "@/types";

export const TopExpensesCard: React.FC = () => {
  const { selectedPeriod, selectedRange } = usePeriodStore();

  const { data, isLoading } = useQuery<TopExpensesResponse>({
    queryKey: ["analytics", "top-expenses", selectedPeriod, selectedRange],
    queryFn: async () => {
      const queryParam = selectedRange
        ? `period=${selectedPeriod}&range=${selectedRange}&limit=5`
        : `period=${selectedPeriod}&limit=5`;
      const res = await apiClient.get<TopExpensesResponse>(
        `/analytics/top-expenses?${queryParam}`
      );
      return res.data;
    },
  });

  const periodLabel = selectedRange
    ? selectedRange === "all"
      ? "All Time"
      : `Last ${selectedRange.toUpperCase()}`
    : getJalaliPeriodLabel(selectedPeriod);

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-dark-surface border border-dark-border min-h-[300px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Scanning for outlier expenditures...</p>
      </div>
    );
  }

  const expenses = data?.expenses || [];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-dark-surface border border-dark-border relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Largest Single Outflows</h3>
            <p className="text-[11px] text-slate-400">
              Top 5 high-impact expenses for {periodLabel}
            </p>
          </div>
        </div>

        {expenses.length > 0 && (
          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono tabular-nums">
            Outlier Watch
          </span>
        )}
      </div>

      {/* Outlier Cards List */}
      {expenses.length > 0 ? (
        <div className="space-y-2.5">
          {expenses.map((item, idx) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-dark-bg/80 border border-dark-border flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              {/* Left Details */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono tabular-nums font-bold text-slate-500 w-4 text-center">
                  #{idx + 1}
                </span>

                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${item.color_hex}18`,
                    color: item.color_hex,
                  }}
                >
                  <CategoryIcon name={item.category_icon} className="w-4 h-4" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {item.category_name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-dark-surface px-1.5 py-0.5 rounded border border-dark-border">
                      <Wallet className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[90px]">{item.account_name}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.description || "Unannotated expenditure"}
                  </p>
                </div>
              </div>

              {/* Right: Date & Amount */}
              <div className="text-right flex-shrink-0 font-mono tabular-nums">
                <span className="text-xs sm:text-sm font-mono tabular-nums font-bold text-outflow block">
                  -{formatKToman(item.amount)} <span className="text-[10px] text-slate-400 font-sans font-normal">k-T</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono tabular-nums flex items-center justify-end gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{formatJalaliDate(item.transaction_date)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mb-2">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-300">No major outflows detected</p>
          <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
            No expenses recorded in {periodLabel} yet.
          </p>
        </div>
      )}
    </div>
  );
};
