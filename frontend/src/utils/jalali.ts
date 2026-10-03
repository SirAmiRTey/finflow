import jalaali from "jalaali-js";

export const JALALI_MONTH_NAMES = [
  "Farvardin", "Ordibehesht", "Khordad",
  "Tir", "Mordad", "Shahrivar",
  "Mehr", "Aban", "Azar",
  "Dey", "Bahman", "Esfand"
];

export interface JalaliComponents {
  jy: number;
  jm: number;
  jd: number;
  period: string; // 'YYYY-MM'
}

/**
 * Converts a Gregorian Date or ISO string into Jalali components.
 */
export function toJalali(dateInput: Date | string = new Date()): JalaliComponents {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const gYear = d.getFullYear();
  const gMonth = d.getMonth() + 1;
  const gDay = d.getDate();

  const { jy, jm, jd } = jalaali.toJalaali(gYear, gMonth, gDay);
  const period = `${jy}-${String(jm).padStart(2, "0")}`;

  return { jy, jm, jd, period };
}

/**
 * Returns the month name for 1-indexed Jalali month.
 */
export function getJalaliMonthName(monthNumber: number): string {
  if (monthNumber < 1 || monthNumber > 12) return "";
  return JALALI_MONTH_NAMES[monthNumber - 1];
}

/**
 * Converts 'YYYY-MM' period string into human label, e.g. '1405-07' -> 'Mehr 1405'.
 * Also handles quick-range keys ('7d', '30d', '1y', 'all').
 */
export function getJalaliPeriodLabel(periodStr: string): string {
  if (!periodStr) return "";
  const lower = periodStr.toLowerCase().trim();
  if (lower === "7d") return "Last 7 Days";
  if (lower === "30d") return "Last 30 Days";
  if (lower === "1y") return "Last 1 Year";
  if (lower === "all") return "All Time";

  if (!periodStr.includes("-")) return periodStr;
  const [yearStr, monthStr] = periodStr.split("-");
  const month = parseInt(monthStr, 10);
  return `${getJalaliMonthName(month)} ${yearStr}`;
}

/**
 * Returns human date string, e.g. "Mehr 10, 1405".
 */
export function formatJalaliDate(dateInput: Date | string): string {
  const { jy, jm, jd } = toJalali(dateInput);
  return `${getJalaliMonthName(jm)} ${jd}, ${jy}`;
}

/**
 * Returns the current active Jalali period 'YYYY-MM'.
 */
export function getCurrentJalaliPeriod(): string {
  const { period } = toJalali(new Date());
  return period;
}

/**
 * Clean Number & Currency Formatter for k-Toman amounts.
 * - If whole integer (or ends in .00), completely omits decimal places:
 *   5000.00 -> "5,000", -6498.00 -> "-6,498", 26437.00 -> "26,437".
 * - If meaningful decimal fractions exist, displays up to 1-2 decimal places without trailing zeros:
 *   44.80 -> "44.8", 12.75 -> "12.75".
 * - Optional includeSuffix parameter defaults to false.
 */
export function formatKToman(amount: number | string, includeSuffix = false): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num === null || num === undefined) {
    return includeSuffix ? "0 k-Toman" : "0";
  }
  if (num === 0) {
    return includeSuffix ? "0 k-Toman" : "0";
  }

  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return includeSuffix ? `${formatted} k-Toman` : formatted;
}
