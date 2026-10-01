import { create } from "zustand";
import { getCurrentJalaliPeriod, getJalaliPeriodLabel } from "@/utils/jalali";
import { PeriodItem } from "@/types";

interface PeriodState {
  selectedPeriod: string; // 'YYYY-MM'
  availablePeriods: PeriodItem[];

  setSelectedPeriod: (period: string) => void;
  setAvailablePeriods: (periods: PeriodItem[]) => void;
  goToNextPeriod: () => void;
  goToPreviousPeriod: () => void;
}

export const usePeriodStore = create<PeriodState>((set, get) => {
  const initialPeriod = getCurrentJalaliPeriod();

  return {
    selectedPeriod: initialPeriod,
    availablePeriods: [
      {
        period: initialPeriod,
        label: getJalaliPeriodLabel(initialPeriod),
        is_current: true,
        year: parseInt(initialPeriod.split("-")[0], 10),
        month: parseInt(initialPeriod.split("-")[1], 10),
      },
    ],

    setSelectedPeriod: (period: string) => {
      set({ selectedPeriod: period });
    },

    setAvailablePeriods: (periods: PeriodItem[]) => {
      set({ availablePeriods: periods });
    },

    goToNextPeriod: () => {
      const { selectedPeriod, availablePeriods } = get();
      const currentIndex = availablePeriods.findIndex((p) => p.period === selectedPeriod);
      // availablePeriods are sorted descending (index 0 is newest)
      if (currentIndex > 0) {
        set({ selectedPeriod: availablePeriods[currentIndex - 1].period });
      } else {
        // Increment month manually if at the newest
        try {
          const [yearStr, monthStr] = selectedPeriod.split("-");
          let year = parseInt(yearStr, 10);
          let month = parseInt(monthStr, 10) + 1;
          if (month > 12) {
            year += 1;
            month = 1;
          }
          const nextPeriod = `${year}-${String(month).padStart(2, "0")}`;
          set({ selectedPeriod: nextPeriod });
        } catch {
          // ignore
        }
      }
    },

    goToPreviousPeriod: () => {
      const { selectedPeriod, availablePeriods } = get();
      const currentIndex = availablePeriods.findIndex((p) => p.period === selectedPeriod);
      if (currentIndex !== -1 && currentIndex < availablePeriods.length - 1) {
        set({ selectedPeriod: availablePeriods[currentIndex + 1].period });
      } else {
        // Decrement month manually
        try {
          const [yearStr, monthStr] = selectedPeriod.split("-");
          let year = parseInt(yearStr, 10);
          let month = parseInt(monthStr, 10) - 1;
          if (month < 1) {
            year -= 1;
            month = 12;
          }
          const prevPeriod = `${year}-${String(month).padStart(2, "0")}`;
          set({ selectedPeriod: prevPeriod });
        } catch {
          // ignore
        }
      }
    },
  };
});
