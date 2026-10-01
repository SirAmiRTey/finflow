import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { MobileFAB } from "@/components/layout/MobileFAB";
import { AuthModal } from "@/components/auth/AuthModal";
import { FastEntryModal } from "@/components/transactions/FastEntryModal";
import { TransactionListView } from "@/components/transactions/TransactionListView";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { useAuthStore } from "@/store/useAuthStore";
import { Sparkles, Shield, ArrowRight, Zap, RefreshCw } from "lucide-react";

export const App: React.FC = () => {
  const { isAuthenticated, isLoading, fetchProfile, user } = useAuthStore();

  const [currentView, setCurrentView] = useState<"dashboard" | "transactions">("dashboard");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFastEntryOpen, setIsFastEntryOpen] = useState(false);

  // Sync profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Global 'N' keyboard shortcut for Fast-Entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (isAuthenticated) {
          setIsFastEntryOpen(true);
        } else {
          setIsAuthModalOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-slate-100 selection:bg-brand selection:text-white">
      {/* Top Navbar with View Switcher */}
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenFastEntry={() => setIsFastEntryOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 pb-24 sm:pb-12">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading FinFlow command center...</p>
          </div>
        ) : !isAuthenticated ? (
          /* Unauthenticated Landing & Onboarding Hook */
          <div className="py-12 sm:py-20 flex flex-col items-center text-center max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Self-Hosted Personal Finance PWA</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Control your wealth in{" "}
                <span className="bg-gradient-to-r from-brand via-cyan-400 to-inflow bg-clip-text text-transparent">
                  k-Toman & Jalali
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
                A high-performance, private financial operating system with instant keyboard entry, deep analytics, and zero external trackers.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold shadow-xl shadow-brand/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 group"
              >
                <span>Get Started / Sign In</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-8 text-left">
              <div className="p-4 rounded-2xl bg-dark-surface border border-dark-border">
                <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-2.5">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Instant 'N' Fast Entry</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Log transactions in under 3 seconds with auto-focused quick chips.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-dark-surface border border-dark-border">
                <div className="w-8 h-8 rounded-lg bg-inflow/10 text-inflow flex items-center justify-center mb-2.5">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">k-Toman Scaling</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Clean monetary figures by dropping 3 zeros while maintaining exact cents.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-dark-surface border border-dark-border">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2.5">
                  <Shield className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">100% Private</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Self-hosted locally on PostgreSQL 16 with zero third-party telemetry.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard / Ledger View Switcher */
          <div className="animate-fade-in">
            {currentView === "dashboard" ? (
              <DashboardView onOpenFastEntry={() => setIsFastEntryOpen(true)} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Ledger & History</h2>
                    <p className="text-xs text-slate-400">
                      Showing records for {user?.full_name}
                    </p>
                  </div>
                </div>
                <TransactionListView onOpenFastEntry={() => setIsFastEntryOpen(true)} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Persistent Mobile Floating Action Button */}
      {isAuthenticated && <MobileFAB onClick={() => setIsFastEntryOpen(true)} />}

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Fast Entry Transaction Modal */}
      {isAuthenticated && (
        <FastEntryModal isOpen={isFastEntryOpen} onClose={() => setIsFastEntryOpen(false)} />
      )}
    </div>
  );
};
