import React from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { usePeriodStore } from "@/store/usePeriodStore";
import { formatKToman, getJalaliPeriodLabel } from "@/utils/jalali";
import { CumulativeBurnResponse } from "@/types";

export const CumulativeBurnChart: React.FC = () => {
  const { selectedPeriod, selectedRange } = usePeriodStore();

  const { data, isLoading } = useQuery<CumulativeBurnResponse>({
    queryKey: ["analytics", "cumulative-burn", selectedPeriod, selectedRange],
    queryFn: async () => {
      const queryParam = selectedRange
        ? `period=${selectedPeriod}&range=${selectedRange}`
        : `period=${selectedPeriod}`;
      const res = await apiClient.get<CumulativeBurnResponse>(
        `/analytics/cumulative-burn?${queryParam}`
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
      <div className="p-6 rounded-2xl bg-dark-surface border border-dark-border min-h-[360px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Computing cumulative trajectories...</p>
      </div>
    );
  }

  const days = data?.days || [];
  const xLabels = days.map((d) => d.date_label || `Day ${d.day}`);
  const incomeSeries = days.map((d) => parseFloat(d.cumulative_income));
  const expenseSeries = days.map((d) => parseFloat(d.cumulative_expense));

  const option = {
    backgroundColor: "transparent",
    color: ["#04CE78", "#FF4D6A"],
    tooltip: {
      trigger: "axis",
      backgroundColor: "#131B2E",
      borderColor: "#1E293B",
      borderWidth: 1,
      padding: [10, 14],
      textStyle: {
        color: "#F8FAFC",
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
      },
      formatter: (params: any) => {
        if (!params || params.length === 0) return "";
        const idx = params[0].dataIndex;
        const dayData = days[idx];
        const inc = parseFloat(dayData?.cumulative_income || "0");
        const exp = parseFloat(dayData?.cumulative_expense || "0");
        const net = inc - exp;

        return `
          <div class="space-y-1.5">
            <div class="text-[11px] font-semibold text-slate-300 border-b border-slate-700/60 pb-1">${dayData?.date_label}</div>
            <div class="flex items-center justify-between gap-4 text-xs">
              <span class="text-inflow flex items-center gap-1 font-medium">● Cumulative Inflow:</span>
              <span class="font-mono tabular-nums font-bold text-white">${formatKToman(inc)} <span class="text-[10px] text-slate-400 font-sans font-normal">k-Toman</span></span>
            </div>
            <div class="flex items-center justify-between gap-4 text-xs">
              <span class="text-outflow flex items-center gap-1 font-medium">● Cumulative Outflow:</span>
              <span class="font-mono tabular-nums font-bold text-white">${formatKToman(exp)} <span class="text-[10px] text-slate-400 font-sans font-normal">k-Toman</span></span>
            </div>
            <div class="flex items-center justify-between gap-4 text-xs pt-1 border-t border-slate-700/60 font-semibold">
              <span class="text-slate-400">Spread / Retained:</span>
              <span class="font-mono tabular-nums ${net >= 0 ? "text-inflow" : "text-outflow"}">${net >= 0 ? "+" : ""}${formatKToman(net)} <span class="text-[10px] text-slate-400 font-sans font-normal">k-Toman</span></span>
            </div>
          </div>
        `;
      },
    },
    legend: {
      data: ["Cumulative Inflow", "Cumulative Outflow"],
      right: 10,
      top: 0,
      textStyle: {
        color: "#94A3B8",
        fontSize: 11,
        fontFamily: "Inter, sans-serif",
      },
      icon: "circle",
    },
    grid: {
      left: "2%",
      right: "3%",
      bottom: "3%",
      top: "14%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: xLabels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "#1E293B" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#64748B",
        fontSize: 10,
        interval: days.length > 20 ? 4 : days.length > 10 ? 2 : 0,
      },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#1E293B", type: "dashed" } },
      axisLabel: {
        color: "#64748B",
        fontSize: 10,
        formatter: (val: number) => formatKToman(val),
      },
    },
    series: [
      {
        name: "Cumulative Inflow",
        type: "line",
        smooth: 0.35,
        data: incomeSeries,
        symbol: "none",
        itemStyle: {
          color: "#04CE78",
        },
        lineStyle: {
          color: "#04CE78",
          width: 2.5,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(4, 206, 120, 0.28)" },
            { offset: 1, color: "rgba(4, 206, 120, 0.0)" },
          ]),
        },
      },
      {
        name: "Cumulative Outflow",
        type: "line",
        smooth: 0.35,
        data: expenseSeries,
        symbol: "none",
        itemStyle: {
          color: "#FF4D6A",
        },
        lineStyle: {
          color: "#FF4D6A",
          width: 2.5,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(255, 77, 106, 0.28)" },
            { offset: 1, color: "rgba(255, 77, 106, 0.0)" },
          ]),
        },
      },
    ],
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-dark-surface border border-dark-border relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-inflow/10 text-inflow">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Cumulative Burn Trajectory</h3>
            <p className="text-[11px] text-slate-400">
              Running Inflow vs. Outflow curve for {periodLabel}
            </p>
          </div>
        </div>

        {/* Crossover status badge */}
        {data && (
          <div>
            {data.crossover_occurred ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-outflow/15 border border-outflow/30 text-outflow text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Deficit crossover on Day {data.crossover_day}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-inflow/15 border border-inflow/30 text-inflow text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Surplus sustained (No deficit)</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[280px]">
        <ReactECharts
          option={option}
          style={{ width: "100%", height: "100%" }}
          opts={{ renderer: "svg" }}
        />
      </div>
    </div>
  );
};
