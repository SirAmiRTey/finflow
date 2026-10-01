import React from "react";
import ReactECharts from "echarts-for-react";
import { PieChart, PieChart as PieIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { usePeriodStore } from "@/store/usePeriodStore";
import { formatKToman, getJalaliPeriodLabel } from "@/utils/jalali";
import { CategoryBreakdownResponse } from "@/types";

export const CategoryWaterfallDonut: React.FC = () => {
  const selectedPeriod = usePeriodStore((s) => s.selectedPeriod);

  const { data, isLoading } = useQuery<CategoryBreakdownResponse>({
    queryKey: ["analytics", "category-breakdown", selectedPeriod],
    queryFn: async () => {
      const res = await apiClient.get<CategoryBreakdownResponse>(
        `/analytics/category-breakdown?period=${selectedPeriod}`
      );
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-dark-surface border border-dark-border min-h-[320px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Classifying spending categories...</p>
      </div>
    );
  }

  const breakdown = data?.breakdown || [];
  const totalSpend = parseFloat(data?.total_spend || "0");
  const hasData = breakdown.length > 0 && totalSpend > 0;

  const donutOption = hasData
    ? {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "item",
          backgroundColor: "#131B2E",
          borderColor: "#1E293B",
          borderWidth: 1,
          padding: [8, 12],
          textStyle: {
            color: "#F8FAFC",
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
          },
          formatter: (params: any) => `
            <div class="space-y-1">
              <div class="text-[11px] text-slate-400 font-medium">${params.name}</div>
              <div class="text-sm font-mono font-bold text-white">${formatKToman(params.value)}</div>
              <div class="text-[11px] text-brand font-semibold">${params.percent}% of monthly spend</div>
            </div>
          `,
        },
        series: [
          {
            name: "Category Spending",
            type: "pie",
            radius: ["58%", "82%"],
            center: ["50%", "50%"],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 6,
              borderColor: "#131B2E",
              borderWidth: 3,
            },
            label: {
              show: false,
            },
            emphasis: {
              scale: true,
              scaleSize: 6,
            },
            data: breakdown.map((item) => ({
              value: parseFloat(item.total_amount),
              name: item.category_name,
              itemStyle: { color: item.color_hex || "#3B82F6" },
            })),
          },
        ],
      }
    : null;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-dark-surface border border-dark-border relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Category Spend Allocation</h3>
            <p className="text-[11px] text-slate-400">
              Proportional distribution for {getJalaliPeriodLabel(selectedPeriod)}
            </p>
          </div>
        </div>

        {hasData && (
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block leading-none">Total Outflow</span>
            <span className="text-xs font-mono font-bold text-outflow">
              {formatKToman(totalSpend)}
            </span>
          </div>
        )}
      </div>

      {hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Donut Chart with Center Total */}
          <div className="md:col-span-5 relative flex items-center justify-center h-[230px]">
            <ReactECharts
              option={donutOption}
              style={{ width: "100%", height: "100%" }}
              opts={{ renderer: "svg" }}
            />
            {/* Center Text inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Total
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-white leading-tight">
                {formatKToman(totalSpend, false)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">k-Toman</span>
            </div>
          </div>

          {/* Ranked Breakdown List */}
          <div className="md:col-span-7 space-y-3 max-h-[250px] overflow-y-auto pr-1">
            {breakdown.map((item) => (
              <div key={item.category_id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${item.color_hex}18`,
                        color: item.color_hex,
                      }}
                    >
                      <CategoryIcon name={item.category_icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium text-slate-200 truncate">
                      {item.category_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400 text-[11px]">{item.percentage}%</span>
                    <span className="font-bold text-white">{formatKToman(item.total_amount)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-dark-bg overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color_hex || "#3B82F6",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mb-2">
            <PieIcon className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-300">No categorised expenditures</p>
          <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
            Log expense transactions in {getJalaliPeriodLabel(selectedPeriod)} to view category allocation.
          </p>
        </div>
      )}
    </div>
  );
};
