# FinFlow 💸

> **FinFlow** is an executive-grade, self-hosted personal finance PWA designed for high-density visual analytics, atomic multi-account ledger management, and deep time-series insights powered by the Persian (Jalali) solar calendar.

---

## 🌟 Architecture & Tech Stack

### 🚀 Backend & Analytics Engine
- **Framework**: Python 3.12+, FastAPI
- **Database & Async ORM**: PostgreSQL 16, SQLAlchemy 2.0 (`asyncio` + `asyncpg`), Pydantic v2
- **Calendar & Time-Series**: `jdatetime` (native Jalali year-month-day decomposition and indexing)
- **Security**: JWT (`pyjwt`), password hashing with `passlib[bcrypt]`, role/user multi-tenancy
- **Currency Standard**: `k-Toman` (1 k-Toman = 1,000 Tomans = 10,000 Rials), stored as `NUMERIC(14, 2)`

### 🎨 Frontend & Visual Analytics
- **Framework**: React 19, Vite, TypeScript
- **Visual Analytics**: Apache ECharts (`echarts`, `echarts-for-react`)
- **Styling**: Tailwind CSS, Dark Obsidian FinTech design system (`#0B0F17`, `#131B2E`, `#1F5FFF`, `#04CE78`, `#FF4D6A`)
- **Data & State**: TanStack Query (`@tanstack/react-query`), Zustand
- **PWA**: Service Worker caching, offline app shell, web app manifest

---

## 📊 Visual Analytics Suite

FinFlow features 7 dedicated analytics endpoints and rich interactive visualizations:

1. **Cash Flow Sankey Flow (`CashFlowSankey.tsx`)**:
   - Visualizes income streams entering the Inflow Pool and distributing across expense categories and retained savings.
2. **Spending Rhythm Heatmap (`SpendingHeatmap.tsx`)**:
   - 30/31-day Jalali calendar heatmap displaying daily burn rates with peak-proportional color intensity.
3. **Cumulative Burn Trajectory (`CumulativeBurnChart.tsx`)**:
   - Dual running area curves comparing cumulative inflow vs. outflow with automated deficit crossover detection.
4. **Category Allocation Donut (`CategoryWaterfallDonut.tsx`)**:
   - High-contrast donut chart displaying total spend and ranked progress bars per category.
5. **Outlier Watch (`TopExpensesCard.tsx`)**:
   - Real-time detection of the top 5 single expenditures of the month to spot spending leaks.
6. **Executive Overview KPIs (`OverviewKPIs.tsx`)**:
   - Total Inflow, Total Outflow, Net Savings Rate, and Total Liquid Net Worth.

---

## 🐳 Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/SirAmiRTey/finflow.git
cd finflow

# Configure environment variables
cp .env.example .env

# Launch services via Docker Compose
docker compose up -d --build
```

Access the application:
- **Frontend PWA**: `http://localhost:3001` (or `http://localhost:3000`)
- **FastAPI OpenAPI Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`

---

## 📄 License
MIT License
