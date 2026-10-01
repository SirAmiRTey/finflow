from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.core.jalali import to_jalali_components
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a new transaction",
    description="Atomically inserts transaction and updates account balance in a single database transaction. Automatically computes Jalali calendar fields.",
)
async def create_transaction(
    payload: TransactionCreate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> TransactionResponse:
    # 1. Fetch account with row-level lock and verify ownership
    acc_stmt = (
        select(Account)
        .where(
            Account.id == payload.account_id,
            Account.user_id == current_user.id,
        )
        .with_for_update()
    )
    acc_result = await db.execute(acc_stmt)
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or does not belong to the authenticated user.",
        )

    # 2. Fetch category and verify accessibility (system or user-owned)
    cat_stmt = select(Category).where(
        Category.id == payload.category_id,
        or_(
            Category.is_system == True,  # noqa: E712
            Category.user_id == current_user.id,
        ),
    )
    cat_result = await db.execute(cat_stmt)
    category = cat_result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or inaccessible.",
        )

    # 3. Determine transaction datetime and compute Jalali calendar components
    tx_datetime = payload.transaction_date or datetime.now(timezone.utc)
    if tx_datetime.tzinfo is None:
        tx_datetime = tx_datetime.replace(tzinfo=timezone.utc)

    j_year, j_month, j_day, j_period = to_jalali_components(tx_datetime)
    amount = Decimal(str(payload.amount))

    # 4. Atomic balance mutation
    if payload.type == "expense":
        account.current_balance -= amount
    elif payload.type == "income":
        account.current_balance += amount

    # 5. Create transaction entity
    transaction = Transaction(
        user_id=current_user.id,
        account_id=payload.account_id,
        category_id=payload.category_id,
        type=payload.type,
        amount=amount,
        description=payload.description.strip() if payload.description else None,
        transaction_date=tx_datetime,
        j_year=j_year,
        j_month=j_month,
        j_day=j_day,
        j_period=j_period,
    )
    db.add(transaction)

    # Commit both balance change and transaction record atomically
    await db.commit()

    # Re-fetch with eager loaded relationships
    stmt = (
        select(Transaction)
        .options(
            selectinload(Transaction.category),
            selectinload(Transaction.account),
        )
        .where(Transaction.id == transaction.id)
    )
    res = await db.execute(stmt)
    persisted_tx = res.scalar_one()

    return TransactionResponse.model_validate(persisted_tx)


@router.get(
    "",
    response_model=TransactionListResponse,
    summary="List and filter transactions",
    description="Retrieves paginated transactions with optional filtering by Jalali period, type, category, account, and description search.",
)
async def list_transactions(
    current_user: CurrentUserDep,
    db: SessionDep,
    period: Optional[str] = Query(None, description="Jalali period filter (e.g. '1405-07')"),
    type: Optional[Literal["income", "expense"]] = Query(None, description="Filter by type"),
    category_id: Optional[UUID] = Query(None, description="Filter by category ID"),
    account_id: Optional[UUID] = Query(None, description="Filter by account ID"),
    search: Optional[str] = Query(None, description="Search description text"),
    limit: int = Query(50, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
) -> TransactionListResponse:
    base_conditions = [Transaction.user_id == current_user.id]

    if period:
        base_conditions.append(Transaction.j_period == period.strip())
    if type:
        base_conditions.append(Transaction.type == type)
    if category_id:
        base_conditions.append(Transaction.category_id == category_id)
    if account_id:
        base_conditions.append(Transaction.account_id == account_id)
    if search:
        search_term = f"%{search.strip()}%"
        base_conditions.append(Transaction.description.ilike(search_term))

    # Total count query
    count_stmt = select(func.count(Transaction.id)).where(*base_conditions)
    total_count = (await db.execute(count_stmt)).scalar() or 0

    # Inflow / outflow totals for the filtered subset
    income_stmt = select(func.coalesce(func.sum(Transaction.amount), Decimal("0.00"))).where(
        *base_conditions, Transaction.type == "income"
    )
    total_income = (await db.execute(income_stmt)).scalar() or Decimal("0.00")

    expense_stmt = select(func.coalesce(func.sum(Transaction.amount), Decimal("0.00"))).where(
        *base_conditions, Transaction.type == "expense"
    )
    total_expense = (await db.execute(expense_stmt)).scalar() or Decimal("0.00")

    # Item query with joins and pagination
    query = (
        select(Transaction)
        .options(
            selectinload(Transaction.category),
            selectinload(Transaction.account),
        )
        .where(*base_conditions)
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    transactions = result.scalars().all()

    return TransactionListResponse(
        items=[TransactionResponse.model_validate(tx) for tx in transactions],
        total=total_count,
        limit=limit,
        offset=offset,
        period=period,
        total_income=total_income,
        total_expense=total_expense,
    )


@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse,
    summary="Get single transaction details",
)
async def get_transaction(
    transaction_id: UUID,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> TransactionResponse:
    stmt = (
        select(Transaction)
        .options(
            selectinload(Transaction.category),
            selectinload(Transaction.account),
        )
        .where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
    )
    result = await db.execute(stmt)
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )
    return TransactionResponse.model_validate(tx)


@router.patch(
    "/{transaction_id}",
    response_model=TransactionResponse,
    summary="Update a transaction and reconcile account balances",
    description="Updates transaction fields and atomically reconciles balance discrepancies across accounts.",
)
async def update_transaction(
    transaction_id: UUID,
    payload: TransactionUpdate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> TransactionResponse:
    # 1. Fetch transaction
    stmt = (
        select(Transaction)
        .where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .with_for_update()
    )
    res = await db.execute(stmt)
    tx = res.scalar_one_or_none()
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    # 2. Identify target accounts
    target_account_id = payload.account_id if payload.account_id is not None else tx.account_id

    # Validate target category if modified
    if payload.category_id is not None and payload.category_id != tx.category_id:
        cat_stmt = select(Category).where(
            Category.id == payload.category_id,
            or_(
                Category.is_system == True,  # noqa: E712
                Category.user_id == current_user.id,
            ),
        )
        cat = (await db.execute(cat_stmt)).scalar_one_or_none()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target category not found or inaccessible.",
            )
        tx.category_id = payload.category_id

    # 3. Handle balance reconciliation
    target_type = payload.type if payload.type is not None else tx.type
    target_amount = Decimal(str(payload.amount)) if payload.amount is not None else tx.amount

    if target_account_id == tx.account_id:
        # Same account reconciliation
        acc_stmt = (
            select(Account)
            .where(Account.id == tx.account_id, Account.user_id == current_user.id)
            .with_for_update()
        )
        account = (await db.execute(acc_stmt)).scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

        # Revert old balance mutation
        if tx.type == "expense":
            account.current_balance += tx.amount
        elif tx.type == "income":
            account.current_balance -= tx.amount

        # Apply new balance mutation
        if target_type == "expense":
            account.current_balance -= target_amount
        elif target_type == "income":
            account.current_balance += target_amount
    else:
        # Cross-account transfer reconciliation
        old_acc_stmt = (
            select(Account)
            .where(Account.id == tx.account_id, Account.user_id == current_user.id)
            .with_for_update()
        )
        old_account = (await db.execute(old_acc_stmt)).scalar_one_or_none()

        new_acc_stmt = (
            select(Account)
            .where(Account.id == target_account_id, Account.user_id == current_user.id)
            .with_for_update()
        )
        new_account = (await db.execute(new_acc_stmt)).scalar_one_or_none()

        if not old_account or not new_account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

        # Revert on old account
        if tx.type == "expense":
            old_account.current_balance += tx.amount
        elif tx.type == "income":
            old_account.current_balance -= tx.amount

        # Apply on new account
        if target_type == "expense":
            new_account.current_balance -= target_amount
        elif target_type == "income":
            new_account.current_balance += target_amount

        tx.account_id = target_account_id

    # 4. Update transaction attributes
    tx.type = target_type
    tx.amount = target_amount

    if payload.description is not None:
        tx.description = payload.description.strip() if payload.description else None

    if payload.transaction_date is not None:
        new_dt = payload.transaction_date
        if new_dt.tzinfo is None:
            new_dt = new_dt.replace(tzinfo=timezone.utc)
        tx.transaction_date = new_dt
        j_year, j_month, j_day, j_period = to_jalali_components(new_dt)
        tx.j_year = j_year
        tx.j_month = j_month
        tx.j_day = j_day
        tx.j_period = j_period

    await db.commit()

    # Re-fetch with eager loaded relationships
    refetch_stmt = (
        select(Transaction)
        .options(
            selectinload(Transaction.category),
            selectinload(Transaction.account),
        )
        .where(Transaction.id == tx.id)
    )
    updated_tx = (await db.execute(refetch_stmt)).scalar_one()
    return TransactionResponse.model_validate(updated_tx)


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete transaction and revert account balance",
    description="Deletes transaction and atomically reverses its effect on the account balance.",
)
async def delete_transaction(
    transaction_id: UUID,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> None:
    # 1. Fetch transaction
    stmt = (
        select(Transaction)
        .where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .with_for_update()
    )
    res = await db.execute(stmt)
    tx = res.scalar_one_or_none()
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    # 2. Lock account and reverse balance
    acc_stmt = (
        select(Account)
        .where(Account.id == tx.account_id, Account.user_id == current_user.id)
        .with_for_update()
    )
    account = (await db.execute(acc_stmt)).scalar_one_or_none()
    if account:
        if tx.type == "expense":
            account.current_balance += tx.amount
        elif tx.type == "income":
            account.current_balance -= tx.amount

    # 3. Delete transaction record
    await db.delete(tx)
    await db.commit()
