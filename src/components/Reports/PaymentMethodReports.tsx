import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, PieChart, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface PaymentMethodStats {
  payment_mode: string;
  total_sales: number;
  total_revenue: number;
  percentage: number;
}

const PaymentMethodReports: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [paymentData, setPaymentData] = useState<PaymentMethodStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchPaymentData();
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
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { start, end } = getDateFilter();

      const { data: salesData, error } = await supabaseClient
        .from('sales')
        .select('total, payment_mode')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      // Group by payment method
      const paymentStats = (salesData || []).reduce((acc, sale) => {
        // Handle cases where payment_mode column might not exist or be null
        const paymentMode = sale.payment_mode || 'cash';
        
        if (!acc[paymentMode]) {
          acc[paymentMode] = { 
            total_sales: 0, 
            total_revenue: 0
          };
        }
        acc[paymentMode].total_sales += 1;
        acc[paymentMode].total_revenue += Number(sale.total);
        return acc;
      }, {} as Record<string, { total_sales: number; total_revenue: number }>);

      const totalRevenue = Object.values(paymentStats).reduce((sum, stats) => sum + stats.total_revenue, 0);

      const sortedPaymentData = Object.entries(paymentStats)
        .map(([payment_mode, stats]) => ({
          payment_mode,
          ...stats,
          percentage: totalRevenue > 0 ? (stats.total_revenue / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);

      setPaymentData(sortedPaymentData);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      
      // Check if the error is due to missing payment_mode column
      if (error.message && error.message.includes('payment_mode does not exist')) {
        // Fallback: fetch sales without payment_mode and assume all are cash
        try {
          const { data: fallbackSalesData, error: fallbackError } = await supabaseClient
            .from('sales')
            .select('total')
            .eq('user_id', user.id)
            .gte('date', start)
            .lte('date', end);

          if (fallbackError) throw fallbackError;

          const totalSales = (fallbackSalesData || []).length;
          const totalRevenue = (fallbackSalesData || []).reduce((sum, sale) => sum + Number(sale.total), 0);

          // Create a single "cash" payment method entry
          setPaymentData([{
            payment_mode: 'cash',
            total_sales: totalSales,
            total_revenue: totalRevenue,
            percentage: 100
          }]);
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          alert('Error loading payment method data. The payment_mode column may be missing from your database. Please contact support.');
        }
      } else {
        alert('Error loading payment method data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'day': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'This Month';
      case 'quarter': return 'Last 3 Months';
      case 'custom': return 'Custom Range';
      default: return 'This Month';
    }
  };

  const getPaymentModeIcon = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'card': return '💳';
      case 'upi': return '📱';
      case 'cash': return '💵';
      default: return '💰';
    }
  };

  const getPaymentModeColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-red-500'
    ];
    return colors[index % colors.length];
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
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-100 rounded-lg p-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Method Reports</h1>
            <p className="text-gray-600">{getDateRangeLabel()} Analysis</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-700">Period:</span>
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

        {/* Payment Method Chart */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Method Distribution</h3>
          <div className="space-y-4">
            {paymentData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payment data for selected period
              </div>
            ) : (
              paymentData.map((payment, index) => {
                const maxRevenue = Math.max(...paymentData.map(p => p.total_revenue), 1);
                const barWidth = (payment.total_revenue / maxRevenue) * 100;
                
                return (
                  <div key={payment.payment_mode} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getPaymentModeIcon(payment.payment_mode)}</div>
                        <div>
                          <div className="font-medium text-gray-900 capitalize">{payment.payment_mode}</div>
                          <div className="text-sm text-gray-500">{payment.total_sales} transactions</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">₹{payment.total_revenue.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{payment.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${getPaymentModeColor(index)}`}
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 rounded-lg p-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Most Popular</h3>
            </div>
            {paymentData.length > 0 && (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900 capitalize flex items-center gap-2">
                  <span className="text-3xl">{getPaymentModeIcon(paymentData[0].payment_mode)}</span>
                  {paymentData[0].payment_mode}
                </div>
                <div className="text-green-600 font-semibold">
                  {paymentData[0].total_sales} transactions
                </div>
                <div className="text-sm text-gray-500">
                  ₹{paymentData[0].total_revenue.toFixed(2)} ({paymentData[0].percentage.toFixed(1)}%)
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 rounded-lg p-2">
                <PieChart className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">{paymentData.length}</div>
              <div className="text-blue-600 font-semibold">methods used</div>
              <div className="text-sm text-gray-500">
                Total: {paymentData.reduce((sum, p) => sum + p.total_sales, 0)} transactions
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 rounded-lg p-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Average Transaction</h3>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">
                ₹{paymentData.length > 0 ? (paymentData.reduce((sum, p) => sum + p.total_revenue, 0) / paymentData.reduce((sum, p) => sum + p.total_sales, 0)).toFixed(2) : '0.00'}
              </div>
              <div className="text-purple-600 font-semibold">per transaction</div>
              <div className="text-sm text-gray-500">
                Total Revenue: ₹{paymentData.reduce((sum, p) => sum + p.total_revenue, 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodReports;