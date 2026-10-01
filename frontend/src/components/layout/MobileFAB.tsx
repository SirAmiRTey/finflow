import React from "react";
import { Plus } from "lucide-react";

interface MobileFABProps {
  onClick: () => void;
}

export const MobileFAB: React.FC<MobileFABProps> = ({ onClick }) => {
  return (
    <div className="sm:hidden fixed bottom-6 right-6 z-40">
      <button
        type="button"
        onClick={onClick}
        className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand to-cyan-500 text-white flex items-center justify-center shadow-xl shadow-brand/40 active:scale-95 transition-all cursor-pointer border border-white/20"
        aria-label="New Transaction"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
};
