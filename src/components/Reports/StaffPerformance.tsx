import React, { useState, useEffect } from 'react';
import { Users, Calendar, Trophy, Target, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface StaffStats {
  staff_name: string;
  total_sales: number;
  total_revenue: number;
  average_sale_value: number;
}

const StaffPerformance: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [staffData, setStaffData] = useState<StaffStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'sales' | 'revenue'>('revenue');

  useEffect(() => {
    fetchStaffData();
  }, [dateRange, startDate, endDate, sortBy]);

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

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { start, end } = getDateFilter();

      const { data: salesData, error } = await supabaseClient
        .from('sales')
        .select(`
          total,
          staff(name)
        `)
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      // Group by staff
      const staffStats = (salesData || []).reduce((acc, sale) => {
        const staffName = sale.staff?.name || 'Unknown Staff';
        
        if (!acc[staffName]) {
          acc[staffName] = { 
            total_sales: 0, 
            total_revenue: 0
          };
        }
        acc[staffName].total_sales += 1;
        acc[staffName].total_revenue += Number(sale.total);
        return acc;
      }, {} as Record<string, { total_sales: number; total_revenue: number }>);

      const sortedStaff = Object.entries(staffStats)
        .map(([staff_name, stats]) => ({
          staff_name,
          ...stats,
          average_sale_value: stats.total_sales > 0 ? stats.total_revenue / stats.total_sales : 0
        }))
        .sort((a, b) => {
          if (sortBy === 'sales') {
            return b.total_sales - a.total_sales;
          }
          return b.total_revenue - a.total_revenue;
        });

      setStaffData(sortedStaff);
    } catch (error) {
      console.error('Error fetching staff data:', error);
      alert('Error loading staff performance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const maxValue = Math.max(
    ...staffData.map(s => sortBy === 'sales' ? s.total_sales : s.total_revenue), 
    1
  );

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

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-purple-100 rounded-lg p-2">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Performance</h1>
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
                      ? 'bg-purple-600 text-white'
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
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'sales' | 'revenue')}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="revenue">Revenue</option>
                <option value="sales">Sales Count</option>
              </select>
            </div>
          </div>
        </div>

        {/* Staff Performance Chart */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Performance by {sortBy === 'sales' ? 'Sales Count' : 'Revenue'}
          </h3>
          <div className="space-y-4">
            {staffData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No staff performance data for selected period
              </div>
            ) : (
              staffData.map((staff, index) => {
                const value = sortBy === 'sales' ? staff.total_sales : staff.total_revenue;
                const percentage = (value / maxValue) * 100;
                
                return (
                  <div key={staff.staff_name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-gold-100 text-yellow-800 border-2 border-yellow-300' :
                          index === 1 ? 'bg-gray-100 text-gray-800 border-2 border-gray-300' :
                          index === 2 ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{staff.staff_name}</div>
                          <div className="text-sm text-gray-500">
                            Avg: ₹{staff.average_sale_value.toFixed(2)} per sale
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">
                          {sortBy === 'sales' ? `${staff.total_sales} sales` : `₹${staff.total_revenue.toFixed(2)}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {sortBy === 'sales' ? `₹${staff.total_revenue.toFixed(2)}` : `${staff.total_sales} sales`}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                          index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                          'bg-gradient-to-r from-purple-400 to-purple-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 rounded-lg p-2">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Top Performer</h3>
            </div>
            {staffData.length > 0 && (
              <div className="space-y-2">
                <div className="text-xl font-bold text-gray-900">{staffData[0].staff_name}</div>
                <div className="text-green-600 font-semibold">
                  ₹{staffData[0].total_revenue.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">{staffData[0].total_sales} sales</div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 rounded-lg p-2">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Team Average</h3>
            </div>
            <div className="space-y-2">
              <div className="text-xl font-bold text-gray-900">
                ₹{staffData.length > 0 ? (staffData.reduce((sum, s) => sum + s.total_revenue, 0) / staffData.length).toFixed(2) : '0.00'}
              </div>
              <div className="text-blue-600 font-semibold">per staff member</div>
              <div className="text-sm text-gray-500">
                {staffData.length > 0 ? Math.round(staffData.reduce((sum, s) => sum + s.total_sales, 0) / staffData.length) : 0} avg sales
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 rounded-lg p-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Best Sale Value</h3>
            </div>
            <div className="space-y-2">
              <div className="text-xl font-bold text-gray-900">
                ₹{staffData.length > 0 ? Math.max(...staffData.map(s => s.average_sale_value)).toFixed(2) : '0.00'}
              </div>
              <div className="text-orange-600 font-semibold">highest average</div>
              <div className="text-sm text-gray-500">
                {staffData.length > 0 ? staffData.find(s => s.average_sale_value === Math.max(...staffData.map(s => s.average_sale_value)))?.staff_name : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPerformance;