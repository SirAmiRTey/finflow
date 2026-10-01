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
 */
export function getJalaliPeriodLabel(periodStr: string): string {
  if (!periodStr || !periodStr.includes("-")) return periodStr;
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
 * Format currency in k-Toman with tabular commas and suffix.
 */
export function formatKToman(value: number | string, includeSuffix = true): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return `0.00${includeSuffix ? " k-Toman" : ""}`;
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return includeSuffix ? `${formatted} k-Toman` : formatted;
}
