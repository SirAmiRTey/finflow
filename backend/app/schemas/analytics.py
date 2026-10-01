from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# ------------------------------------------------------------------------------
# 1. Periods List
# ------------------------------------------------------------------------------
class PeriodItem(BaseModel):
    """Jalali period option with human-readable label."""
    period: str = Field(..., description="Format: YYYY-MM", examples=["1405-07"])
    label: str = Field(..., description="E.g., 'Mehr 1405'", examples=["Mehr 1405"])
    is_current: bool = Field(..., description="Whether this is the current active period")
    year: int
    month: int

    model_config = ConfigDict(from_attributes=True)


class PeriodsResponse(BaseModel):
    """Collection of available Jalali transaction periods."""
    periods: List[PeriodItem]
    current_period: str


# ------------------------------------------------------------------------------
# 2. Financial Overview & Health KPIs
# ------------------------------------------------------------------------------
class OverviewAnalyticsResponse(BaseModel):
    """High-level financial KPIs and liquidity runway."""
    period: str
    period_label: str
    total_income: Decimal = Field(..., description="Consolidated income in period (k-Toman)")
    total_expense: Decimal = Field(..., description="Consolidated expenses in period (k-Toman)")
    net_savings: Decimal = Field(..., description="total_income - total_expense (k-Toman)")
    savings_rate_percentage: float = Field(..., description="((income - expense) / income) * 100")
    total_liquidity: Decimal = Field(..., description="Sum of current balances across all accounts")
    daily_burn_rate: Decimal = Field(..., description="Average expense per elapsed day in period")
    runway_days: float = Field(..., description="Estimated days until current liquidity is depleted")
    days_elapsed: int
    total_days: int
    currency_symbol: str = "k-Toman"

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# 3. Apache ECharts Sankey Series
# ------------------------------------------------------------------------------
class SankeyNode(BaseModel):
    """Node in the Sankey diagram."""
    name: str
    itemStyle: Optional[Dict[str, Any]] = None


class SankeyLink(BaseModel):
    """Link (flow) connecting two Sankey nodes."""
    source: str
    target: str
    value: float = Field(..., description="Flow volume in k-Toman (float for ECharts compatibility)")


class SankeyResponse(BaseModel):
    """Sankey flow diagram payload linking inflows, intermediary pool, and outflows."""
    period: str
    nodes: List[SankeyNode]
    links: List[SankeyLink]
    total_inflow: Decimal
    total_outflow: Decimal


# ------------------------------------------------------------------------------
# 4. GitHub-Style Monthly Heatmap
# ------------------------------------------------------------------------------
class HeatmapDayItem(BaseModel):
    """Daily spending aggregate for monthly calendar grid."""
    day: int = Field(..., ge=1, le=31)
    date_label: str = Field(..., examples=["Mehr 1"])
    amount: Decimal = Field(..., description="Total spent on this day in k-Toman")
    transaction_count: int = Field(..., description="Number of expense transactions")


class HeatmapResponse(BaseModel):
    """Full monthly calendar dataset for spend intensity heatmaps."""
    period: str
    period_label: str
    total_days: int
    days: List[HeatmapDayItem]
    max_daily_spend: Decimal


# ------------------------------------------------------------------------------
# 5. Cumulative Burn & Crossover
# ------------------------------------------------------------------------------
class CumulativeBurnDay(BaseModel):
    """Running progressive totals for income vs. burn trajectory."""
    day: int
    date_label: str
    daily_income: Decimal
    daily_expense: Decimal
    cumulative_income: Decimal
    cumulative_expense: Decimal


class CumulativeBurnResponse(BaseModel):
    """Progression curves and deficit crossover detection."""
    period: str
    period_label: str
    days: List[CumulativeBurnDay]
    crossover_occurred: bool = Field(..., description="True if cumulative expense overtook cumulative income")
    crossover_day: Optional[int] = Field(None, description="First day where cumulative expense exceeded income")


# ------------------------------------------------------------------------------
# 6. Category Spend Breakdown
# ------------------------------------------------------------------------------
class CategoryBreakdownItem(BaseModel):
    """Expense breakdown per category."""
    category_id: UUID
    category_name: str
    category_icon: str
    color_hex: str
    total_amount: Decimal
    percentage: float = Field(..., description="Percentage of total period expense (0.0 to 100.0)")
    transaction_count: int


class CategoryBreakdownResponse(BaseModel):
    """Categorical spend breakdown with percentage distributions."""
    period: str
    total_spend: Decimal
    breakdown: List[CategoryBreakdownItem]


# ------------------------------------------------------------------------------
# 7. Top Expenses (Outlier Detection)
# ------------------------------------------------------------------------------
class TopExpenseItem(BaseModel):
    """High-value single transaction item."""
    id: UUID
    amount: Decimal
    description: Optional[str] = None
    transaction_date: datetime
    day: int
    account_name: str
    category_name: str
    category_icon: str
    color_hex: str

    model_config = ConfigDict(from_attributes=True)


class TopExpensesResponse(BaseModel):
    """Top largest expenditure transactions for outlier inspection."""
    period: str
    limit: int
    expenses: List[TopExpenseItem]
