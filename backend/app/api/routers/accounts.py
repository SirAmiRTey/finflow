from decimal import Decimal
from typing import List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, update

from app.api.deps import CurrentUserDep, SessionDep
from app.models.account import Account
from app.schemas.account import (
    AccountBalanceUpdate,
    AccountCreate,
    AccountResponse,
    AccountUpdate,
)

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get(
    "",
    response_model=List[AccountResponse],
    summary="List all user accounts",
    description="Retrieves all financial accounts owned by the authenticated user.",
)
async def list_accounts(
    current_user: CurrentUserDep,
    db: SessionDep,
) -> List[AccountResponse]:
    stmt = (
        select(Account)
        .where(Account.user_id == current_user.id)
        .order_by(Account.is_default.desc(), Account.created_at)
    )
    result = await db.execute(stmt)
    accounts = result.scalars().all()
    return [AccountResponse.model_validate(acc) for acc in accounts]


@router.post(
    "",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new account",
    description="Creates a new account for the authenticated user. If marked as default, clears default status on other accounts.",
)
async def create_account(
    payload: AccountCreate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> AccountResponse:
    # If this account should be default, unset existing default accounts
    if payload.is_default:
        await db.execute(
            update(Account)
            .where(Account.user_id == current_user.id)
            .values(is_default=False)
        )

    initial_bal = Decimal(str(payload.initial_balance))
    new_account = Account(
        user_id=current_user.id,
        name=payload.name.strip(),
        initial_balance=initial_bal,
        current_balance=initial_bal,
        is_default=payload.is_default,
    )
    db.add(new_account)
    await db.commit()
    await db.refresh(new_account)
    return AccountResponse.model_validate(new_account)


@router.get(
    "/{account_id}",
    response_model=AccountResponse,
    summary="Get account details",
    description="Retrieves details of a specific account belonging to the authenticated user.",
)
async def get_account(
    account_id: UUID,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> AccountResponse:
    stmt = select(Account).where(
        Account.id == account_id,
        Account.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    return AccountResponse.model_validate(account)


@router.patch(
    "/{account_id}",
    response_model=AccountResponse,
    summary="Update account properties",
    description="Updates account name and default status.",
)
async def update_account(
    account_id: UUID,
    payload: AccountUpdate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> AccountResponse:
    stmt = select(Account).where(
        Account.id == account_id,
        Account.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    if payload.is_default is True and not account.is_default:
        # Clear default flag on all other user accounts
        await db.execute(
            update(Account)
            .where(Account.user_id == current_user.id)
            .values(is_default=False)
        )
        account.is_default = True
    elif payload.is_default is False and account.is_default:
        account.is_default = False

    if payload.name is not None:
        account.name = payload.name.strip()

    await db.commit()
    await db.refresh(account)
    return AccountResponse.model_validate(account)


@router.post(
    "/{account_id}/balance",
    response_model=AccountResponse,
    summary="Adjust account balance",
    description="Directly updates the current balance of an account in k-Toman.",
)
async def adjust_account_balance(
    account_id: UUID,
    payload: AccountBalanceUpdate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> AccountResponse:
    stmt = select(Account).where(
        Account.id == account_id,
        Account.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    account.current_balance = Decimal(str(payload.current_balance))
    await db.commit()
    await db.refresh(account)
    return AccountResponse.model_validate(account)


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete account",
    description="Deletes an account if the user has more than one account remaining.",
)
async def delete_account(
    account_id: UUID,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> None:
    # Check total accounts count
    count_stmt = select(Account).where(Account.user_id == current_user.id)
    count_result = await db.execute(count_stmt)
    user_accounts = count_result.scalars().all()

    if len(user_accounts) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the only remaining account. At least one account is required.",
        )

    account_to_delete = next((a for a in user_accounts if a.id == account_id), None)
    if not account_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    was_default = account_to_delete.is_default
    await db.delete(account_to_delete)

    # If the deleted account was default, set another account as default
    if was_default:
        remaining = [a for a in user_accounts if a.id != account_id]
        if remaining:
            remaining[0].is_default = True

    await db.commit()
