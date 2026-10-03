import React from "react";
import ReactECharts from "echarts-for-react";
import { GitCommit, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { usePeriodStore } from "@/store/usePeriodStore";
import { formatKToman, getJalaliPeriodLabel } from "@/utils/jalali";
import { SankeyResponse } from "@/types";

export const CashFlowSankey: React.FC = () => {
  const { selectedPeriod, selectedRange } = usePeriodStore();

  const { data, isLoading } = useQuery<SankeyResponse>({
    queryKey: ["analytics", "sankey", selectedPeriod, selectedRange],
    queryFn: async () => {
      const queryParam = selectedRange
        ? `period=${selectedPeriod}&range=${selectedRange}`
        : `period=${selectedPeriod}`;
      const res = await apiClient.get<SankeyResponse>(`/analytics/sankey?${queryParam}`);
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
      <div className="p-6 rounded-2xl bg-dark-surface border border-dark-border min-h-[380px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Rendering cash flow channels...</p>
      </div>
    );
  }

  const hasFlows = data && data.links && data.links.length > 0;

  const option = hasFlows
    ? {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "item",
          triggerOn: "mousemove",
          backgroundColor: "#131B2E",
          borderColor: "#1E293B",
          borderWidth: 1,
          padding: [8, 12],
          textStyle: {
            color: "#F8FAFC",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
          },
          formatter: (params: any) => {
            if (params.dataType === "edge") {
              return `
                <div class="space-y-1">
                  <div class="text-[11px] text-slate-400 font-medium">${params.data.source} → ${params.data.target}</div>
                  <div class="text-sm font-mono font-bold text-white tabular-nums">${formatKToman(params.data.value)} <span class="text-[10px] text-slate-400 font-sans font-normal">k-Toman</span></div>
                </div>
              `;
            } else {
              return `
                <div class="space-y-1">
                  <div class="text-[11px] text-slate-400 font-medium">Node: <span class="text-white font-semibold">${params.name}</span></div>
                  <div class="text-sm font-mono font-bold text-brand tabular-nums">${formatKToman(params.value || 0)} <span class="text-[10px] text-slate-400 font-sans font-normal">k-Toman</span></div>
                </div>
              `;
            }
          },
        },
        series: [
          {
            type: "sankey",
            layout: "none",
            top: 20,
            bottom: 20,
            left: "5%",
            right: "20%",
            nodeWidth: 18,
            nodeGap: 16,
            nodeAlign: "justify",
            draggable: false,
            emphasis: {
              focus: "adjacency",
            },
            data: data.nodes.map((node) => ({
              ...node,
              itemStyle: node.itemStyle || {
                color: "#1F5FFF",
                borderRadius: 4,
              },
            })),
            links: data.links,
            lineStyle: {
              color: "gradient",
              curveness: 0.5,
              opacity: 0.45,
            },
            label: {
              position: "right",
              distance: 10,
              color: "#F8FAFC",
              fontSize: 12,
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
              formatter: (params: any) => {
                if (params.value !== undefined && params.value !== null) {
                  return `${params.name} (${formatKToman(params.value)})`;
                }
                return params.name;
              },
            },
          },
        ],
      }
    : null;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-dark-surface border border-dark-border relative overflow-visible flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand/10 text-brand">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Cash Flow Sankey Flow</h3>
            <p className="text-[11px] text-slate-400">
              Inflows &rarr; Inflow Pool &rarr; Expenditures & Savings ({periodLabel})
            </p>
          </div>
        </div>

        {data && (
          <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
            <span className="text-slate-400">
              Inflow: <strong className="text-inflow font-bold">{formatKToman(data.total_inflow)}</strong> <span className="text-[10px] text-slate-400 font-sans">k-Toman</span>
            </span>
            <span className="text-slate-400">
              Outflow: <strong className="text-outflow font-bold">{formatKToman(data.total_outflow)}</strong> <span className="text-[10px] text-slate-400 font-sans">k-Toman</span>
            </span>
          </div>
        )}
      </div>

      {/* Chart Canvas or Empty State */}
      {hasFlows ? (
        <div className="w-full h-[360px] sm:h-[420px] overflow-visible">
          <ReactECharts
            option={option}
            style={{ width: "100%", height: "100%", overflow: "visible" }}
            opts={{ renderer: "svg" }}
          />
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-300">Insufficient flow volume</p>
          <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
            Log both income and expense entries in {periodLabel} to visualize interactive Sankey channels.
          </p>
        </div>
      )}
    </div>
  );
};
