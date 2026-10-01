export interface User {
  id: string;
  email: string;
  full_name: string;
  currency_symbol: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  initial_balance: string;
  current_balance: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: "income" | "expense";
  icon: string;
  color_hex: string;
  is_system: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: "income" | "expense";
  amount: string;
  description: string | null;
  transaction_date: string;
  j_year: number;
  j_month: number;
  j_day: number;
  j_period: string;
  created_at: string;
  category?: {
    id: string;
    name: string;
    type: string;
    icon: string;
    color_hex: string;
  };
  account?: {
    id: string;
    name: string;
    current_balance: string;
  };
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
  period: string | null;
  total_income: string;
  total_expense: string;
}

export interface PeriodItem {
  period: string;
  label: string;
  is_current: boolean;
  year: number;
  month: number;
}

export interface PeriodsResponse {
  periods: PeriodItem[];
  current_period: string;
}

export interface OverviewAnalytics {
  period: string;
  period_label: string;
  total_income: string;
  total_expense: string;
  net_savings: string;
  savings_rate_percentage: number;
  total_liquidity: string;
  daily_burn_rate: string;
  runway_days: number;
  days_elapsed: number;
  total_days: number;
  currency_symbol: string;
}

export interface AuthSuccessResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  default_account?: Account;
}

export interface UserProfileOverview {
  user: User;
  accounts: Account[];
  total_balance: string;
  default_account_id: string | null;
}

// -----------------------------------------------------------------------------
// Visual Analytics Types
// -----------------------------------------------------------------------------
export interface SankeyNode {
  name: string;
  itemStyle?: {
    color?: string;
  };
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyResponse {
  period: string;
  nodes: SankeyNode[];
  links: SankeyLink[];
  total_inflow: string;
  total_outflow: string;
}

export interface HeatmapDayItem {
  day: number;
  date_label: string;
  amount: string;
  transaction_count: number;
}

export interface HeatmapResponse {
  period: string;
  period_label: string;
  total_days: number;
  days: HeatmapDayItem[];
  max_daily_spend: string;
}

export interface CumulativeBurnDay {
  day: number;
  date_label: string;
  daily_income: string;
  daily_expense: string;
  cumulative_income: string;
  cumulative_expense: string;
}

export interface CumulativeBurnResponse {
  period: string;
  period_label: string;
  days: CumulativeBurnDay[];
  crossover_occurred: boolean;
  crossover_day: number | null;
}

export interface CategoryBreakdownItem {
  category_id: string;
  category_name: string;
  category_icon: string;
  color_hex: string;
  total_amount: string;
  percentage: number;
  transaction_count: number;
}

export interface CategoryBreakdownResponse {
  period: string;
  total_spend: string;
  breakdown: CategoryBreakdownItem[];
}

export interface TopExpenseItem {
  id: string;
  amount: string;
  description: string | null;
  transaction_date: string;
  day: number;
  account_name: string;
  category_name: string;
  category_icon: string;
  color_hex: string;
}

export interface TopExpensesResponse {
  period: string;
  limit: number;
  expenses: TopExpenseItem[];
}

