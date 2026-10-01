import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Plus,
  LogOut,
  Sparkles,
  User,
  Calendar,
  BarChart3,
  Receipt,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { usePeriodStore } from "@/store/usePeriodStore";
import { formatKToman } from "@/utils/jalali";
import { PeriodsResponse } from "@/types";

interface NavbarProps {
  currentView: "dashboard" | "transactions";
  onViewChange: (view: "dashboard" | "transactions") => void;
  onOpenFastEntry: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  onOpenFastEntry,
  onOpenAuth,
}) => {
  const { user, totalLiquidity, isAuthenticated, logout } = useAuthStore();
  const {
    selectedPeriod,
    availablePeriods,
    setSelectedPeriod,
    setAvailablePeriods,
    goToPreviousPeriod,
    goToNextPeriod,
  } = usePeriodStore();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Sync available Jalali periods from backend
  const { data: periodsData } = useQuery<PeriodsResponse>({
    queryKey: ["analytics", "periods"],
    queryFn: async () => {
      const res = await apiClient.get<PeriodsResponse>("/analytics/periods");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (periodsData?.periods && periodsData.periods.length > 0) {
      setAvailablePeriods(periodsData.periods);
    }
  }, [periodsData, setAvailablePeriods]);

  return (
    <header className="sticky top-0 z-40 bg-dark-bg/90 backdrop-blur-xl border-b border-dark-border px-4 lg:px-8 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Top bar row on mobile / Left group on desktop */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          {/* Brand / Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onViewChange("dashboard")}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand to-cyan-500 p-0.5 shadow-lg shadow-brand/25 flex items-center justify-center">
              <div className="w-full h-full bg-dark-bg rounded-[9px] flex items-center justify-center text-brand">
                <Sparkles className="w-4 h-4 text-brand" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-white">FinFlow</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand/10 border border-brand/20 text-brand">
                PWA
              </span>
            </div>
          </div>

          {/* View Switcher Tabs (Segmented control) */}
          {isAuthenticated && (
            <div className="flex items-center p-1 bg-dark-surface/90 border border-dark-border rounded-xl">
              <button
                type="button"
                onClick={() => onViewChange("dashboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === "dashboard"
                    ? "bg-brand text-white shadow-sm shadow-brand/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => onViewChange("transactions")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === "transactions"
                    ? "bg-brand text-white shadow-sm shadow-brand/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Ledger</span>
              </button>
            </div>
          )}

          {/* User profile button on mobile */}
          {isAuthenticated && (
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-8 h-8 rounded-xl bg-dark-surface border border-dark-border flex items-center justify-center text-slate-300"
              >
                <User className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Center / Right controls */}
        {isAuthenticated ? (
          <div className="flex items-center justify-between md:justify-end gap-2.5">
            {/* Jalali Period Navigator Stepper */}
            <div className="flex items-center gap-0.5 bg-dark-surface/90 border border-dark-border rounded-xl p-0.5 shadow-inner">
              <button
                type="button"
                onClick={goToPreviousPeriod}
                title="Previous Month"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-hover transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="relative flex items-center px-1.5">
                <Calendar className="w-3 h-3 text-brand mr-1" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer appearance-none pr-3"
                >
                  {availablePeriods.map((p) => (
                    <option key={p.period} value={p.period} className="bg-dark-surface text-white">
                      {p.label} {p.is_current ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={goToNextPeriod}
                title="Next Month"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-hover transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Total Liquidity Badge (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-dark-surface border border-dark-border">
              <Wallet className="w-3.5 h-3.5 text-inflow" />
              <div>
                <span className="text-[9px] text-slate-400 block leading-tight">Total Liquidity</span>
                <span className="text-xs font-mono font-bold text-white leading-tight">
                  {formatKToman(totalLiquidity)}
                </span>
              </div>
            </div>

            {/* "+ New Transaction" Button */}
            <button
              type="button"
              onClick={onOpenFastEntry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-md shadow-brand/25 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono bg-white/20 rounded">
                N
              </kbd>
            </button>

            {/* Desktop User Avatar & Menu */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-8 h-8 rounded-xl bg-dark-surface border border-dark-border hover:border-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <User className="w-4 h-4" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-dark-surface border border-dark-border rounded-2xl p-2 shadow-2xl z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-dark-border/60">
                    <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span>Liquidity:</span>
                      <span className="text-inflow font-bold">{formatKToman(totalLiquidity)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-xs font-medium text-outflow hover:bg-outflow-dim flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-4 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-md shadow-brand/25 transition-all cursor-pointer self-start md:self-auto"
          >
            Sign In
          </button>
        )}
      </div>

      {/* Mobile Profile Dropdown */}
      {showProfileMenu && (
        <div className="md:hidden mt-2 p-3 bg-dark-surface border border-dark-border rounded-xl">
          <div className="flex items-center justify-between pb-2 border-b border-dark-border/60">
            <div>
              <p className="text-xs font-semibold text-white">{user?.full_name}</p>
              <p className="text-[11px] text-slate-400">{user?.email}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Total Liquidity</span>
              <span className="text-xs font-mono font-bold text-inflow">
                {formatKToman(totalLiquidity)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(false);
              logout();
            }}
            className="w-full mt-2 py-1.5 rounded-lg text-xs font-medium text-outflow hover:bg-outflow-dim flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </header>
  );
};
