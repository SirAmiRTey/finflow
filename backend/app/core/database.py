import logging
from typing import AsyncGenerator, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.models.base import Base
from app.models.category import Category

logger = logging.getLogger(__name__)

# Create asynchronous SQLAlchemy engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# System seed categories specification
SYSTEM_DEFAULT_CATEGORIES: List[Dict[str, str]] = [
    # Expenses
    {"name": "Groceries", "type": "expense", "icon": "shopping-cart", "color_hex": "#10B981"},
    {"name": "Dining Out", "type": "expense", "icon": "utensils", "color_hex": "#F59E0B"},
    {"name": "Housing & Bills", "type": "expense", "icon": "home", "color_hex": "#3B82F6"},
    {"name": "Transport", "type": "expense", "icon": "car", "color_hex": "#6366F1"},
    {"name": "Tech & Gear", "type": "expense", "icon": "laptop", "color_hex": "#8B5CF6"},
    {"name": "Health", "type": "expense", "icon": "heart-pulse", "color_hex": "#EC4899"},
    {"name": "Entertainment", "type": "expense", "icon": "gamepad-2", "color_hex": "#14B8A6"},
    {"name": "General", "type": "expense", "icon": "circle-dollar-sign", "color_hex": "#64748B"},
    # Incomes
    {"name": "Salary", "type": "income", "icon": "briefcase", "color_hex": "#04CE78"},
    {"name": "Freelance", "type": "income", "icon": "code", "color_hex": "#1F5FFF"},
    {"name": "Investments", "type": "income", "icon": "trending-up", "color_hex": "#06B6D4"},
    {"name": "Gifts & Other", "type": "income", "icon": "gift", "color_hex": "#A855F7"},
]


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async database session per request.
    Rolls back automatically on exception and guarantees closure.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def seed_system_categories(session: AsyncSession) -> None:
    """
    Seeds default system categories into the database if they do not exist.
    """
    try:
        # Check existing system categories
        stmt = select(Category).where(Category.is_system == True)  # noqa: E712
        result = await session.execute(stmt)
        existing_categories = result.scalars().all()
        existing_keys = {(c.name, c.type) for c in existing_categories}

        to_add = []
        for cat_data in SYSTEM_DEFAULT_CATEGORIES:
            key = (cat_data["name"], cat_data["type"])
            if key not in existing_keys:
                to_add.append(
                    Category(
                        user_id=None,
                        name=cat_data["name"],
                        type=cat_data["type"],
                        icon=cat_data["icon"],
                        color_hex=cat_data["color_hex"],
                        is_system=True,
                    )
                )

        if to_add:
            session.add_all(to_add)
            await session.commit()
            logger.info("Seeded %d system categories.", len(to_add))
        else:
            logger.info("System categories already seeded.")
    except Exception as e:
        await session.rollback()
        logger.error("Error seeding system categories: %s", e)
        raise


async def init_db() -> None:
    """
    Initializes database tables and seeds base records on application startup.
    """
    logger.info("Initializing database and verifying tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified.")

    # Seed default system categories
    async with AsyncSessionLocal() as session:
        await seed_system_categories(session)
