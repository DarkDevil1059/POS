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

const EditSaleModal: React.FC<EditSaleModalProps> = ({ isOpen, onClose, sale, onSuccess }) => {
  const { supabaseClient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [serviceDiscount, setServiceDiscount] = useState<string>('0');
  const [overallDiscount, setOverallDiscount] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<string>('cash');

  useEffect(() => {
    if (isOpen && sale) {
      fetchData();
      setSelectedCustomerId(sale.customer_id || '');
      setSelectedStaffId(sale.staff_id || '');
      setSelectedServiceId(sale.service_id || '');
      setServiceDiscount(sale.discount_amount?.toString() || '0');
      setOverallDiscount('0');
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

      const selectedService = services.find(s => s.id === selectedServiceId);
      if (!selectedService) {
        alert('Please select a service');
        return;
      }

      const servicePrice = Number(selectedService.price);
      const serviceDiscountAmount = Number(serviceDiscount) || 0;
      const subtotal = servicePrice - serviceDiscountAmount;
      const overallDiscountAmount = Number(overallDiscount) || 0;
      const finalTotal = Math.max(0, subtotal - overallDiscountAmount);

      const saleIds = sale.individual_sales?.map(s => s.id) || [sale.id];

      const updateData: any = {
        customer_id: selectedCustomerId || null,
        staff_id: selectedStaffId || null,
        service_id: selectedServiceId,
        discount_amount: serviceDiscountAmount + overallDiscountAmount,
        payment_mode: paymentMode,
        total: finalTotal
      };

      const { error } = await supabaseClient
        .from('sales')
        .update(updateData)
        .in('id', saleIds)
        .eq('user_id', user.id);

      if (error) throw error;

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

  const selectedService = services.find(s => s.id === selectedServiceId);
  const servicePrice = selectedService ? Number(selectedService.price) : 0;
  const serviceDiscountAmount = Number(serviceDiscount) || 0;
  const subtotal = Math.max(0, servicePrice - serviceDiscountAmount);
  const overallDiscountAmount = Number(overallDiscount) || 0;
  const finalTotal = Math.max(0, subtotal - overallDiscountAmount);

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service *
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Select Service --</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - ₹{Number(service.price).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Staff
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Select Staff --</option>
                {staff.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Discount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={serviceDiscount}
                  onChange={(e) => setServiceDiscount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
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
                <span className="text-gray-600">Service Price:</span>
                <span className="font-medium text-gray-900">₹{servicePrice.toFixed(2)}</span>
              </div>
              {serviceDiscountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Discount:</span>
                  <span className="font-medium text-orange-600">-₹{serviceDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
              </div>
              {overallDiscountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Overall Discount:</span>
                  <span className="font-medium text-orange-600">-₹{overallDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                <span className="text-gray-900">Final Total:</span>
                <span className="text-green-600">₹{finalTotal.toFixed(2)}</span>
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
              disabled={loading || !selectedServiceId || !adminPassword}
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
