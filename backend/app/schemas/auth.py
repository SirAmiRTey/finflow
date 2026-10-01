import re
from datetime import datetime
from decimal import Decimal
from typing import Annotated, List, Optional
from uuid import UUID
from pydantic import AfterValidator, BaseModel, ConfigDict, Field

from app.schemas.account import AccountResponse

# Regex supporting standard as well as self-hosted/intranet domains (.local, .lan, etc.)
EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[\w\.\-]+\.[a-zA-Z0-9\-]+$")


def validate_email(v: str) -> str:
    cleaned = v.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Invalid email address format.")
    return cleaned


CleanEmail = Annotated[str, AfterValidator(validate_email)]


class UserRegisterRequest(BaseModel):
    """
    User registration payload including initial onboarding parameters.
    """
    email: CleanEmail = Field(..., examples=["user@finflow.local", "user@example.com"])
    password: str = Field(..., min_length=6, max_length=128, description="Plain text password (min 6 characters)")
    full_name: str = Field(..., min_length=1, max_length=255, examples=["Amir Hossein"])
    currency_symbol: Optional[str] = Field(default="k-Toman", max_length=32, description="Currency denomination")
    starting_balance: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="Initial balance for the default Main Wallet in k-Toman (scaled by 1/1,000)",
        examples=[Decimal("250.00")]
    )


class UserLoginRequest(BaseModel):
    """JSON login credentials."""
    email: CleanEmail
    password: str


class UserResponse(BaseModel):
    """Public user profile data."""
    id: UUID
    email: CleanEmail
    full_name: str
    currency_symbol: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """OAuth2 / Bearer JWT token schema."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthSuccessResponse(TokenResponse):
    """Unified response containing JWT token, user info, and the default account."""
    user: UserResponse
    default_account: Optional[AccountResponse] = None


class UserProfileOverview(BaseModel):
    """User profile combined with accounts overview and consolidated balance."""
    user: UserResponse
    accounts: List[AccountResponse]
    total_balance: Decimal = Field(description="Consolidated balance across all user accounts in k-Toman")
    default_account_id: Optional[UUID] = None
