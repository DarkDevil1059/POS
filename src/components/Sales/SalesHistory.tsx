import React, { useState, useEffect } from 'react';
import { BarChart3, Search, Calendar, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SaleWithDetails } from '../../types';

const SalesHistory: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabaseClient
        .from('sales')
        .select(`
          *,
          customers(name, contact),
          staff(name),
          services(name, price)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const salesWithDetails = data?.map(sale => ({
        ...sale,
        customer_name: sale.customers?.name || 'Unknown Customer',
        staff_name: sale.staff?.name || 'Unknown Staff',
        service_name: sale.services?.name || 'Unknown Service',
      })) || [];

      setSales(salesWithDetails);
    } catch (error) {
      console.error('Error fetching sales:', error);
      alert('Error loading sales data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = !searchTerm || 
      sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.staff_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !dateFilter || 
      new Date(sale.date).toDateString() === new Date(dateFilter).toDateString();

    return matchesSearch && matchesDate;
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0);

  const exportToCSV = () => {
    const csvData = [
      ['Date', 'Customer', 'Service', 'Staff', 'Total'],
      ...filteredSales.map(sale => [
        new Date(sale.date).toLocaleDateString(),
        sale.customer_name || '',
        sale.service_name || '',
        sale.staff_name || '',
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-lg p-2">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
              <p className="text-gray-600">{filteredSales.length} sales found</p>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Total Sales</div>
            <div className="text-2xl font-bold text-blue-900">
              ₹{totalSales.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by customer, service, or staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={exportToCSV}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-900">Date & Time</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Customer</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Service</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Staff</th>
                  <th className="text-right p-4 font-semibold text-gray-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-gray-500">
                      No sales found
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(sale.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(sale.date).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {sale.customer_name}
                        </div>
                        {sale.customers?.contact && (
                          <div className="text-sm text-gray-500">
                            {sale.customers.contact}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {sale.service_name}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {sale.staff_name}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-lg font-bold text-green-600">
                          ₹{Number(sale.total).toFixed(2)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesHistory;