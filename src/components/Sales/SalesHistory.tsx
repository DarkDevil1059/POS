import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Printer, 
  Trash2, 
  Filter,
  RefreshCw,
  Users,
  DollarSign,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  FileText,
  Clock,
  CreditCard,
  User,
  Package
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SaleWithDetails } from '../../types';
import DeleteSaleModal from './DeleteSaleModal';
import { getAdminPassword } from '../Settings/AdminSettings';

interface FilterState {
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  customer: string;
  staff: string;
  service: string;
  paymentMode: string;
  minAmount: string;
  maxAmount: string;
}

interface SortConfig {
  key: keyof SaleWithDetails | 'customer_name' | 'staff_name' | 'service_name';
  direction: 'asc' | 'desc';
}

const SalesHistory: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<SaleWithDetails | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'month',
    startDate: '',
    endDate: '',
    customer: '',
    staff: '',
    service: '',
    paymentMode: '',
    minAmount: '',
    maxAmount: ''
  });

  // Unique values for filter dropdowns
  const [uniqueCustomers, setUniqueCustomers] = useState<string[]>([]);
  const [uniqueStaff, setUniqueStaff] = useState<string[]>([]);
  const [uniqueServices, setUniqueServices] = useState<string[]>([]);
  const [uniquePaymentModes, setUniquePaymentModes] = useState<string[]>([]);

  // Store maps for printing receipts
  const [servicesMap, setServicesMap] = useState<Map<string, any>>(new Map());
  const [staffMap, setStaffMap] = useState<Map<string, any>>(new Map());
  const [customersMap, setCustomersMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First get all sales for the user
      const { data: salesData, error } = await supabaseClient
        .from('sales')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      // Group sales by date and customer to combine multiple services/staff
      const groupedSales = (salesData || []).reduce((acc, sale) => {
        const dateKey = new Date(sale.date).toISOString().split('T')[0];
        const customerKey = sale.customer_id || 'no-customer';
        const groupKey = `${dateKey}-${customerKey}`;
        
        if (!acc[groupKey]) {
          acc[groupKey] = {
            id: sale.id,
            date: sale.date,
            customer_id: sale.customer_id,
            total: 0,
            discount_amount: 0,
            payment_mode: sale.payment_mode || 'cash',
            created_at: sale.created_at,
            user_id: sale.user_id,
            service_ids: [],
            staff_ids: [],
            individual_sales: []
          };
        }
        
        acc[groupKey].total += Number(sale.total);
        acc[groupKey].discount_amount += Number(sale.discount_amount || 0);
        acc[groupKey].service_ids.push(sale.service_id);
        acc[groupKey].staff_ids.push(sale.staff_id);
        acc[groupKey].individual_sales.push(sale);
        
        return acc;
      }, {} as Record<string, any>);

      // Convert grouped sales back to array and fetch related data
      const groupedSalesArray = Object.values(groupedSales);
      
      // Get all unique customer, service, and staff IDs
      const customerIds = [...new Set(groupedSalesArray.map(s => s.customer_id).filter(Boolean))];
      const serviceIds = [...new Set(groupedSalesArray.flatMap(s => s.service_ids).filter(Boolean))];
      const staffIds = [...new Set(groupedSalesArray.flatMap(s => s.staff_ids).filter(Boolean))];
      
      // Fetch related data
      const [customersRes, servicesRes, staffRes] = await Promise.all([
        customerIds.length > 0 ? supabaseClient
          .from('customers')
          .select('id, name, contact')
          .in('id', customerIds) : { data: [] },
        serviceIds.length > 0 ? supabaseClient
          .from('services')
          .select('id, name, price')
          .in('id', serviceIds) : { data: [] },
        staffIds.length > 0 ? supabaseClient
          .from('staff')
          .select('id, name')
          .in('id', staffIds) : { data: [] }
      ]);
      
      const customersMap = new Map((customersRes.data || []).map(c => [c.id, c]));
      const servicesMap = new Map((servicesRes.data || []).map(s => [s.id, s]));
      const staffMap = new Map((staffRes.data || []).map(s => [s.id, s]));
      
      // Store maps in state for use in other functions
      setCustomersMap(customersMap);
      setServicesMap(servicesMap);
      setStaffMap(staffMap);
      
      // Build final sales with details
      const salesWithDetails = groupedSalesArray.map(sale => {
        const customer = customersMap.get(sale.customer_id);
        
        // Get unique services and staff for this grouped sale
        const uniqueServiceIds = [...new Set(sale.service_ids.filter(Boolean))];
        const uniqueStaffIds = [...new Set(sale.staff_ids.filter(Boolean))];
        
        const serviceNames = uniqueServiceIds
          .map(id => servicesMap.get(id)?.name)
          .filter(Boolean)
          .join(', ');
          
        const staffNames = uniqueStaffIds
          .map(id => staffMap.get(id)?.name)
          .filter(Boolean)
          .join(', ');
        
        return {
          ...sale,
          customer_name: customer?.name || 'Walk-in Customer',
          customers: customer,
          service_name: serviceNames || 'Unknown Service',
          staff_name: staffNames || 'Unknown Staff'
        };
      });

      setSales(salesWithDetails);

      // Extract unique values for filters
      const customers = [...new Set(salesWithDetails.map(s => s.customer_name).filter(Boolean))];
      const staff = [...new Set(salesWithDetails.map(s => s.staff_name).filter(Boolean))];
      const services = [...new Set(salesWithDetails.flatMap(s => s.service_name.split(', ')).filter(Boolean))];
      const paymentModes = [...new Set(salesWithDetails.map(s => s.payment_mode).filter(Boolean))];

      setUniqueCustomers(customers.sort());
      setUniqueStaff(staff.sort());
      setUniqueServices(services.sort());
      setUniquePaymentModes(paymentModes.sort());

    } catch (error) {
      console.error('Error fetching sales:', error);
      alert('Error loading sales data. Please refresh the page.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply filters and search
  const filteredSales = useMemo(() => {
    let filtered = sales.filter(sale => {
// Date range filter
      const saleDate = new Date(sale.date);
      const now = new Date();
      
      if (filters.dateRange === 'custom') {
        if (filters.startDate && saleDate < new Date(filters.startDate)) return false;
        if (filters.endDate && saleDate > new Date(filters.endDate + 'T23:59:59')) return false;
      } else {
        let startDate: Date;
        switch (filters.dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(0);
        }
        if (saleDate < startDate) return false;
      }

      // Other filters
      if (filters.customer && !sale.customer_name?.toLowerCase().includes(filters.customer.toLowerCase())) return false;
      if (filters.staff && !sale.staff_name?.toLowerCase().includes(filters.staff.toLowerCase())) return false;
      if (filters.service && !sale.service_name?.toLowerCase().includes(filters.service.toLowerCase())) return false;
      if (filters.paymentMode && sale.payment_mode !== filters.paymentMode) return false;
      if (filters.minAmount && sale.total < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && sale.total > parseFloat(filters.maxAmount)) return false;

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle special cases
      if (sortConfig.key === 'customer_name') {
        aValue = a.customer_name || '';
        bValue = b.customer_name || '';
      } else if (sortConfig.key === 'staff_name') {
        aValue = a.staff_name || '';
        bValue = b.staff_name || '';
      } else if (sortConfig.key === 'service_name') {
        aValue = a.service_name || '';
        bValue = b.service_name || '';
      }

      // Convert to comparable values
      if (sortConfig.key === 'date' || sortConfig.key === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortConfig.key === 'total') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [sales, filters, sortConfig]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const totalDiscount = filteredSales.reduce((sum, sale) => sum + Number(sale.discount_amount || 0), 0);
return {
      totalSales,
      totalRevenue,
      totalDiscount};
  }, [filteredSales]);

  const handleSort = (key: keyof SaleWithDetails | 'customer_name' | 'staff_name' | 'service_name') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = () => {
    if (selectedSales.size === filteredSales.length) {
      setSelectedSales(new Set());
    } else {
      setSelectedSales(new Set(filteredSales.map(sale => sale.id)));
    }
  };

  const handleSelectSale = (saleId: string) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

  const exportToCSV = () => {
    const csvData = [
      ['Date', 'Time', 'Customer', 'Service', 'Staff', 'Payment Mode', 'Subtotal', 'Discount', 'Total'],
      ...filteredSales.map(sale => [
        new Date(sale.date).toLocaleDateString(),
        new Date(sale.date).toLocaleTimeString(),
        sale.customer_name || '',
        sale.service_name || '',
        sale.staff_name || '',
        sale.payment_mode || 'cash',
        (Number(sale.total) + Number(sale.discount_amount || 0)).toFixed(2),
        Number(sale.discount_amount || 0).toFixed(2),
        Number(sale.total).toFixed(2)
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const printSaleReceipt = (sale: SaleWithDetails) => {
    try {
      const totalDiscount = Number(sale.discount_amount) || 0;
      const subTotal = Number(sale.total) + totalDiscount;
      const finalTotal = Number(sale.total);
      
      // Group individual sales by service to avoid duplicates
      const serviceGroups = (sale.individual_sales || []).reduce((acc, item) => {
        const serviceId = item.service_id;
        if (!acc[serviceId]) {
          acc[serviceId] = {
            service: servicesMap.get(serviceId),
            quantity: 0,
            totalAmount: 0,
            totalDiscount: 0
          };
        }
        acc[serviceId].quantity += 1;
        acc[serviceId].totalAmount += Number(item.total);
        acc[serviceId].totalDiscount += Number(item.discount_amount || 0);
        return acc;
      }, {} as Record<string, any>);

      const receiptRows = Object.values(serviceGroups).map((group: any) => {
        const service = group.service;
        const unitPrice = service?.price || (group.totalAmount / group.quantity);
        return `
          <tr>
            <td>${service?.name || "Service"}</td>
            <td style="text-align:right;">₹${unitPrice.toFixed(2)}</td>
            <td style="text-align:center;">${group.quantity}</td>
            <td style="text-align:right;">₹${group.totalDiscount.toFixed(2)}</td>
            <td style="text-align:right;">₹${group.totalAmount.toFixed(2)}</td>
          </tr>
        `;
      }).join("");

const receiptContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Invoice</title>
    <style>
      @page { size: 100mm auto; margin: 0; }
      body { font-family: 'Poppins', sans-serif; margin: 0; padding: 14px; }
      .receipt { width: 100mm; font-size: 14px; }
      .center { text-align: center; }
      .shop-name { font-weight: 900; text-transform: uppercase; font-size: 16px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0; }
      th, td { 
        padding: 8px 4px;  /* was 5px → more vertical space */
        border-bottom: 1px dashed #000; 
      }
      .totals { margin-top: 12px; text-align: right; font-size: 13px; }
      .grand-total { font-size: 18px; font-weight: 700; text-align: right; margin-top: 12px; }
      hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
      .section { margin-bottom: 8px; }
      .bold-line { border: none; border-top: 2px solid #000; margin: 8px 0; }
    </style>
  </head>
  <body onload="window.print()">
    <div class="receipt">
      <div class="center">
        <div class="shop-name">SALON7</div>
        51, Gajapathy St, Shenoy Nagar, Chennai–30<br/>
        Contact: 044 3555 4106, 9840722893
      </div>
      <hr />
      <div class="section">
        <strong>Invoice To:</strong><br/>
        ${sale.customers?.name || "Walk-in Customer"}<br/>
        ${sale.customers?.contact || ""}
      </div>
      <div class="section">
        <strong>Payment Mode:</strong> ${(sale.payment_mode || "cash").charAt(0).toUpperCase() + (sale.payment_mode || "cash").slice(1)}
      </div>
      <div class="section">
        <strong>Date:</strong> ${sale.date ? new Date(sale.date).toLocaleDateString() : ""}<br/>
        <strong>Time:</strong> ${sale.date ? new Date(sale.date).toLocaleTimeString() : ""}<br/>
      </div>
      <hr />
      <table>
        <thead>
          <tr><th>Service</th><th>Price</th><th>Qty</th><th>Disc</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${receiptRows}
        </tbody>
      </table>
      <div class="totals">
        Sub Total: ₹${subTotal.toFixed(2)}<br/>
        ${totalDiscount > 0 ? `Total Discounts: ₹${totalDiscount.toFixed(2)}<br/>` : ""}
      </div>
      <hr class="bold-line" />
      <div class="grand-total">
        Grand Total: ₹${finalTotal.toFixed(2)}
      </div>
      <div class="center" style="margin-top:12px;"><strong>Thank you for visiting Salon 7</strong></div>
    </div>
  </body>
  </html>
`;

      const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
      
      if (!printWindow) {
        alert('Unable to open print window. Please check your browser settings.');
        return;
      }

      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();
      
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('An unexpected error occurred while preparing the receipt.');
    }
  };

  const handleDeleteSale = (sale: SaleWithDetails) => {
    setSaleToDelete(sale);
    setShowDeleteModal(true);
  };

  const confirmDeleteSale = async (password: string): Promise<boolean> => {
    if (password !== getAdminPassword()) {
      return false;
    }

    if (!saleToDelete) return false;

    setDeleteLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete all individual sales that make up this grouped sale
      const saleIds = saleToDelete.individual_sales?.map(s => s.id) || [saleToDelete.id];
      
      const { error } = await supabaseClient
        .from('sales')
        .delete()
        .in('id', saleIds)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove from local state
      setSales(sales.filter(sale => sale.id !== saleToDelete.id));
      setSaleToDelete(null);
      
      return true;
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert(`Error deleting sale: ${error.message || 'Unknown error'}`);
      return false;
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      dateRange: 'month',
      startDate: '',
      endDate: '',
      customer: '',
      staff: '',
      service: '',
      paymentMode: '',
      minAmount: '',
      maxAmount: ''
    });
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sales history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
                <p className="text-gray-600 mt-1">
                  {filteredSales.length} of {sales.length} sales
                  
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => fetchSales(true)}
                disabled={refreshing}
                className="bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 border border-gray-200 shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border shadow-sm ${
                  showFilters 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              
              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded-l-lg transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 rounded-r-lg transition-colors ${
                    viewMode === 'cards' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Package className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{summaryStats.totalSales}</p>
                </div>
                <div className="bg-blue-100 rounded-lg p-3">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">₹{summaryStats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-green-100 rounded-lg p-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Discounts</p>
                  <p className="text-2xl font-bold text-orange-600">₹{summaryStats.totalDiscount.toFixed(2)}</p>
                </div>
                <div className="bg-orange-100 rounded-lg p-3">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
<div className="flex items-center gap-2">
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
                
                {filters.dateRange === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      className="px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      className="px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                    <select
                      value={filters.customer}
                      onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Customers</option>
                      {uniqueCustomers.map(customer => (
                        <option key={customer} value={customer}>{customer}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Staff</label>
                    <select
                      value={filters.staff}
                      onChange={(e) => setFilters(prev => ({ ...prev, staff: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Staff</option>
                      {uniqueStaff.map(staff => (
                        <option key={staff} value={staff}>{staff}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                    <select
                      value={filters.service}
                      onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Services</option>
                      {uniqueServices.map(service => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                    <select
                      value={filters.paymentMode}
                      onChange={(e) => setFilters(prev => ({ ...prev, paymentMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Payment Modes</option>
                      {uniquePaymentModes.map(mode => (
                        <option key={mode} value={mode}>{mode.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={filters.minAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="₹0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={filters.maxAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="₹999.99"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-end">
                    <button
                      onClick={resetFilters}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sales Content */}
          {viewMode === 'table' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4">
                        <input
                          type="checkbox"
                          checked={selectedSales.size === filteredSales.length && filteredSales.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-900">
                        <button
                          onClick={() => handleSort('date')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Date & Time
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-900">
                        <button
                          onClick={() => handleSort('customer_name')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Customer
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-900 hidden lg:table-cell">
                        <button
                          onClick={() => handleSort('service_name')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Services
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-900 hidden md:table-cell">
                        <button
                          onClick={() => handleSort('staff_name')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Staff
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-900 hidden sm:table-cell">Payment</th>
                      <th className="text-right p-4 font-semibold text-gray-900">
                        <button
                          onClick={() => handleSort('total')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors ml-auto"
                        >
                          Total
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="text-right p-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-12 text-gray-500">
                          <div className="flex flex-col items-center gap-3">
                            <BarChart3 className="w-12 h-12 text-gray-300" />
                            <div>
                              <p className="text-lg font-medium">No sales found</p>
                              <p className="text-sm">Try adjusting your filters or search terms</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale) => (
                        <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedSales.has(sale.id)}
                              onChange={() => handleSelectSale(sale.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 rounded-lg p-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {new Date(sale.date).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(sale.date).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-purple-100 rounded-lg p-2">
                                <User className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{sale.customer_name}</div>
                                {sale.customers?.contact && (
                                  <div className="text-sm text-gray-500">{sale.customers.contact}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 hidden lg:table-cell">
                            <div className="font-medium text-gray-900 max-w-xs truncate" title={sale.service_name}>
                              {sale.service_name}
                            </div>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <div className="font-medium text-gray-900">{sale.staff_name}</div>
                          </td>
                          <td className="p-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900 capitalize">
                                {sale.payment_mode || 'cash'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="text-lg font-bold text-green-600">
                              ₹{Number(sale.total).toFixed(2)}
                            </div>
                            {Number(sale.discount_amount || 0) > 0 && (
                              <div className="text-sm text-orange-600">
                                -₹{Number(sale.discount_amount).toFixed(2)} discount
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => printSaleReceipt(sale)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Print Receipt"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSale(sale)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete Sale"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSales.length === 0 ? (
                <div className="col-span-full text-center p-12 text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <BarChart3 className="w-12 h-12 text-gray-300" />
                    <div>
                      <p className="text-lg font-medium">No sales found</p>
                      <p className="text-sm">Try adjusting your filters or search terms</p>
                    </div>
                  </div>
                </div>
              ) : (
                filteredSales.map((sale) => (
                  <div key={sale.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 rounded-lg p-2">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(sale.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(sale.date).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-600">
                          ₹{Number(sale.total).toFixed(2)}
                        </div>
                        {Number(sale.discount_amount || 0) > 0 && (
                          <div className="text-sm text-orange-600">
                            -₹{Number(sale.discount_amount).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{sale.customer_name}</div>
                          {sale.customers?.contact && (
                            <div className="text-sm text-gray-500">{sale.customers.contact}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{sale.service_name}</div>
                          <div className="text-sm text-gray-500">by {sale.staff_name}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 capitalize">
                          {sale.payment_mode || 'cash'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <input
                        type="checkbox"
                        checked={selectedSales.has(sale.id)}
                        onChange={() => handleSelectSale(sale.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => printSaleReceipt(sale)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete Sale"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <DeleteSaleModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSaleToDelete(null);
        }}
        onConfirm={confirmDeleteSale}
        saleName={saleToDelete ? `${saleToDelete.customer_name} - ${saleToDelete.service_name}` : ''}
        saleAmount={saleToDelete ? Number(saleToDelete.total) : 0}
        loading={deleteLoading}
      />
    </div>
  );
};

export default SalesHistory;