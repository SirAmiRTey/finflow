import React, { useState } from "react";
import { Lock, Mail, User as UserIcon, Wallet, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthSuccessResponse } from "@/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [startingBalance, setStartingBalance] = useState("0");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const payload = {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          currency_symbol: "k-Toman",
          starting_balance: parseFloat(startingBalance) || 0,
        };
        const res = await apiClient.post<AuthSuccessResponse>("/auth/register", payload);
        setAuth(res.data);
      } else {
        const payload = {
          email: email.trim().toLowerCase(),
          password,
        };
        const res = await apiClient.post<AuthSuccessResponse>("/auth/login/json", payload);
        setAuth(res.data);
      }
      if (onClose) onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setErrorMsg(detail);
      } else if (Array.isArray(detail)) {
        setErrorMsg(detail[0]?.msg || "Validation error occurred.");
      } else {
        setErrorMsg("Failed to authenticate. Please check your credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-dark-surface border border-dark-border rounded-2xl p-6 sm:p-8 shadow-2xl shadow-brand/10">
        {/* Glow decoration */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-12 bg-brand/20 blur-2xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 mb-3 text-brand">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isSignUp ? "Welcome to FinFlow" : "Welcome Back"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp
              ? "Self-hosted, private personal finance with Jalali calendar & k-Toman"
              : "Access your financial command center"}
          </p>
        </div>

        {/* Mode Toggle Switch */}
        <div className="grid grid-cols-2 p-1 bg-dark-bg/80 rounded-xl border border-dark-border mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              !isSignUp
                ? "bg-brand text-white shadow-md shadow-brand/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              isSignUp
                ? "bg-brand text-white shadow-md shadow-brand/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-outflow-dim border border-outflow/30 text-outflow text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Amir Hossein"
                  className="w-full bg-dark-bg/90 border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@finflow.local"
                className="w-full bg-dark-bg/90 border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-dark-bg/90 border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Starting Cash Balance
                </label>
                <span className="text-[10px] text-brand bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded font-mono">
                  k-Toman
                </span>
              </div>
              <div className="relative">
                <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-dark-bg/90 border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-start gap-1">
                <span className="text-inflow font-bold">💡 Tip:</span>
                Drop 3 zeros — e.g. enter <strong className="text-slate-200">350</strong> for 350,000 Tomans.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold shadow-lg shadow-brand/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? "Initialize & Start Tracking" : "Sign In to FinFlow"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-dark-border/60 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-inflow" />
          <span>Self-hosted on your machine • Zero tracking or telemetry</span>
        </div>
      </div>
    </div>
  );
};
