import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Customer } from '../../types';

const CustomerManagement: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', contact: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a customer name');
      return;
    }
    
    try {
      if (editingId) {
        // Update existing customer
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabaseClient
          .from('customers')
          .update({ 
            name: formData.name.trim(), 
            contact: formData.contact.trim() || null 
          })
          .eq('id', editingId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        setCustomers(customers.map(customer => 
          customer.id === editingId ? data : customer
        ));
        setEditingId(null);
      } else {
        // Add new customer
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabaseClient
          .from('customers')
          .insert([{ 
            name: formData.name.trim(), 
            contact: formData.contact.trim() || null,
            user_id: user.id
          }])
          .select()
          .single();

        if (error) throw error;

        setCustomers([...customers, data]);
        setShowAddForm(false);
      }
      
      setFormData({ name: '', contact: '' });
    } catch (error) {
      console.error('Error saving customer:', error);
      alert(`Error saving customer: ${error.message || 'Unknown error'}`);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({ name: customer.name, contact: customer.contact || '' });
  };

  const handleDelete = async (id: string) => {
    // First check if customer is used in any sales
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: salesWithCustomer, error: checkError } = await supabaseClient
        .from('sales')
        .select('id')
        .eq('customer_id', id)
        .eq('user_id', user.id)
        .limit(1);

      if (checkError) throw checkError;

      if (salesWithCustomer && salesWithCustomer.length > 0) {
        alert('Cannot delete this customer because they have sales records. Customers with sales history cannot be deleted to maintain data integrity.');
        return;
      }
    } catch (error) {
      console.error('Error checking customer usage:', error);
      alert('Error checking if customer can be deleted');
      return;
    }

    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { error } = await supabaseClient
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCustomers(customers.filter(customer => customer.id !== id));
    } catch (error) {
      console.error('Error deleting customer:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('foreign key')) {
        alert('Cannot delete this customer because they are referenced in sales records. Customers with sales history cannot be deleted to maintain data integrity.');
      } else {
        alert(`Error deleting customer: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ name: '', contact: '' });
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-gray-600">{customers.length} customers</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Customer</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Customer name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <input
                  type="text"
                  placeholder="Contact (optional)"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Customer
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Customers List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-900">Name</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Contact</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Added</th>
                  <th className="text-right p-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        {editingId === customer.id ? (
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="font-medium text-gray-900">{customer.name}</div>
                        )}
                      </td>
                      <td className="p-4">
                        {editingId === customer.id ? (
                          <input
                            type="text"
                            value={formData.contact}
                            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="text-gray-600">{customer.contact || 'No contact'}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-gray-600">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === customer.id ? (
                            <>
                              <button
                                onClick={handleSubmit}
                                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(customer)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(customer.id)}
                                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
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

export default CustomerManagement;