import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.transaction import Transaction


class Category(Base):
    """
    Category entity representing income/expense classifications.
    System categories have user_id=None and is_system=True.
    User-defined categories have user_id set and is_system=False.
    """
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    type: Mapped[str] = mapped_column(
        String(20),
        nullable=False  # 'income' or 'expense'
    )
    icon: Mapped[str] = mapped_column(
        String(50),
        nullable=False  # Lucide icon identifier (e.g. 'shopping-cart')
    )
    color_hex: Mapped[str] = mapped_column(
        String(10),
        nullable=False  # Hex color string (e.g. '#10B981')
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="categories"
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction",
        back_populates="category"
    )

    def __repr__(self) -> str:
        return f"<Category id={self.id} name='{self.name}' type='{self.type}' is_system={self.is_system}>"
