from datetime import datetime
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

TransactionType = Literal["income", "expense"]


class CategoryBriefResponse(BaseModel):
    """Brief metadata of associated category."""
    id: UUID
    name: str
    type: str
    icon: str
    color_hex: str

    model_config = ConfigDict(from_attributes=True)


class AccountBriefResponse(BaseModel):
    """Brief metadata of associated financial account."""
    id: UUID
    name: str
    current_balance: Decimal

    model_config = ConfigDict(from_attributes=True)


class TransactionBase(BaseModel):
    """Base schema for transactions."""
    account_id: UUID
    category_id: UUID
    type: TransactionType
    amount: Decimal = Field(
        ...,
        gt=Decimal("0.00"),
        decimal_places=2,
        description="Amount in k-Toman (scaled by dividing by 1,000)",
        examples=[Decimal("75.50")]
    )
    description: Optional[str] = Field(None, max_length=1000)
    transaction_date: Optional[datetime] = Field(
        default=None,
        description="Timestamp of the transaction. If omitted, current UTC time is used."
    )


class TransactionCreate(TransactionBase):
    """Payload to record a new transaction."""
    pass


class TransactionUpdate(BaseModel):
    """Payload to modify an existing transaction."""
    account_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = Field(None, gt=Decimal("0.00"), decimal_places=2)
    description: Optional[str] = Field(None, max_length=1000)
    transaction_date: Optional[datetime] = None


class TransactionResponse(BaseModel):
    """Transaction response entity including joined relations and computed Jalali fields."""
    id: UUID
    user_id: UUID
    account_id: UUID
    category_id: UUID
    type: TransactionType
    amount: Decimal
    description: Optional[str] = None
    transaction_date: datetime
    j_year: int
    j_month: int
    j_day: int
    j_period: str
    created_at: datetime

    category: Optional[CategoryBriefResponse] = None
    account: Optional[AccountBriefResponse] = None

    model_config = ConfigDict(from_attributes=True)


class TransactionListResponse(BaseModel):
    """Paginated collection of transactions with contextual period totals."""
    items: List[TransactionResponse]
    total: int
    limit: int
    offset: int
    period: Optional[str] = None
    total_income: Decimal = Decimal("0.00")
    total_expense: Decimal = Decimal("0.00")
