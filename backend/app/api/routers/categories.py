from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategoryType,
    CategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get(
    "",
    response_model=List[CategoryResponse],
    summary="List accessible categories",
    description="Returns all system default categories combined with custom categories created by the authenticated user.",
)
async def list_categories(
    current_user: CurrentUserDep,
    db: SessionDep,
    type: Optional[CategoryType] = Query(None, description="Filter by 'income' or 'expense'"),
) -> List[CategoryResponse]:
    query = (
        select(Category)
        .outerjoin(Transaction, Transaction.category_id == Category.id)
        .where(
            or_(
                Category.is_system == True,  # noqa: E712
                Category.user_id == current_user.id,
            )
        )
    )

    if type is not None:
        query = query.where(Category.type == type)

    query = query.group_by(Category.id).order_by(
        func.count(Transaction.id).desc(),
        Category.name.asc(),
    )
    result = await db.execute(query)
    categories = result.scalars().all()
    return [CategoryResponse.model_validate(c) for c in categories]


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create custom category",
    description="Creates a new custom category tied to the authenticated user.",
)
async def create_category(
    payload: CategoryCreate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> CategoryResponse:
    new_category = Category(
        user_id=current_user.id,
        name=payload.name.strip(),
        type=payload.type,
        icon=payload.icon.strip(),
        color_hex=payload.color_hex.strip(),
        is_system=False,
    )
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    return CategoryResponse.model_validate(new_category)


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Get category details",
    description="Retrieves a category by ID if it is a system default or belongs to the authenticated user.",
)
async def get_category(
    category_id: UUID,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> CategoryResponse:
    stmt = select(Category).where(
        Category.id == category_id,
        or_(
            Category.is_system == True,  # noqa: E712
            Category.user_id == current_user.id,
        ),
    )
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    return CategoryResponse.model_validate(category)


@router.patch(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Update custom category",
    description="Updates a user-defined category. System categories are protected and cannot be modified.",
)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> CategoryResponse:
    stmt = select(Category).where(Category.id == category_id)
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    if category.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System categories are read-only and cannot be modified.",
        )

    if category.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    if payload.name is not None:
        category.name = payload.name.strip()
    if payload.icon is not None:
        category.icon = payload.icon.strip()
    if payload.color_hex is not None:
        category.color_hex = payload.color_hex.strip()

    await db.commit()
    await db.refresh(category)
    return CategoryResponse.model_validate(category)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete custom category",
    description="Deletes a user-defined category. System default categories cannot be deleted.",
)
async def delete_category(
    category_id: UUID,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> None:
    stmt = select(Category).where(Category.id == category_id)
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    if category.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System categories cannot be deleted.",
        )

    if category.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    await db.delete(category)
    await db.commit()
