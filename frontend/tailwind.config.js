/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0B0F17",
          surface: "#131B2E",
          hover: "#1A243D",
          border: "#1E293B",
          "border-light": "#334155",
        },
        brand: {
          DEFAULT: "#1F5FFF",
          hover: "#164BD6",
          light: "#3B76FF",
          glow: "rgba(31, 95, 255, 0.25)",
        },
        inflow: {
          DEFAULT: "#04CE78",
          glow: "rgba(4, 206, 120, 0.25)",
          dim: "rgba(4, 206, 120, 0.12)",
        },
        outflow: {
          DEFAULT: "#FF4D6A",
          glow: "rgba(255, 77, 106, 0.25)",
          dim: "rgba(255, 77, 106, 0.12)",
        },
        slate: {
          950: "#070A0F",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Fira Code", "Courier New", "monospace"],
      },
      boxShadow: {
        "glow-brand": "0 0 20px -2px rgba(31, 95, 255, 0.35)",
        "glow-inflow": "0 0 20px -2px rgba(4, 206, 120, 0.35)",
        "glow-outflow": "0 0 20px -2px rgba(255, 77, 106, 0.35)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      animation: {
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
