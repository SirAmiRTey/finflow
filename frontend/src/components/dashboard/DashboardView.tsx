import React from "react";
import { OverviewKPIs } from "@/components/dashboard/OverviewKPIs";
import { CashFlowSankey } from "@/components/dashboard/CashFlowSankey";
import { CumulativeBurnChart } from "@/components/dashboard/CumulativeBurnChart";
import { CategoryWaterfallDonut } from "@/components/dashboard/CategoryWaterfallDonut";
import { SpendingHeatmap } from "@/components/dashboard/SpendingHeatmap";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { usePeriodStore } from "@/store/usePeriodStore";
import { getJalaliPeriodLabel } from "@/utils/jalali";
import { Activity } from "lucide-react";

interface DashboardViewProps {
  onOpenFastEntry: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = () => {
  const selectedPeriod = usePeriodStore((s) => s.selectedPeriod);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Executive KPI Banner */}
      <section aria-label="Executive Overview KPIs">
        <OverviewKPIs />
      </section>

      {/* Main Flow Section: Cash Flow Sankey Flow */}
      <section aria-label="Cash Flow Channels">
        <CashFlowSankey />
      </section>

      {/* Trajectory & Allocation Grid (2 columns on lg screens) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-label="Spend Analytics Grid">
        {/* Cumulative Burn Trajectory (7 cols) */}
        <div className="lg:col-span-7">
          <CumulativeBurnChart />
        </div>

        {/* Category Waterfall Donut & Progress (5 cols) */}
        <div className="lg:col-span-5">
          <CategoryWaterfallDonut />
        </div>
      </section>

      {/* Monthly Rhythm & Outliers Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-label="Calendar and Outlier Breakdown">
        {/* Daily Spending Heatmap (7 cols) */}
        <div className="lg:col-span-7">
          <SpendingHeatmap />
        </div>

        {/* Top Single Expenditures (5 cols) */}
        <div className="lg:col-span-5">
          <TopExpensesCard />
        </div>
      </section>

      {/* System Status Footer */}
      <footer className="pt-2 pb-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Activity className="w-3.5 h-3.5 text-brand" />
        <span>
          Deep Analytics Engine active for {getJalaliPeriodLabel(selectedPeriod)} • Jalali time-series indexed
        </span>
      </footer>
    </div>
  );
};
