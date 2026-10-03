import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.core.config import settings
from app.core.jalali import (
    get_current_jalali_period,
    get_days_in_jalali_month,
    get_elapsed_days_in_period,
    get_jalali_month_name,
    get_jalali_period_label,
    parse_jalali_period,
    to_jalali_components,
)
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.analytics import (
    CategoryBreakdownItem,
    CategoryBreakdownResponse,
    CumulativeBurnDay,
    CumulativeBurnResponse,
    HeatmapDayItem,
    HeatmapResponse,
    OverviewAnalyticsResponse,
    PeriodItem,
    PeriodsResponse,
    SankeyLink,
    SankeyNode,
    SankeyResponse,
    TopExpenseItem,
    TopExpensesResponse,
)

router = APIRouter(prefix="/analytics", tags=["Deep Analytics Engine"])

VALID_RANGES = {"7d", "30d", "1y", "all"}


def validate_and_resolve_period(period: Optional[str]) -> str:
    """Validates period format and falls back to current active Jalali period."""
    resolved = period.strip() if period else get_current_jalali_period()
    try:
        parse_jalali_period(resolved)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    return resolved


def resolve_time_scope(
    period: Optional[str] = None,
    range_param: Optional[str] = None,
) -> Tuple[str, str, Optional[datetime], Optional[datetime]]:
    """
    Resolves active period/range key, display label, and optional UTC datetime boundaries.
    If range_param is specified and valid, it takes precedence for dynamic time-bounding.
    Returns: (resolved_key, display_label, start_datetime, end_datetime)
    """
    if range_param:
        cleaned_range = range_param.strip().lower()
        if cleaned_range in VALID_RANGES:
            now = datetime.now(timezone.utc)
            if cleaned_range == "7d":
                return cleaned_range, "Last 7 Days", now - timedelta(days=7), now
            elif cleaned_range == "30d":
                return cleaned_range, "Last 30 Days", now - timedelta(days=30), now
            elif cleaned_range == "1y":
                return cleaned_range, "Last 1 Year", now - timedelta(days=365), now
            elif cleaned_range == "all":
                return cleaned_range, "All Time", None, None

    resolved_period = validate_and_resolve_period(period)
    label = get_jalali_period_label(resolved_period)
    return resolved_period, label, None, None


def build_transaction_filters(
    user_id: uuid.UUID,
    period_key: str,
    start_dt: Optional[datetime],
    end_dt: Optional[datetime],
):
    conds = [Transaction.user_id == user_id]
    if period_key in VALID_RANGES:
        if start_dt is not None:
            conds.append(Transaction.transaction_date >= start_dt)
        if end_dt is not None:
            conds.append(Transaction.transaction_date <= end_dt)
    else:
        conds.append(Transaction.j_period == period_key)
    return conds


# ------------------------------------------------------------------------------
# 1. GET /api/analytics/periods
# ------------------------------------------------------------------------------
@router.get(
    "/periods",
    response_model=PeriodsResponse,
    summary="List historical and active Jalali periods",
    description="Returns all distinct Jalali periods present in the user's transactions plus the current active period, sorted descending.",
)
async def get_periods(
    current_user: CurrentUserDep,
    db: SessionDep,
) -> PeriodsResponse:
    current_period = get_current_jalali_period()

    stmt = (
        select(Transaction.j_period)
        .where(Transaction.user_id == current_user.id)
        .distinct()
    )
    result = await db.execute(stmt)
    existing_periods = set(result.scalars().all())
    existing_periods.add(current_period)

    # Sort descending by period string
    sorted_periods = sorted(list(existing_periods), reverse=True)

    items = []
    for p in sorted_periods:
        try:
            year, month = parse_jalali_period(p)
            label = get_jalali_period_label(p)
            items.append(
                PeriodItem(
                    period=p,
                    label=label,
                    is_current=(p == current_period),
                    year=year,
                    month=month,
                )
            )
        except ValueError:
            continue

    return PeriodsResponse(
        periods=items,
        current_period=current_period,
    )


# ------------------------------------------------------------------------------
# 2. GET /api/analytics/overview
# ------------------------------------------------------------------------------
@router.get(
    "/overview",
    response_model=OverviewAnalyticsResponse,
    summary="Financial health overview and liquidity runway",
    description="Aggregates monthly/range inflows, outflows, savings rate, consolidated liquidity across accounts, and calculates daily burn rate and runway.",
)
async def get_overview(
    current_user: CurrentUserDep,
    db: SessionDep,
    period: Optional[str] = Query(None, description="Jalali period (e.g. '1405-07')"),
    range: Optional[str] = Query(None, description="Time range: '7d', '30d', '1y', 'all'"),
) -> OverviewAnalyticsResponse:
    period_key, period_label, start_dt, end_dt = resolve_time_scope(period, range)
    tx_filters = build_transaction_filters(current_user.id, period_key, start_dt, end_dt)

    # Inflow and Outflow sums
    income_stmt = select(func.coalesce(func.sum(Transaction.amount), Decimal("0.00"))).where(
        *tx_filters,
        Transaction.type == "income",
    )
    total_income: Decimal = (await db.execute(income_stmt)).scalar() or Decimal("0.00")

    expense_stmt = select(func.coalesce(func.sum(Transaction.amount), Decimal("0.00"))).where(
        *tx_filters,
        Transaction.type == "expense",
    )
    total_expense: Decimal = (await db.execute(expense_stmt)).scalar() or Decimal("0.00")

    net_savings = total_income - total_expense

    # Savings rate %: ((income - expense) / income) * 100
    if total_income > Decimal("0.00"):
        raw_savings_rate = float((net_savings / total_income) * 100)
        savings_rate_percentage = max(0.0, round(raw_savings_rate, 2))
    else:
        savings_rate_percentage = 0.0

    # Total liquidity across user accounts
    liquidity_stmt = select(func.coalesce(func.sum(Account.current_balance), Decimal("0.00"))).where(
        Account.user_id == current_user.id
    )
    total_liquidity: Decimal = (await db.execute(liquidity_stmt)).scalar() or Decimal("0.00")

    # Calendar pacing & runway
    if period_key in VALID_RANGES:
        if period_key == "7d":
            total_days = 7
            days_elapsed = 7
        elif period_key == "30d":
            total_days = 30
            days_elapsed = 30
        elif period_key == "1y":
            total_days = 365
            days_elapsed = 365
        else:  # "all"
            min_date_stmt = select(func.min(Transaction.transaction_date)).where(
                Transaction.user_id == current_user.id
            )
            min_date = (await db.execute(min_date_stmt)).scalar()
            if min_date:
                now_utc = datetime.now(timezone.utc)
                if min_date.tzinfo is None:
                    min_date = min_date.replace(tzinfo=timezone.utc)
                span = max(1, (now_utc - min_date).days)
                total_days = span
                days_elapsed = span
            else:
                total_days = 1
                days_elapsed = 1
    else:
        year, month = parse_jalali_period(period_key)
        total_days = get_days_in_jalali_month(year, month)
        days_elapsed = get_elapsed_days_in_period(year, month)

    if days_elapsed > 0 and total_expense > Decimal("0.00"):
        daily_burn_rate = round(total_expense / Decimal(days_elapsed), 2)
    else:
        daily_burn_rate = Decimal("0.00")

    if daily_burn_rate > Decimal("0.00") and total_liquidity > Decimal("0.00"):
        runway_days = round(float(total_liquidity / daily_burn_rate), 1)
    elif total_liquidity <= Decimal("0.00"):
        runway_days = 0.0
    else:
        runway_days = 999.0  # Zero burn rate or indefinite runway

    return OverviewAnalyticsResponse(
        period=period_key,
        period_label=period_label,
        total_income=total_income,
        total_expense=total_expense,
        net_savings=net_savings,
        savings_rate_percentage=savings_rate_percentage,
        total_liquidity=total_liquidity,
        daily_burn_rate=daily_burn_rate,
        runway_days=min(runway_days, 999.0),
        days_elapsed=days_elapsed,
        total_days=total_days,
        currency_symbol=current_user.currency_symbol or settings.DEFAULT_CURRENCY_SYMBOL,
    )


# ------------------------------------------------------------------------------
# 3. GET /api/analytics/sankey
# ------------------------------------------------------------------------------
@router.get(
    "/sankey",
    response_model=SankeyResponse,
    summary="Apache ECharts Sankey flow diagram",
    description="Structures cash flow from specific income sources into an intermediary pool and distributes into categorized expenditures and retained savings.",
)
async def get_sankey(
    current_user: CurrentUserDep,
    db: SessionDep,
    period: Optional[str] = Query(None, description="Jalali period (e.g. '1405-07')"),
    range: Optional[str] = Query(None, description="Time range: '7d', '30d', '1y', 'all'"),
) -> SankeyResponse:
    period_key, _, start_dt, end_dt = resolve_time_scope(period, range)
    tx_filters = build_transaction_filters(current_user.id, period_key, start_dt, end_dt)
    pool_node_name = "Total Inflow Pool"

    # 1. Income sources grouped by category
    income_stmt = (
        select(
            Category.name,
            Category.color_hex,
            func.sum(Transaction.amount).label("total"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            *tx_filters,
            Transaction.type == "income",
        )
        .group_by(Category.name, Category.color_hex)
    )
    income_rows = (await db.execute(income_stmt)).all()

    # 2. Expense targets grouped by category
    expense_stmt = (
        select(
            Category.name,
            Category.color_hex,
            func.sum(Transaction.amount).label("total"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            *tx_filters,
            Transaction.type == "expense",
        )
        .group_by(Category.name, Category.color_hex)
    )
    expense_rows = (await db.execute(expense_stmt)).all()

    total_inflow = sum((row.total for row in income_rows), Decimal("0.00"))
    total_outflow = sum((row.total for row in expense_rows), Decimal("0.00"))
    net_savings = total_inflow - total_outflow

    nodes: List[SankeyNode] = []
    links: List[SankeyLink] = []
    registered_node_names = set()

    def add_node(name: str, color: Optional[str] = None) -> None:
        if name not in registered_node_names:
            node = SankeyNode(
                name=name,
                itemStyle={"color": color} if color else None,
            )
            nodes.append(node)
            registered_node_names.add(name)

    # Add central pool node
    add_node(pool_node_name, "#3B82F6")

    # Inflows -> Pool
    for row in income_rows:
        source_name = f"{row.name} (Inflow)"
        add_node(source_name, row.color_hex)
        links.append(
            SankeyLink(
                source=source_name,
                target=pool_node_name,
                value=float(row.total),
            )
        )

    # Pool -> Outflows
    for row in expense_rows:
        target_name = f"{row.name}"
        add_node(target_name, row.color_hex)
        links.append(
            SankeyLink(
                source=pool_node_name,
                target=target_name,
                value=float(row.total),
            )
        )

    # Balance flows: Retained Savings or Capital Drawdown
    if net_savings > Decimal("0.00"):
        retained_node = "Retained Savings"
        add_node(retained_node, "#10B981")
        links.append(
            SankeyLink(
                source=pool_node_name,
                target=retained_node,
                value=float(net_savings),
            )
        )
    elif net_savings < Decimal("0.00"):
        drawdown_node = "Capital Drawdown"
        add_node(drawdown_node, "#EF4444")
        links.append(
            SankeyLink(
                source=drawdown_node,
                target=pool_node_name,
                value=float(abs(net_savings)),
            )
        )

    return SankeyResponse(
        period=period_key,
        nodes=nodes,
        links=links,
        total_inflow=total_inflow,
        total_outflow=total_outflow,
    )


# ------------------------------------------------------------------------------
# 4. GET /api/analytics/heatmap
# ------------------------------------------------------------------------------
@router.get(
    "/heatmap",
    response_model=HeatmapResponse,
    summary="Monthly spending calendar heatmap",
    description="Returns daily expenditure volumes across calendar days of the given Jalali month or dynamic time range.",
)
async def get_heatmap(
    current_user: CurrentUserDep,
    db: SessionDep,
    period: Optional[str] = Query(None, description="Jalali period (e.g. '1405-07')"),
    range: Optional[str] = Query(None, description="Time range: '7d', '30d', '1y', 'all'"),
) -> HeatmapResponse:
    period_key, period_label, start_dt, end_dt = resolve_time_scope(period, range)

    days_list: List[HeatmapDayItem] = []
    max_spend = Decimal("0.00")

    if period_key in VALID_RANGES:
        now_utc = datetime.now(timezone.utc)
        if period_key == "7d":
            total_days = 7
            date_list = [(now_utc - timedelta(days=7 - i)).date() for i in range(1, 8)]
        elif period_key == "30d":
            total_days = 30
            date_list = [(now_utc - timedelta(days=30 - i)).date() for i in range(1, 31)]
        elif period_key == "1y":
            # 12 Jalali months of the year
            total_days = 12
            stmt = (
                select(
                    Transaction.j_month,
                    func.sum(Transaction.amount).label("daily_spend"),
                    func.count(Transaction.id).label("tx_count"),
                )
                .where(
                    Transaction.user_id == current_user.id,
                    Transaction.transaction_date >= start_dt,
                    Transaction.transaction_date <= end_dt,
                    Transaction.type == "expense",
                )
                .group_by(Transaction.j_month)
            )
            rows = (await db.execute(stmt)).all()
            month_spend_map = {row.j_month: (row.daily_spend, row.tx_count) for row in rows}
            for m in range(1, 13):
                spend, count = month_spend_map.get(m, (Decimal("0.00"), 0))
                if spend > max_spend:
                    max_spend = spend
                days_list.append(
                    HeatmapDayItem(
                        day=m,
                        date_label=get_jalali_month_name(m),
                        amount=spend,
                        transaction_count=count,
                    )
                )
            return HeatmapResponse(
                period=period_key,
                period_label=period_label,
                total_days=total_days,
                days=days_list,
                max_daily_spend=max_spend,
            )
        else:  # "all"
            total_days = 30
            date_list = [(now_utc - timedelta(days=30 - i)).date() for i in range(1, 31)]

        # For 7d, 30d, all:
        first_date = date_list[0]
        start_date_bound = datetime.combine(first_date, datetime.min.time(), tzinfo=timezone.utc)
        stmt = (
            select(
                func.date(Transaction.transaction_date).label("tx_date"),
                func.sum(Transaction.amount).label("daily_spend"),
                func.count(Transaction.id).label("tx_count"),
            )
            .where(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                Transaction.transaction_date >= start_date_bound,
            )
            .group_by(func.date(Transaction.transaction_date))
        )
        rows = (await db.execute(stmt)).all()
        date_spend_map = {row.tx_date: (row.daily_spend, row.tx_count) for row in rows}

        for idx, d_date in enumerate(date_list):
            spend, count = date_spend_map.get(d_date, (Decimal("0.00"), 0))
            if spend > max_spend:
                max_spend = spend
            dt_repr = datetime.combine(d_date, datetime.min.time())
            _, jm, jd, _ = to_jalali_components(dt_repr)
            days_list.append(
                HeatmapDayItem(
                    day=idx + 1,
                    date_label=f"{get_jalali_month_name(jm)} {jd}",
                    amount=spend,
                    transaction_count=count,
                )
            )

        return HeatmapResponse(
            period=period_key,
            period_label=period_label,
            total_days=total_days,
            days=days_list,
            max_daily_spend=max_spend,
        )

    else:
        # Default Jalali month behavior
        year, month = parse_jalali_period(period_key)
        month_name = get_jalali_month_name(month)
        total_days = get_days_in_jalali_month(year, month)

        stmt = (
            select(
                Transaction.j_day,
                func.sum(Transaction.amount).label("daily_spend"),
                func.count(Transaction.id).label("tx_count"),
            )
            .where(
                Transaction.user_id == current_user.id,
                Transaction.j_period == period_key,
                Transaction.type == "expense",
            )
            .group_by(Transaction.j_day)
        )
        rows = (await db.execute(stmt)).all()
        day_spend_map: Dict[int, tuple[Decimal, int]] = {
            row.j_day: (row.daily_spend, row.tx_count) for row in rows
        }

        for d in range(1, total_days + 1):
            spend, count = day_spend_map.get(d, (Decimal("0.00"), 0))
            if spend > max_spend:
                max_spend = spend
            days_list.append(
                HeatmapDayItem(
                    day=d,
                    date_label=f"{month_name} {d}",
                    amount=spend,
                    transaction_count=count,
                )
            )

        return HeatmapResponse(
            period=period_key,
            period_label=period_label,
            total_days=total_days,
            days=days_list,
            max_daily_spend=max_spend,
        )


# ------------------------------------------------------------------------------
# 5. GET /api/analytics/cumulative-burn
# ------------------------------------------------------------------------------
@router.get(
    "/cumulative-burn",
    response_model=CumulativeBurnResponse,
    summary="Cumulative spend vs income progression & crossover detection",
    description="Tracks progressive running totals for income and expense to detect if and when spending eclipsed income.",
)
async def get_cumulative_burn(
    current_user: CurrentUserDep,
    db: SessionDep,
    period: Optional[str] = Query(None, description="Jalali period (e.g. '1405-07')"),
    range: Optional[str] = Query(None, description="Time range: '7d', '30d', '1y', 'all'"),
) -> CumulativeBurnResponse:
    period_key, period_label, start_dt, end_dt = resolve_time_scope(period, range)

    days_data: List[CumulativeBurnDay] = []
    running_income = Decimal("0.00")
    running_expense = Decimal("0.00")
    crossover_occurred = False
    crossover_day: Optional[int] = None

    if period_key in VALID_RANGES:
        now_utc = datetime.now(timezone.utc)
        if period_key == "7d":
            date_list = [(now_utc - timedelta(days=7 - i)).date() for i in range(1, 8)]
        elif period_key == "30d":
            date_list = [(now_utc - timedelta(days=30 - i)).date() for i in range(1, 31)]
        elif period_key == "1y":
            # 12 Jalali months of the year
            stmt = (
                select(
                    Transaction.j_month,
                    Transaction.type,
                    func.sum(Transaction.amount).label("total"),
                )
                .where(
                    Transaction.user_id == current_user.id,
                    Transaction.transaction_date >= start_dt,
                    Transaction.transaction_date <= end_dt,
                )
                .group_by(Transaction.j_month, Transaction.type)
            )
            rows = (await db.execute(stmt)).all()
            inc_map = {}
            exp_map = {}
            for r in rows:
                if r.type == "income":
                    inc_map[r.j_month] = r.total
                elif r.type == "expense":
                    exp_map[r.j_month] = r.total

            for m in range(1, 13):
                m_inc = inc_map.get(m, Decimal("0.00"))
                m_exp = exp_map.get(m, Decimal("0.00"))
                running_income += m_inc
                running_expense += m_exp
                if running_expense > running_income and not crossover_occurred and running_expense > Decimal("0.00"):
                    crossover_occurred = True
                    crossover_day = m

                days_data.append(
                    CumulativeBurnDay(
                        day=m,
                        date_label=get_jalali_month_name(m),
                        daily_income=m_inc,
                        daily_expense=m_exp,
                        cumulative_income=running_income,
                        cumulative_expense=running_expense,
                    )
                )
            return CumulativeBurnResponse(
                period=period_key,
                period_label=period_label,
                days=days_data,
                crossover_occurred=crossover_occurred,
                crossover_day=crossover_day,
            )
        else:  # "all"
            # Distinct periods across all transactions
            periods_stmt = (
                select(Transaction.j_period)
                .where(Transaction.user_id == current_user.id)
                .distinct()
                .order_by(Transaction.j_period.asc())
            )
            all_j_periods = (await db.execute(periods_stmt)).scalars().all()
            if not all_j_periods:
                all_j_periods = [get_current_jalali_period()]

            stmt = (
                select(
                    Transaction.j_period,
                    Transaction.type,
                    func.sum(Transaction.amount).label("total"),
                )
                .where(Transaction.user_id == current_user.id)
                .group_by(Transaction.j_period, Transaction.type)
            )
            rows = (await db.execute(stmt)).all()
            inc_map = {}
            exp_map = {}
            for r in rows:
                if r.type == "income":
                    inc_map[r.j_period] = r.total
                elif r.type == "expense":
                    exp_map[r.j_period] = r.total

            for idx, p in enumerate(all_j_periods):
                p_inc = inc_map.get(p, Decimal("0.00"))
                p_exp = exp_map.get(p, Decimal("0.00"))
                running_income += p_inc
                running_expense += p_exp
                if running_expense > running_income and not crossover_occurred and running_expense > Decimal("0.00"):
                    crossover_occurred = True
                    crossover_day = idx + 1

                days_data.append(
                    CumulativeBurnDay(
                        day=idx + 1,
                        date_label=get_jalali_period_label(p),
                        daily_income=p_inc,
                        daily_expense=p_exp,
                        cumulative_income=running_income,
                        cumulative_expense=running_expense,
                    )
                )

            return CumulativeBurnResponse(
                period=period_key,
                period_label=period_label,
                days=days_data,
                crossover_occurred=crossover_occurred,
                crossover_day=crossover_day,
            )

        # For 7d and 30d:
        first_date = date_list[0]
        start_date_bound = datetime.combine(first_date, datetime.min.time(), tzinfo=timezone.utc)
        stmt = (
            select(
                func.date(Transaction.transaction_date).label("tx_date"),
                Transaction.type,
                func.sum(Transaction.amount).label("total"),
            )
            .where(
                Transaction.user_id == current_user.id,
                Transaction.transaction_date >= start_date_bound,
            )
            .group_by(func.date(Transaction.transaction_date), Transaction.type)
        )
        rows = (await db.execute(stmt)).all()
        inc_map = {}
        exp_map = {}
        for r in rows:
            if r.type == "income":
                inc_map[r.tx_date] = r.total
            elif r.type == "expense":
                exp_map[r.tx_date] = r.total

        for idx, d_date in enumerate(date_list):
            d_inc = inc_map.get(d_date, Decimal("0.00"))
            d_exp = exp_map.get(d_date, Decimal("0.00"))
            running_income += d_inc
            running_expense += d_exp
            if running_expense > running_income and not crossover_occurred and running_expense > Decimal("0.00"):
                crossover_occurred = True
                crossover_day = idx + 1

            dt_repr = datetime.combine(d_date, datetime.min.time())
            _, jm, jd, _ = to_jalali_components(dt_repr)
            days_data.append(
                CumulativeBurnDay(
                    day=idx + 1,
                    date_label=f"{get_jalali_month_name(jm)} {jd}",
                    daily_income=d_inc,
                    daily_expense=d_exp,
                    cumulative_income=running_income,
                    cumulative_expense=running_expense,
                )
            )

        return CumulativeBurnResponse(
            period=period_key,
            period_label=period_label,
            days=days_data,
            crossover_occurred=crossover_occurred,
            crossover_day=crossover_day,
        )

    else:
        # Default Jalali month behavior
        year, month = parse_jalali_period(period_key)
        month_name = get_jalali_month_name(month)
        total_days = get_days_in_jalali_month(year, month)

        # Incomes grouped by day
        income_stmt = (
            select(
                Transaction.j_day,
                func.sum(Transaction.amount).label("daily_income"),
            )
            .where(
                Transaction.user_id == current_user.id,
                Transaction.j_period == period_key,
                Transaction.type == "income",
            )
            .group_by(Transaction.j_day)
        )
        income_map: Dict[int, Decimal] = {
            row.j_day: row.daily_income for row in (await db.execute(income_stmt)).all()
        }

        # Expenses grouped by day
        expense_stmt = (
            select(
                Transaction.j_day,
                func.sum(Transaction.amount).label("daily_expense"),
            )
            .where(
                Transaction.user_id == current_user.id,
                Transaction.j_period == period_key,
                Transaction.type == "expense",
            )
            .group_by(Transaction.j_day)
        )
        expense_map: Dict[int, Decimal] = {
            row.j_day: row.daily_expense for row in (await db.execute(expense_stmt)).all()
        }

        for d in range(1, total_days + 1):
            d_income = income_map.get(d, Decimal("0.00"))
            d_expense = expense_map.get(d, Decimal("0.00"))

            running_income += d_income
            running_expense += d_expense

            # Check for crossover where cumulative expense exceeds cumulative income
            if running_expense > running_income and not crossover_occurred and running_expense > Decimal("0.00"):
                crossover_occurred = True
                crossover_day = d

            days_data.append(
                CumulativeBurnDay(
                    day=d,
                    date_label=f"{month_name} {d}",
                    daily_income=d_income,
                    daily_expense=d_expense,
                    cumulative_income=running_income,
                    cumulative_expense=running_expense,
                )
            )

        return CumulativeBurnResponse(
            period=period_key,
            period_label=period_label,
            days=days_data,
            crossover_occurred=crossover_occurred,
            crossover_day=crossover_day,
        )


# ------------------------------------------------------------------------------
# 6. GET /api/analytics/category-breakdown
# ------------------------------------------------------------------------------
@router.get(
    "/category-breakdown",
    response_model=CategoryBreakdownResponse,
    summary="Categorical spend breakdown with percentages",
    description="Groups expenses by category and calculates proportional distribution of total spend.",
)
async def get_category_breakdown(
    current_user: CurrentUserDep,
    db: SessionDep,
    period: Optional[str] = Query(None, description="Jalali period (e.g. '1405-07')"),
    range: Optional[str] = Query(None, description="Time range: '7d', '30d', '1y', 'all'"),
) -> CategoryBreakdownResponse:
    period_key, _, start_dt, end_dt = resolve_time_scope(period, range)
    tx_filters = build_transaction_filters(current_user.id, period_key, start_dt, end_dt)

    stmt = (
        select(
            Category.id,
            Category.name,
            Category.icon,
            Category.color_hex,
            func.sum(Transaction.amount).label("total_amount"),
            func.count(Transaction.id).label("tx_count"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            *tx_filters,
            Transaction.type == "expense",
        )
        .group_by(Category.id, Category.name, Category.icon, Category.color_hex)
        .order_by(func.sum(Transaction.amount).desc())
    )
    rows = (await db.execute(stmt)).all()
    total_spend = sum((row.total_amount for row in rows), Decimal("0.00"))

    breakdown_items = []
    for r in rows:
        percentage = (
            round(float((r.total_amount / total_spend) * 100), 2)
            if total_spend > Decimal("0.00")
            else 0.0
        )
        breakdown_items.append(
            CategoryBreakdownItem(
                category_id=r.id,
                category_name=r.name,
                category_icon=r.icon,
                color_hex=r.color_hex,
                total_amount=r.total_amount,
                percentage=percentage,
                transaction_count=r.tx_count,
            )
        )

    return CategoryBreakdownResponse(
        period=period_key,
        total_spend=total_spend,
        breakdown=breakdown_items,
    )


# ------------------------------------------------------------------------------
# 7. GET /api/analytics/top-expenses
# ------------------------------------------------------------------------------
@router.get(
    "/top-expenses",
    response_model=TopExpensesResponse,
    summary="Outlier detection: Top single expenditures",
    description="Identifies the largest individual expense entries in the period for rapid anomaly detection.",
)
async def get_top_expenses(
    current_user: CurrentUserDep,
    db: SessionDep,
    period: Optional[str] = Query(None, description="Jalali period (e.g. '1405-07')"),
    range: Optional[str] = Query(None, description="Time range: '7d', '30d', '1y', 'all'"),
    limit: int = Query(5, ge=1, le=50, description="Number of entries to return"),
) -> TopExpensesResponse:
    period_key, _, start_dt, end_dt = resolve_time_scope(period, range)
    tx_filters = build_transaction_filters(current_user.id, period_key, start_dt, end_dt)

    stmt = (
        select(Transaction)
        .options(
            selectinload(Transaction.category),
            selectinload(Transaction.account),
        )
        .where(
            *tx_filters,
            Transaction.type == "expense",
        )
        .order_by(Transaction.amount.desc(), Transaction.transaction_date.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    items = []
    for tx in records:
        items.append(
            TopExpenseItem(
                id=tx.id,
                amount=tx.amount,
                description=tx.description,
                transaction_date=tx.transaction_date,
                day=tx.j_day,
                account_name=tx.account.name if tx.account else "Unknown Wallet",
                category_name=tx.category.name if tx.category else "Uncategorized",
                category_icon=tx.category.icon if tx.category else "circle-dollar-sign",
                color_hex=tx.category.color_hex if tx.category else "#64748B",
            )
        )

    return TopExpensesResponse(
        period=period_key,
        limit=limit,
        expenses=items,
    )
