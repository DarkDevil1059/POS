import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, BarChart3, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DailySalesData } from '../../types';

const SalesReports: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [salesData, setSalesData] = useState<DailySalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [averageDaily, setAverageDaily] = useState(0);

  useEffect(() => {
    fetchSalesData();
  }, [dateRange, startDate, endDate]);

  const getDateFilter = () => {
    const now = new Date();
    let start: Date;
    let end = new Date(now);

    switch (dateRange) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { start, end } = getDateFilter();

      const { data: salesData, error } = await supabaseClient
        .from('sales')
        .select('date, total')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date');

      if (error) throw error;

      // Group sales by date
      const dailyData = (salesData || []).reduce((acc, sale) => {
        const date = new Date(sale.date).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { total_sales: 0, total_revenue: 0 };
        }
        acc[date].total_sales += 1;
        acc[date].total_revenue += Number(sale.total);
        return acc;
      }, {} as Record<string, { total_sales: number; total_revenue: number }>);

      const chartData = Object.entries(dailyData)
        .map(([date, data]) => ({
          date,
          total_sales: data.total_sales,
          total_revenue: data.total_revenue
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setSalesData(chartData);

      // Calculate totals
      const revenue = chartData.reduce((sum, day) => sum + day.total_revenue, 0);
      const sales = chartData.reduce((sum, day) => sum + day.total_sales, 0);
      const avgDaily = chartData.length > 0 ? revenue / chartData.length : 0;

      setTotalRevenue(revenue);
      setTotalSales(sales);
      setAverageDaily(avgDaily);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      alert('Error loading sales reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const maxRevenue = Math.max(...salesData.map(d => d.total_revenue), 1);
  const maxSales = Math.max(...salesData.map(d => d.total_sales), 1);

  const exportData = () => {
    const csvData = [
      ['Date', 'Sales Count', 'Revenue'],
      ...salesData.map(day => [
        day.date,
        day.total_sales.toString(),
        day.total_revenue.toFixed(2)
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'day': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'This Month';
      case 'quarter': return 'Last 3 Months';
      case 'custom': return 'Custom Range';
      default: return 'Last 7 Days';
    }
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
            <div className="bg-blue-100 rounded-lg p-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
              <p className="text-gray-600">{getDateRangeLabel()} Overview</p>
            </div>
          </div>
          
          <button
            onClick={exportData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-700">Date Range:</span>
            </div>
            
            <div className="flex gap-2">
              {['day', 'week', 'month', 'quarter', 'custom'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === 'day' ? 'Today' :
                   range === 'week' ? 'Week' : 
                   range === 'month' ? 'Month' : 
                   range === 'quarter' ? 'Quarter' : 'Custom'}
                </button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-600">₹{totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-3xl font-bold text-green-600">{totalSales}</p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Daily Average</p>
                <p className="text-3xl font-bold text-purple-600">₹{averageDaily.toFixed(2)}</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-3">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Trend</h3>
            <div className="h-64">
              {salesData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available for selected period
                </div>
              ) : (
                <div className="h-full flex items-end justify-between gap-2">
                  {salesData.map((day, index) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600 relative group"
                        style={{
                          height: `${(day.total_revenue / maxRevenue) * 200}px`,
                          minHeight: '4px'
                        }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ₹{day.total_revenue.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sales Count Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Sales Count</h3>
            <div className="h-64">
              {salesData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available for selected period
                </div>
              ) : (
                <div className="h-full flex items-end justify-between gap-2">
                  {salesData.map((day, index) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-green-500 rounded-t-sm transition-all duration-300 hover:bg-green-600 relative group"
                        style={{
                          height: `${(day.total_sales / maxSales) * 200}px`,
                          minHeight: '4px'
                        }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          {day.total_sales} sales
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Daily Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-900">Date</th>
                  <th className="text-right p-4 font-semibold text-gray-900">Sales Count</th>
                  <th className="text-right p-4 font-semibold text-gray-900">Revenue</th>
                  <th className="text-right p-4 font-semibold text-gray-900">Avg per Sale</th>
                </tr>
              </thead>
              <tbody>
                {salesData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-gray-500">
                      No sales data for selected period
                    </td>
                  </tr>
                ) : (
                  salesData.map((day) => (
                    <tr key={day.date} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-medium text-gray-900">{day.total_sales}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-bold text-green-600">₹{day.total_revenue.toFixed(2)}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-gray-600">
                          ₹{day.total_sales > 0 ? (day.total_revenue / day.total_sales).toFixed(2) : '0.00'}
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

export default SalesReports;