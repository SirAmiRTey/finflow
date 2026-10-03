import React, { useEffect, useState } from "react";
import { X, Plus, Calendar, ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { useAuthStore } from "@/store/useAuthStore";
import { formatJalaliDate, formatKToman } from "@/utils/jalali";
import { Account, Category } from "@/types";

interface FastEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_AMOUNTS = [10, 50, 100, 500, 1000];

export const FastEntryModal: React.FC<FastEntryModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { accounts, defaultAccount } = useAuthStore();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiClient.get<Category[]>("/categories");
      return res.data;
    },
    enabled: isOpen,
  });

  // Filter categories by selected type (income or expense)
  const filteredCategories = categories.filter((c) => c.type === type);

  // Set default account and category when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!selectedAccountId && (defaultAccount || accounts[0])) {
        setSelectedAccountId((defaultAccount || accounts[0])?.id || "");
      }
      setAmount("");
      setDescription("");
      setErrorMsg(null);
    }
  }, [isOpen, defaultAccount, accounts, selectedAccountId]);

  // Set default category when type or category list changes
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const exists = filteredCategories.some((c) => c.id === selectedCategoryId);
      if (!exists) {
        setSelectedCategoryId(filteredCategories[0].id);
      }
    }
  }, [type, filteredCategories, selectedCategoryId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Quick add chips handler
  const handleQuickAdd = (chipAmount: number) => {
    const current = parseFloat(amount || "0");
    const nextVal = (isNaN(current) ? 0 : current) + chipAmount;
    setAmount(nextVal.toString());
  };

  // Transaction submission mutation
  const createTxMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid amount greater than 0.");
      }
      if (!selectedCategoryId) {
        throw new Error("Please select a category.");
      }
      if (!selectedAccountId) {
        throw new Error("Please select an account.");
      }

      const payload = {
        account_id: selectedAccountId,
        category_id: selectedCategoryId,
        type,
        amount: parsedAmount,
        description: description.trim() || undefined,
        transaction_date: new Date().toISOString(),
      };

      const res = await apiClient.post("/transactions", payload);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate both transaction lists and analytics queries to refresh UI instantly
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      useAuthStore.getState().fetchProfile();
      onClose();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === "string" ? detail : err.message || "Failed to save transaction.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    createTxMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-dark-surface border border-dark-border rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-border/60">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${type === "expense" ? "bg-outflow/10 text-outflow" : "bg-inflow/10 text-inflow"}`}>
              {type === "expense" ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Record Transaction</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatJalaliDate(new Date())}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-outflow-dim border border-outflow/30 text-outflow text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Segmented Type Control */}
          <div className="grid grid-cols-2 p-1 bg-dark-bg rounded-xl border border-dark-border">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                type === "expense"
                  ? "bg-outflow text-white shadow-lg shadow-outflow/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Expense (Outflow)</span>
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                type === "income"
                  ? "bg-inflow text-white shadow-lg shadow-inflow/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Income (Inflow)</span>
            </button>
          </div>

          {/* Amount Input with Auto Focus & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Amount (in k-Toman)</label>
              {amount && !isNaN(parseFloat(amount)) && (
                <span className="text-[11px] font-mono text-slate-400">
                  ≈ {(parseFloat(amount) * 1000).toLocaleString()} Tomans
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                autoFocus
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-2xl font-mono font-bold text-white placeholder-slate-600 focus:outline-none transition-all ${
                  type === "expense"
                    ? "focus:border-outflow focus:ring-1 focus:ring-outflow"
                    : "focus:border-inflow focus:ring-1 focus:ring-inflow"
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-slate-400 bg-dark-surface px-2 py-1 rounded-md border border-dark-border">
                k-Toman
              </span>
            </div>

            {/* Quick-Add Chips */}
            <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Quick:</span>
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleQuickAdd(q)}
                  className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-dark-hover border border-dark-border text-slate-300 hover:text-white hover:border-slate-500 active:scale-95 transition-all cursor-pointer"
                >
                  +{q}
                </button>
              ))}
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="px-2 py-1 text-[11px] font-medium rounded-lg text-slate-400 hover:text-outflow transition-colors ml-auto cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Category</label>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-brand/15 border-brand text-white shadow-md shadow-brand/15 scale-[1.02]"
                        : "bg-dark-bg/80 border-dark-border text-slate-400 hover:text-slate-200 hover:bg-dark-hover"
                    }`}
                  >
                    <div
                      className="p-1.5 rounded-lg"
                      style={{
                        backgroundColor: `${cat.color_hex}20`,
                        color: cat.color_hex,
                      }}
                    >
                      <CategoryIcon name={cat.icon} className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-medium truncate w-full text-center leading-tight">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Selector & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Wallet / Account</label>
              <div className="relative">
                <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand transition-all cursor-pointer appearance-none"
                >
                  {accounts.map((acc: Account) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatKToman(acc.current_balance)} k-Toman)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Note (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={createTxMutation.isPending}
            className={`w-full py-3 px-4 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              type === "expense"
                ? "bg-outflow hover:bg-red-600 shadow-lg shadow-outflow/30"
                : "bg-inflow hover:bg-emerald-600 shadow-lg shadow-inflow/30"
            }`}
          >
            {createTxMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>
                  Save {type === "expense" ? "Expense" : "Income"}{" "}
                  {amount ? `(${formatKToman(amount)} k-Toman)` : ""}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
