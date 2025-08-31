import React, { useState, useEffect } from 'react';
import { Award, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ServiceStats {
  service_name: string;
  total_sales: number;
  total_revenue: number;
  service_price: number;
}

const BestSellingServices: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [servicesData, setServicesData] = useState<ServiceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'sales' | 'revenue'>('revenue');

  useEffect(() => {
    fetchServicesData();
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

  const fetchServicesData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { start, end } = getDateFilter();

      const { data: salesData, error } = await supabaseClient
        .from('sales')
        .select(`
          total,
          services(name, price)
        `)
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      // Group by service
      const serviceStats = (salesData || []).reduce((acc, sale) => {
        const serviceName = sale.services?.name || 'Unknown Service';
        const servicePrice = sale.services?.price || 0;
        
        if (!acc[serviceName]) {
          acc[serviceName] = { 
            total_sales: 0, 
            total_revenue: 0,
            service_price: servicePrice
          };
        }
        acc[serviceName].total_sales += 1;
        acc[serviceName].total_revenue += Number(sale.total);
        return acc;
      }, {} as Record<string, { total_sales: number; total_revenue: number; service_price: number }>);

      const sortedServices = Object.entries(serviceStats)
        .map(([service_name, stats]) => ({
          service_name,
          ...stats
        }))
        .sort((a, b) => {
          if (sortBy === 'sales') {
            return b.total_sales - a.total_sales;
          }
          return b.total_revenue - a.total_revenue;
        });

      setServicesData(sortedServices);
    } catch (error) {
      console.error('Error fetching services data:', error);
      alert('Error loading services data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const maxValue = Math.max(
    ...servicesData.map(s => sortBy === 'sales' ? s.total_sales : s.total_revenue), 
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-green-100 rounded-lg p-2">
            <Award className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Best-Selling Services</h1>
            <p className="text-gray-600">{getDateRangeLabel()} Performance</p>
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
                      ? 'bg-green-600 text-white'
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
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'sales' | 'revenue')}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="revenue">Revenue</option>
                <option value="sales">Sales Count</option>
              </select>
            </div>
          </div>
        </div>

        {/* Services Performance Chart */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Services by {sortBy === 'sales' ? 'Sales Count' : 'Revenue'}
          </h3>
          <div className="space-y-4">
            {servicesData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No services data for selected period
              </div>
            ) : (
              servicesData.map((service, index) => {
                const value = sortBy === 'sales' ? service.total_sales : service.total_revenue;
                const percentage = (value / maxValue) * 100;
                
                return (
                  <div key={service.service_name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{service.service_name}</div>
                          <div className="text-sm text-gray-500">₹{service.service_price.toFixed(2)} per service</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {sortBy === 'sales' ? `${service.total_sales} sales` : `₹${service.total_revenue.toFixed(2)}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {sortBy === 'sales' ? `₹${service.total_revenue.toFixed(2)}` : `${service.total_sales} sales`}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-500' :
                          index === 2 ? 'bg-orange-500' :
                          'bg-green-500'
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

        {/* Summary Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 rounded-lg p-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Top Performer</h3>
            </div>
            {servicesData.length > 0 && (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">{servicesData[0].service_name}</div>
                <div className="text-green-600 font-semibold">
                  {sortBy === 'sales' 
                    ? `${servicesData[0].total_sales} sales` 
                    : `₹${servicesData[0].total_revenue.toFixed(2)} revenue`}
                </div>
                <div className="text-sm text-gray-500">
                  {sortBy === 'sales' 
                    ? `₹${servicesData[0].total_revenue.toFixed(2)} total revenue` 
                    : `${servicesData[0].total_sales} total sales`}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 rounded-lg p-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Service Insights</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Services:</span>
                <span className="font-semibold">{servicesData.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Most Expensive:</span>
                <span className="font-semibold">
                  ₹{Math.max(...servicesData.map(s => s.service_price), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Least Expensive:</span>
                <span className="font-semibold">
                  ₹{servicesData.length > 0 ? Math.min(...servicesData.map(s => s.service_price)).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Price:</span>
                <span className="font-semibold">
                  ₹{servicesData.length > 0 ? (servicesData.reduce((sum, s) => sum + s.service_price, 0) / servicesData.length).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestSellingServices;