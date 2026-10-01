from decimal import Decimal
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.account import Account
from app.models.user import User
from app.schemas.account import AccountResponse
from app.schemas.auth import (
    AuthSuccessResponse,
    UserLoginRequest,
    UserProfileOverview,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Onboarding"])


@router.post(
    "/register",
    response_model=AuthSuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user & onboard default wallet",
    description="Registers a new user, hashes credentials, automatically creates their default 'Main Wallet' with initial balance, and issues an access token.",
)
async def register_user(
    payload: UserRegisterRequest,
    db: SessionDep,
) -> AuthSuccessResponse:
    # 1. Check if email already exists
    existing_user_stmt = select(User).where(User.email == payload.email.lower().strip())
    existing_user_result = await db.execute(existing_user_stmt)
    if existing_user_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # 2. Hash password and persist user
    new_user = User(
        email=payload.email.lower().strip(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        currency_symbol=payload.currency_symbol or settings.DEFAULT_CURRENCY_SYMBOL,
    )
    db.add(new_user)
    await db.flush()  # Populates new_user.id

    # 3. Create default 'Main Wallet' account
    starting_balance = Decimal(str(payload.starting_balance))
    main_account = Account(
        user_id=new_user.id,
        name="Main Wallet",
        initial_balance=starting_balance,
        current_balance=starting_balance,
        is_default=True,
    )
    db.add(main_account)
    await db.commit()
    await db.refresh(new_user)
    await db.refresh(main_account)

    # 4. Generate JWT access token
    access_token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email}
    )
    expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return AuthSuccessResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in_seconds,
        user=UserResponse.model_validate(new_user),
        default_account=AccountResponse.model_validate(main_account),
    )


@router.post(
    "/login",
    response_model=AuthSuccessResponse,
    summary="OAuth2 compatible login endpoint",
    description="Authenticates via standard form fields (username=email, password) and issues an access token.",
)
async def login_oauth2(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: SessionDep,
) -> AuthSuccessResponse:
    # Authenticate credentials
    email = form_data.username.lower().strip()
    stmt = (
        select(User)
        .options(selectinload(User.accounts))
        .where(User.email == email)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password.",
        )

    # Find default account
    default_account: Optional[Account] = None
    for acc in user.accounts:
        if acc.is_default:
            default_account = acc
            break
    if not default_account and user.accounts:
        default_account = user.accounts[0]

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return AuthSuccessResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in_seconds,
        user=UserResponse.model_validate(user),
        default_account=(
            AccountResponse.model_validate(default_account)
            if default_account
            else None
        ),
    )


@router.post(
    "/login/json",
    response_model=AuthSuccessResponse,
    summary="JSON login endpoint",
    description="Convenience endpoint for SPA/PWA clients accepting application/json body.",
)
async def login_json(
    payload: UserLoginRequest,
    db: SessionDep,
) -> AuthSuccessResponse:
    email = payload.email.lower().strip()
    stmt = (
        select(User)
        .options(selectinload(User.accounts))
        .where(User.email == email)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password.",
        )

    default_account: Optional[Account] = None
    for acc in user.accounts:
        if acc.is_default:
            default_account = acc
            break
    if not default_account and user.accounts:
        default_account = user.accounts[0]

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return AuthSuccessResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in_seconds,
        user=UserResponse.model_validate(user),
        default_account=(
            AccountResponse.model_validate(default_account)
            if default_account
            else None
        ),
    )


@router.get(
    "/me",
    response_model=UserProfileOverview,
    summary="Get current user profile and account overview",
    description="Returns the authenticated user details along with consolidated balance and all registered accounts.",
)
async def get_me(
    current_user: CurrentUserDep,
    db: SessionDep,
) -> UserProfileOverview:
    stmt = select(Account).where(Account.user_id == current_user.id).order_by(Account.created_at)
    result = await db.execute(stmt)
    accounts = result.scalars().all()

    total_balance = sum(
        (acc.current_balance for acc in accounts),
        Decimal("0.00")
    )
    default_account_id = next((acc.id for acc in accounts if acc.is_default), None)

    return UserProfileOverview(
        user=UserResponse.model_validate(current_user),
        accounts=[AccountResponse.model_validate(acc) for acc in accounts],
        total_balance=total_balance,
        default_account_id=default_account_id,
    )
