from datetime import datetime
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

CategoryType = Literal["income", "expense"]


class CategoryBase(BaseModel):
    """Base schema for category."""
    name: str = Field(..., min_length=1, max_length=100, examples=["Groceries"])
    type: CategoryType = Field(..., description="'income' or 'expense'", examples=["expense"])
    icon: str = Field(..., min_length=1, max_length=50, description="Lucide icon name", examples=["shopping-cart"])
    color_hex: str = Field(..., min_length=4, max_length=10, description="Hex color representation", examples=["#10B981"])


class CategoryCreate(CategoryBase):
    """Schema for creating a custom user category."""
    pass


class CategoryUpdate(BaseModel):
    """Schema for updating custom category attributes."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = Field(None, min_length=1, max_length=50)
    color_hex: Optional[str] = Field(None, min_length=4, max_length=10)


class CategoryResponse(CategoryBase):
    """Schema for category responses."""
    id: UUID
    user_id: Optional[UUID] = None
    is_system: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
