import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SaleWithDetails, Customer, Staff, Service } from '../../types';
import { hashPassword } from '../Settings/AdminSettings';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleWithDetails | null;
  onSuccess: () => void;
}

interface SaleItem {
  id?: string;
  service_id: string | null;
  staff_id: string;
  price: number;
  discount: number;
  total: number;
}

const EditSaleModal: React.FC<EditSaleModalProps> = ({ isOpen, onClose, sale, onSuccess }) => {
  const { supabaseClient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<string>('cash');
  const [serviceSearchToggles, setServiceSearchToggles] = useState<{ [key: number]: boolean }>({});
  const [serviceSearchQueries, setServiceSearchQueries] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (isOpen && sale) {
      fetchData();
      setSelectedCustomerId(sale.customer_id || '');

      // Map existing single sale to an item list
      if (sale.individual_sales && sale.individual_sales.length > 0) {
        const items = sale.individual_sales.map(s => {
          // Find the service to get the original price. We don't have it directly in the sale record unless we fetch it
          return {
            id: s.id,
            service_id: s.service_id,
            staff_id: s.staff_id || '',
            price: Number(s.total) + Number(s.discount_amount || 0), // Estimate price from total + discount
            discount: Number(s.discount_amount || 0),
            total: Number(s.total)
          };
        });
        setSaleItems(items);
      } else {
        // Fallback for older singular records
        setSaleItems([{
          id: sale.id,
          service_id: sale.service_id || '',
          staff_id: sale.staff_id || '',
          price: Number(sale.total) + Number(sale.discount_amount || 0),
          discount: Number(sale.discount_amount || 0),
          total: Number(sale.total)
        }]);
      }

      setOverallDiscount('0'); // In POS system, overall discount is usually pre-distributed to items or applied differently. Let's keep it 0 as edit.
      setPaymentMode(sale.payment_mode || 'cash');
      setAdminPassword('');
    }
  }, [isOpen, sale]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      const [customersRes, staffRes, servicesRes] = await Promise.all([
        supabaseClient.from('customers').select('*').eq('user_id', user.id).order('name'),
        supabaseClient.from('staff').select('*').eq('user_id', user.id).order('name'),
        supabaseClient.from('services').select('*').eq('user_id', user.id).order('name')
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      if (servicesRes.data) setServices(servicesRes.data);

      // Update item prices based on actual fetched services if we want accurate initial prices
      if (servicesRes.data && saleItems.length > 0) {
        setSaleItems(prev => prev.map(item => {
          const s = servicesRes.data.find((service: any) => service.id === item.service_id);
          const price = s ? Number(s.price) : item.price;
          return {
            ...item,
            price: price,
            total: Math.max(0, price - item.discount)
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminPassword) {
      alert('Please enter admin password');
      return;
    }

    if (!sale) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: adminPasswordData } = await supabaseClient
        .from('admin_passwords')
        .select('password_hash')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!adminPasswordData) {
        alert('Admin password not set. Please set up admin password in settings.');
        return;
      }

      const inputHash = await hashPassword(adminPassword);
      if (inputHash !== adminPasswordData.password_hash) {
        alert('Incorrect admin password');
        return;
      }

      if (saleItems.length === 0) {
        alert('Please add at least one service');
        return;
      }

      for (const item of saleItems) {
        if (!item.service_id) {
          alert('Please select a service for all items');
          return;
        }
      }

      const totalServiceDiscount = saleItems.reduce((sum, item) => sum + item.discount, 0);
      const subtotal = saleItems.reduce((sum, item) => sum + item.price, 0) - totalServiceDiscount;
      const overallDiscountAmount = Number(overallDiscount) || 0;

      // Distribute overall discount proportionally if there are multiple items
      let remainingOverallDiscount = overallDiscountAmount;
      const itemsWithFinalDiscounts = saleItems.map((item, index) => {
        let itemOverallDiscountShare = 0;
        if (subtotal > 0 && overallDiscountAmount > 0) {
          if (index === saleItems.length - 1) {
            itemOverallDiscountShare = remainingOverallDiscount;
          } else {
            itemOverallDiscountShare = Number(((item.total / subtotal) * overallDiscountAmount).toFixed(2));
            remainingOverallDiscount -= itemOverallDiscountShare;
          }
        }

        return {
          ...item,
          finalDiscount: item.discount + itemOverallDiscountShare,
          finalTotal: Math.max(0, item.price - (item.discount + itemOverallDiscountShare))
        };
      });

      // Get original ids to handle deletes
      const originalSaleIds = sale.individual_sales?.map(s => s.id) || [sale.id];
      const newItemIds = itemsWithFinalDiscounts.filter(i => i.id).map(i => i.id);

      const idsToDelete = originalSaleIds.filter(id => !newItemIds.includes(id));

      // Update existing, insert new, delete old
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabaseClient
          .from('sales')
          .delete()
          .in('id', idsToDelete)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
      }

      for (const item of itemsWithFinalDiscounts) {
        const saleData = {
          user_id: user.id,
          customer_id: selectedCustomerId || null,
          staff_id: item.staff_id || null,
          service_id: item.service_id,
          payment_mode: paymentMode,
          discount_amount: item.finalDiscount,
          total: item.finalTotal,
          date: sale.date // Keep original date
        };

        if (item.id) {
          const { error } = await supabaseClient
            .from('sales')
            .update(saleData)
            .eq('id', item.id)
            .eq('user_id', user.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient
            .from('sales')
            .insert([saleData]);
          if (error) throw error;
        }
      }

      alert('Sale updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating sale:', error);
      alert(`Error updating sale: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900">Edit Sale</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.contact ? `(${customer.contact})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Services</label>
                <button
                  type="button"
                  onClick={() => setSaleItems([...saleItems, { service_id: '', staff_id: '', price: 0, discount: 0, total: 0 }])}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Service
                </button>
              </div>

              {saleItems.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg flex flex-col gap-4 border border-gray-200">
                  <div className="flex gap-4 items-start">
                    <div className="flex-1 relative">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search service..."
                          value={serviceSearchToggles[index] ? (serviceSearchQueries[index] || '') : (services.find(s => s.id === item.service_id)?.name || '')}
                          onFocus={() => {
                            setServiceSearchToggles(prev => ({ ...prev, [index]: true }));
                            setServiceSearchQueries(prev => ({ ...prev, [index]: '' }));
                          }}
                          onChange={(e) => {
                            setServiceSearchQueries(prev => ({ ...prev, [index]: e.target.value }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          required={!item.service_id}
                        />
                        {serviceSearchToggles[index] && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {services
                              .filter(service =>
                                service.name.toLowerCase().includes((serviceSearchQueries[index] || '').toLowerCase())
                              )
                              .map((service) => (
                                <div
                                  key={service.id}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                  onClick={() => {
                                    const newPrice = Number(service.price) || 0;
                                    const newItems = [...saleItems];
                                    newItems[index] = {
                                      ...item,
                                      service_id: service.id,
                                      price: newPrice,
                                      total: Math.max(0, newPrice - item.discount)
                                    };
                                    setSaleItems(newItems);
                                    setServiceSearchToggles(prev => ({ ...prev, [index]: false }));
                                  }}
                                >
                                  <div className="font-medium text-gray-900">{service.name}</div>
                                  <div className="text-gray-500">₹{Number(service.price).toFixed(2)}</div>
                                </div>
                              ))}
                            {services.filter(service => service.name.toLowerCase().includes((serviceSearchQueries[index] || '').toLowerCase())).length === 0 && (
                              <div className="px-4 py-2 text-gray-500 text-sm">No services found</div>
                            )}
                          </div>
                        )}
                      </div>
                      {serviceSearchToggles[index] && (
                        <div
                          className="fixed inset-0 z-0"
                          onClick={() => setServiceSearchToggles(prev => ({ ...prev, [index]: false }))}
                        />
                      )}
                    </div>

                    <div className="flex-1">
                      <select
                        value={item.staff_id}
                        onChange={(e) => {
                          const newItems = [...saleItems];
                          newItems[index] = { ...item, staff_id: e.target.value };
                          setSaleItems(newItems);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">-- Select Staff --</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newItems = [...saleItems];
                        newItems.splice(index, 1);
                        setSaleItems(newItems);
                      }}
                      className="text-gray-400 hover:text-red-500 p-2 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount || ''}
                        onChange={(e) => {
                          const discount = Number(e.target.value) || 0;
                          const newItems = [...saleItems];
                          newItems[index] = {
                            ...item,
                            discount,
                            total: Math.max(0, item.price - discount)
                          };
                          setSaleItems(newItems);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="w-1/3 text-right">
                      <div className="text-xs text-gray-500 mb-1">Item Total</div>
                      <div className="font-semibold text-gray-900">₹{item.total.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Discount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Subtotal:</span>
                <span className="font-medium text-gray-900">
                  ₹{saleItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Item Discounts:</span>
                <span className="font-medium text-orange-600">
                  -₹{saleItems.reduce((sum, item) => sum + item.discount, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal after Item Discounts:</span>
                <span className="font-medium text-gray-900">
                  ₹{Math.max(0, saleItems.reduce((sum, item) => sum + item.total, 0)).toFixed(2)}
                </span>
              </div>
              {(Number(overallDiscount) || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Overall Discount:</span>
                  <span className="font-medium text-orange-600">-₹{Number(overallDiscount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                <span className="text-gray-900">Final Total:</span>
                <span className="text-green-600">
                  ₹{Math.max(0, saleItems.reduce((sum, item) => sum + item.total, 0) - (Number(overallDiscount) || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password *
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                placeholder="Enter admin password to confirm changes"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || saleItems.length === 0 || !adminPassword}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Updating...' : 'Update Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSaleModal;
