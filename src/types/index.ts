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
  overall_discount_amount?: number;
  overall_discount_type?: 'percentage' | 'amount';
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
  individual_sales?: Sale[];
  service_ids?: string[];
  staff_ids?: string[];
  payment_mode?: string;
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

export interface Settings {
  id: string;
  user_id: string;
  shop_name: string;
  shop_logo_url: string | null;
  address: string | null;
  contact_number: string | null;
  receipt_footer: string | null;
  auto_print: boolean;
  show_customer_details: boolean;
  show_logo: boolean;
  show_shop_name: boolean;
  session_timeout: number;
  admin_password_hash: string | null;
  created_at: string;
  updated_at: string;
}