// types/index.ts - TypeScript Type Definitions

export interface User {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  role: 'admin' | 'manager' | 'cashier';
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface UserSession {
  id: number;
  userId: number;
  sessionToken: string;
  loginTime: string;
  logoutTime?: string;
  lastActivity: string;
  ipAddress?: string;
}

export interface ActivityLog {
  id: number;
  userId?: number;
  username: string;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface Analytics {
  profitTrends: ProfitTrend[];
  salesForecast: SalesForecast;
  customerAnalytics: CustomerAnalytics;
}

export interface ProfitTrend {
  period: string;
  totalSales: number;
  totalPurchases: number;
  profit: number;
  transactionCount: number;
}

export interface SalesForecast {
  historical: HistoricalData[];
  forecast: ForecastData[];
}

export interface HistoricalData {
  month: string;
  totalSales: number;
  transactionCount: number;
  avgTransaction: number;
}

export interface ForecastData {
  month: string;
  predictedSales: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomersThisMonth: number;
  topCustomers: TopCustomer[];
  customersByMonth: MonthlyCustomerData[];
}

export interface TopCustomer {
  name: string;
  phone?: string;
  purchaseCount: number;
  totalSpent: number;
  lastPurchase: string;
}

export interface MonthlyCustomerData {
  month: string;
  newCustomers: number;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'inventory' | 'reports' | 'settings' | 'admin';
}

export const AVAILABLE_PERMISSIONS: Permission[] = [
  { id: 'view_dashboard', name: 'View Dashboard', description: 'Access dashboard and statistics', category: 'sales' },
  { id: 'create_sales', name: 'Create Sales', description: 'Process sales transactions', category: 'sales' },
  { id: 'edit_sales', name: 'Edit Sales', description: 'Edit existing sales', category: 'sales' },
  { id: 'delete_sales', name: 'Delete Sales', description: 'Delete sales transactions', category: 'sales' },
  { id: 'view_inventory', name: 'View Inventory', description: 'View stock items', category: 'inventory' },
  { id: 'manage_inventory', name: 'Manage Inventory', description: 'Add/edit/delete stock items', category: 'inventory' },
  { id: 'adjust_stock', name: 'Adjust Stock', description: 'Adjust stock quantities', category: 'inventory' },
  { id: 'view_reports', name: 'View Reports', description: 'Access reports section', category: 'reports' },
  { id: 'export_reports', name: 'Export Reports', description: 'Export reports to files', category: 'reports' },
  { id: 'view_analytics', name: 'View Analytics', description: 'Access analytics and trends', category: 'reports' },
  { id: 'manage_users', name: 'Manage Users', description: 'Create and manage users', category: 'admin' },
  { id: 'view_activity_logs', name: 'View Activity Logs', description: 'View system activity logs', category: 'admin' },
  { id: 'manage_settings', name: 'Manage Settings', description: 'Change system settings', category: 'settings' },
];

export const ROLE_DEFAULTS: Record<string, string[]> = {
  admin: ['all'],
  manager: [
    'view_dashboard', 'create_sales', 'edit_sales', 'view_inventory', 
    'manage_inventory', 'adjust_stock', 'view_reports', 'export_reports', 
    'view_analytics', 'view_activity_logs'
  ],
  cashier: [
    'view_dashboard', 'create_sales', 'view_inventory'
  ]
};
