import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.core.jalali import to_jalali_components

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.account import Account
    from app.models.category import Category


class Transaction(Base):
    """
    Transaction entity recording income and expense entries.
    All amounts are denominated in k-Toman (NUMERIC(14, 2)).
    Automatically converts Gregorian transaction_date to Jalali temporal fields:
    j_year, j_month, j_day, and j_period (e.g. '1403-07') for performant period-based querying.
    """
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    type: Mapped[str] = mapped_column(
        String(20),
        nullable=False  # 'income' or 'expense'
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=14, scale=2),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    transaction_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )

    # Jalali calendar indexed partitions
    j_year: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    j_month: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    j_day: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    j_period: Mapped[str] = mapped_column(
        String(7),
        nullable=False,
        index=True  # e.g., '1403-07'
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="transactions"
    )
    account: Mapped["Account"] = relationship(
        "Account",
        back_populates="transactions"
    )
    category: Mapped["Category"] = relationship(
        "Category",
        back_populates="transactions"
    )

    @classmethod
    def populate_jalali_fields(cls, transaction_date: datetime) -> dict:
        """
        Computes Jalali calendar fields from a Gregorian datetime.
        """
        j_year, j_month, j_day, j_period = to_jalali_components(transaction_date)
        return {
            "j_year": j_year,
            "j_month": j_month,
            "j_day": j_day,
            "j_period": j_period,
        }

    def __repr__(self) -> str:
        return f"<Transaction id={self.id} amount={self.amount} type='{self.type}' period='{self.j_period}'>"
