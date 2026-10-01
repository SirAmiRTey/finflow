from datetime import datetime, timezone
from typing import Tuple
import jdatetime


def to_jalali_components(dt: datetime) -> Tuple[int, int, int, str]:
    """
    Converts a Gregorian datetime into Jalali calendar components:
    (year, month, day, period_string 'YYYY-MM').

    Args:
        dt: The Gregorian datetime instance.

    Returns:
        Tuple of (j_year, j_month, j_day, j_period) e.g., (1403, 7, 10, '1403-07')
    """
    # Ensure datetime object is handled smoothly
    if dt.tzinfo is not None:
        # Normalize to UTC or keep as timestamp representation
        gregorian_dt = dt
    else:
        gregorian_dt = dt.replace(tzinfo=timezone.utc)

    # Convert via jdatetime
    j_dt = jdatetime.datetime.fromgregorian(datetime=gregorian_dt)
    j_year = int(j_dt.year)
    j_month = int(j_dt.month)
    j_day = int(j_dt.day)
    j_period = f"{j_year:04d}-{j_month:02d}"

    return j_year, j_month, j_day, j_period


def get_current_jalali_period() -> str:
    """Returns the current Jalali period string ('YYYY-MM')."""
    j_now = jdatetime.datetime.now()
    return f"{j_now.year:04d}-{j_now.month:02d}"


JALALI_MONTH_NAMES_EN = [
    "Farvardin", "Ordibehesht", "Khordad",
    "Tir", "Mordad", "Shahrivar",
    "Mehr", "Aban", "Azar",
    "Dey", "Bahman", "Esfand"
]


def parse_jalali_period(period: str) -> Tuple[int, int]:
    """
    Parses and validates a 'YYYY-MM' Jalali period string into (year, month).
    Raises ValueError if format is invalid.
    """
    parts = period.split("-")
    if len(parts) != 2:
        raise ValueError(f"Invalid Jalali period format: '{period}'. Expected 'YYYY-MM'.")
    try:
        year = int(parts[0])
        month = int(parts[1])
    except ValueError:
        raise ValueError(f"Invalid year or month numbers in period: '{period}'.")

    if not (1 <= month <= 12):
        raise ValueError(f"Jalali month must be between 1 and 12, got: {month}.")
    return year, month


def get_jalali_month_name(month: int) -> str:
    """Returns the English name for a 1-indexed Jalali month (1 to 12)."""
    if not (1 <= month <= 12):
        raise ValueError(f"Month must be between 1 and 12, got {month}")
    return JALALI_MONTH_NAMES_EN[month - 1]


def get_days_in_jalali_month(year: int, month: int) -> int:
    """
    Returns the total number of days in the specified Jalali year and month:
    - Months 1-6: 31 days
    - Months 7-11: 30 days
    - Month 12: 30 days in leap years, 29 in non-leap years.
    """
    if 1 <= month <= 6:
        return 31
    elif 7 <= month <= 11:
        return 30
    elif month == 12:
        return 30 if jdatetime.date(year, 1, 1).isleap() else 29
    raise ValueError(f"Invalid Jalali month: {month}")


def get_jalali_period_label(period: str) -> str:
    """
    Converts a 'YYYY-MM' period string to a human-readable label (e.g. '1405-07' -> 'Mehr 1405').
    """
    year, month = parse_jalali_period(period)
    return f"{get_jalali_month_name(month)} {year}"


def get_elapsed_days_in_period(year: int, month: int) -> int:
    """
    Returns the number of elapsed days in a given Jalali month:
    - If current month/year: current day of month (capped at 1 to days in month)
    - If past month/year: full total days in month
    - If future month/year: 1 (to avoid divide by zero)
    """
    j_now = jdatetime.datetime.now()
    total_days = get_days_in_jalali_month(year, month)

    if (year < j_now.year) or (year == j_now.year and month < j_now.month):
        return total_days
    elif year == j_now.year and month == j_now.month:
        return max(1, min(j_now.day, total_days))
    else:
        return 1

