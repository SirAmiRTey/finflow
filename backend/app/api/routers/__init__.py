from app.api.routers.auth import router as auth_router
from app.api.routers.accounts import router as accounts_router
from app.api.routers.categories import router as categories_router
from app.api.routers.transactions import router as transactions_router
from app.api.routers.analytics import router as analytics_router

__all__ = [
    "auth_router",
    "accounts_router",
    "categories_router",
    "transactions_router",
    "analytics_router",
]
