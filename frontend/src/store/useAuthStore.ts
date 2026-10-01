import { create } from "zustand";
import { apiClient } from "@/api/client";
import { Account, AuthSuccessResponse, User, UserProfileOverview } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  defaultAccount: Account | null;
  accounts: Account[];
  totalLiquidity: string;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (data: AuthSuccessResponse) => void;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateAccountBalanceInStore: (accountId: string, newBalance: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for 401 events emitted from axios interceptor
  if (typeof window !== "undefined") {
    window.addEventListener("finflow:unauthorized", () => {
      set({
        user: null,
        token: null,
        defaultAccount: null,
        accounts: [],
        totalLiquidity: "0.00",
        isAuthenticated: false,
        isLoading: false,
      });
    });
  }

  const initialToken = typeof window !== "undefined" ? localStorage.getItem("finflow_token") : null;

  return {
    user: null,
    token: initialToken,
    defaultAccount: null,
    accounts: [],
    totalLiquidity: "0.00",
    isAuthenticated: !!initialToken,
    isLoading: !!initialToken,

    setAuth: (data: AuthSuccessResponse) => {
      localStorage.setItem("finflow_token", data.access_token);
      set({
        token: data.access_token,
        user: data.user,
        defaultAccount: data.default_account || null,
        accounts: data.default_account ? [data.default_account] : [],
        totalLiquidity: data.default_account ? data.default_account.current_balance : "0.00",
        isAuthenticated: true,
        isLoading: false,
      });
    },

    logout: () => {
      localStorage.removeItem("finflow_token");
      set({
        user: null,
        token: null,
        defaultAccount: null,
        accounts: [],
        totalLiquidity: "0.00",
        isAuthenticated: false,
        isLoading: false,
      });
    },

    fetchProfile: async () => {
      const currentToken = get().token || localStorage.getItem("finflow_token");
      if (!currentToken) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      try {
        set({ isLoading: true });
        const res = await apiClient.get<UserProfileOverview>("/auth/me");
        const profile = res.data;
        const defaultAcc = profile.accounts.find((a) => a.id === profile.default_account_id) || profile.accounts[0] || null;

        set({
          user: profile.user,
          accounts: profile.accounts,
          defaultAccount: defaultAcc,
          totalLiquidity: profile.total_balance,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem("finflow_token");
        set({
          user: null,
          token: null,
          defaultAccount: null,
          accounts: [],
          totalLiquidity: "0.00",
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    updateAccountBalanceInStore: (accountId: string, newBalance: string) => {
      const { accounts } = get();
      const updated = accounts.map((acc) =>
        acc.id === accountId ? { ...acc, current_balance: newBalance } : acc
      );
      const newTotal = updated
        .reduce((sum, acc) => sum + parseFloat(acc.current_balance || "0"), 0)
        .toFixed(2);

      set({
        accounts: updated,
        totalLiquidity: newTotal,
        defaultAccount:
          get().defaultAccount?.id === accountId
            ? { ...get().defaultAccount!, current_balance: newBalance }
            : get().defaultAccount,
      });
    },
  };
});
