export interface Customer {
  id: string;
  name: string;
  contact: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  user_id: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  created_at: string;
}

export interface SaleItem {
  service_id: string;
  service_name: string;
  price: number;
  quantity: number;
  staff_id: string | null;
  staff_name: string | null;
  discount_percentage?: number;
  discount_amount?: number;
  discount_type?: 'percentage' | 'amount';
}

export interface Sale {
  id: string;
  customer_id: string | null;
  staff_id: string | null;
  service_id: string | null;
  date: string;
  total: number;
  discount_amount?: number;
  created_at: string;
  customers?: Customer;
  staff?: Staff;
  services?: Service;
}

export interface SaleWithDetails extends Sale {
  customer_name?: string;
  staff_name?: string;
  service_name?: string;
  selected_services?: SaleItem[];
  selected_staff?: Staff[];
  individual_records?: Sale[];
}

export interface ReportStats {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  topServices: Array<{
    service_name: string;
    total_sales: number;
    total_revenue: number;
  }>;
  staffPerformance: Array<{
    staff_name: string;
    total_sales: number;
    total_revenue: number;
  }>;
}

export interface DailySalesData {
  date: string;
  total_sales: number;
  total_revenue: number;
}