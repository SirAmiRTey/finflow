from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class AccountBase(BaseModel):
    """Base schema for financial account."""
    name: str = Field(..., min_length=1, max_length=100, examples=["Main Wallet"])
    is_default: bool = Field(default=False, description="Whether this is the primary wallet")


class AccountCreate(AccountBase):
    """Schema for creating a new account."""
    initial_balance: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="Initial balance in k-Toman (e.g., 50.00 = 50,000 Tomans)",
        examples=[Decimal("150.00")]
    )


class AccountUpdate(BaseModel):
    """Schema for updating an existing account."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_default: Optional[bool] = None


class AccountBalanceUpdate(BaseModel):
    """Schema for updating/adjusting the current balance of an account."""
    current_balance: Decimal = Field(
        ...,
        decimal_places=2,
        description="Updated balance in k-Toman",
        examples=[Decimal("250.50")]
    )
    note: Optional[str] = Field(None, max_length=255, description="Optional reason for balance adjustment")


class AccountResponse(AccountBase):
    """Schema for account responses."""
    id: UUID
    user_id: UUID
    initial_balance: Decimal
    current_balance: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
