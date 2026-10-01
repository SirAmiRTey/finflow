import React, { useState } from "react";
import {
  Search,
  Trash2,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { usePeriodStore } from "@/store/usePeriodStore";
import { useAuthStore } from "@/store/useAuthStore";
import { formatJalaliDate, formatKToman, getJalaliPeriodLabel } from "@/utils/jalali";
import { Transaction, TransactionListResponse } from "@/types";

interface TransactionListViewProps {
  onOpenFastEntry: () => void;
}

export const TransactionListView: React.FC<TransactionListViewProps> = ({ onOpenFastEntry }) => {
  const queryClient = useQueryClient();
  const selectedPeriod = usePeriodStore((s) => s.selectedPeriod);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch transactions for selected Jalali period
  const { data, isLoading, isError } = useQuery<TransactionListResponse>({
    queryKey: ["transactions", selectedPeriod, typeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPeriod) params.append("period", selectedPeriod);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (search.trim()) params.append("search", search.trim());
      params.append("limit", "100");

      const res = await apiClient.get<TransactionListResponse>(`/transactions?${params.toString()}`);
      return res.data;
    },
  });

  // Delete transaction mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      fetchProfile();
      setDeleteConfirmId(null);
    },
  });

  const transactions = data?.items || [];

  // Group transactions by date string
  const groupedTransactions: Record<string, Transaction[]> = transactions.reduce(
    (groups, tx) => {
      const dateKey = tx.transaction_date ? tx.transaction_date.split("T")[0] : "Other";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
      return groups;
    },
    {} as Record<string, Transaction[]>
  );

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-dark-surface/60 border border-dark-border p-3 rounded-2xl backdrop-blur-md">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes or descriptions..."
            className="w-full bg-dark-bg border border-dark-border/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-all"
          />
        </div>

        {/* Type pills */}
        <div className="flex items-center gap-1.5 p-1 bg-dark-bg border border-dark-border/80 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              typeFilter === "all"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("expense")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              typeFilter === "expense"
                ? "bg-outflow text-white shadow-sm shadow-outflow/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Expenses</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("income")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              typeFilter === "income"
                ? "bg-inflow text-white shadow-sm shadow-inflow/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Incomes</span>
          </button>
        </div>
      </div>

      {/* Period summary banner */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-border">
            <span className="text-[11px] font-medium text-slate-400">Total Inflow</span>
            <div className="text-base sm:text-lg font-mono font-bold text-inflow mt-0.5">
              +{formatKToman(data.total_income)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-border">
            <span className="text-[11px] font-medium text-slate-400">Total Outflow</span>
            <div className="text-base sm:text-lg font-mono font-bold text-outflow mt-0.5">
              -{formatKToman(data.total_expense)}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-dark-surface border border-dark-border flex sm:flex-col items-center sm:items-start justify-between">
            <span className="text-[11px] font-medium text-slate-400">Net Period Result</span>
            <div
              className={`text-base sm:text-lg font-mono font-bold mt-0.5 ${
                parseFloat(data.total_income) - parseFloat(data.total_expense) >= 0
                  ? "text-inflow"
                  : "text-outflow"
              }`}
            >
              {formatKToman(
                (parseFloat(data.total_income) - parseFloat(data.total_expense)).toFixed(2)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading ledger for {getJalaliPeriodLabel(selectedPeriod)}...</p>
        </div>
      )}

      {isError && (
        <div className="p-4 rounded-2xl bg-outflow-dim border border-outflow/30 text-outflow flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Failed to load transactions for this period. Please verify server connectivity.</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && transactions.length === 0 && (
        <div className="py-16 px-4 rounded-2xl bg-dark-surface/40 border border-dashed border-dark-border flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">No transactions recorded</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
            You haven't logged any entries in {getJalaliPeriodLabel(selectedPeriod)}. Record your first transaction to initiate deep analytics.
          </p>
          <button
            type="button"
            onClick={onOpenFastEntry}
            className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand/20 cursor-pointer active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Entry (Press 'N')</span>
          </button>
        </div>
      )}

      {/* Grouped Transaction List */}
      {!isLoading && transactions.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([dateStr, items]) => (
            <div key={dateStr} className="space-y-2">
              {/* Date Header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand" />
                  <span>{formatJalaliDate(items[0]?.transaction_date || dateStr)}</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {items.length} {items.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              {/* Transactions in Date Group */}
              <div className="space-y-2">
                {items.map((tx) => {
                  const isExpense = tx.type === "expense";
                  const isDeleting = deleteConfirmId === tx.id;

                  return (
                    <div
                      key={tx.id}
                      className="group p-3.5 sm:p-4 rounded-2xl bg-dark-surface border border-dark-border hover:border-slate-700/80 transition-all flex items-center justify-between gap-3 shadow-sm"
                    >
                      {/* Left: Category Icon & Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: `${tx.category?.color_hex || "#3B82F6"}18`,
                            color: tx.category?.color_hex || "#3B82F6",
                          }}
                        >
                          <CategoryIcon name={tx.category?.icon || "tag"} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">
                              {tx.category?.name || "General"}
                            </span>
                            {tx.account && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-dark-bg px-2 py-0.5 rounded-md border border-dark-border">
                                <Wallet className="w-2.5 h-2.5" />
                                <span>{tx.account.name}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {tx.description || (isExpense ? "Expense entry" : "Income entry")}
                          </p>
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span
                            className={`text-sm sm:text-base font-mono font-bold block ${
                              isExpense ? "text-outflow" : "text-inflow"
                            }`}
                          >
                            {isExpense ? "-" : "+"}
                            {formatKToman(tx.amount)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono sm:hidden">
                            {tx.account?.name}
                          </span>
                        </div>

                        {/* Delete action with safety confirmation */}
                        <div className="relative">
                          {isDeleting ? (
                            <div className="flex items-center gap-1.5 animate-fade-in">
                              <button
                                type="button"
                                onClick={() => deleteMutation.mutate(tx.id)}
                                disabled={deleteMutation.isPending}
                                className="px-2 py-1 bg-outflow hover:bg-red-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                              >
                                {deleteMutation.isPending ? "..." : "Confirm"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-dark-hover text-slate-400 hover:text-white text-[10px] rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(tx.id)}
                              title="Delete transaction"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-outflow hover:bg-dark-hover opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
