import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, List
from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.transaction import Transaction


class Account(Base, TimestampMixin):
    """
    Account entity representing a financial account, wallet, or bank card.
    Balances are stored in k-Toman (scaled by dividing by 1,000) using NUMERIC(14, 2).
    """
    __tablename__ = "accounts"

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
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    initial_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=14, scale=2),
        default=Decimal("0.00"),
        nullable=False
    )
    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=14, scale=2),
        default=Decimal("0.00"),
        nullable=False
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="accounts"
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction",
        back_populates="account",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Account id={self.id} name='{self.name}' balance={self.current_balance} is_default={self.is_default}>"
