import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit, Trash2, Save, X, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Service } from '../../types';

const ServiceManagement: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '' });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabaseClient
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price');
      return;
    }
    
    if (!formData.name.trim()) {
      alert('Please enter a service name');
      return;
    }

    try {
      if (editingId) {
        // Update existing service
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabaseClient
          .from('services')
          .update({ name: formData.name.trim(), price })
          .eq('id', editingId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        setServices(services.map(service => 
          service.id === editingId ? data : service
        ));
        setEditingId(null);
      } else {
        // Add new service
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabaseClient
          .from('services')
          .insert([{ name: formData.name.trim(), price, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        setServices([...services, data]);
        setShowAddForm(false);
      }
      
      setFormData({ name: '', price: '' });
    } catch (error) {
      console.error('Error saving service:', error);
      
      if (error.message?.includes('duplicate key')) {
        alert('A service with this name already exists. Please choose a different name.');
      } else {
        alert(`Error saving service: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({ 
      name: service.name, 
      price: service.price.toString()
    });
  };

  const handleDelete = async (id: string) => {
    // First check if service is used in any sales
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: salesWithService, error: checkError } = await supabaseClient
        .from('sales')
        .select('id')
        .eq('service_id', id)
        .eq('user_id', user.id)
        .limit(1);

      if (checkError) throw checkError;

      if (salesWithService && salesWithService.length > 0) {
        alert('Cannot delete this service because it has been used in sales records. You can only delete services that have never been sold.');
        return;
      }

      if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) return;
    } catch (error) {
      console.error('Error checking service usage:', error);
      alert('Error checking if service can be deleted');
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('services')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setServices(services.filter(service => service.id !== id));
      alert('Service deleted successfully');
    } catch (error) {
      console.error('Error deleting service:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('foreign key')) {
        alert('Cannot delete this service because it is referenced in sales records. Services that have been sold cannot be deleted to maintain data integrity.');
      } else {
        alert(`Error deleting service: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ name: '', price: '' });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 rounded-lg p-2">
              <Briefcase className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
              <p className="text-gray-600">{services.length} services</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Service</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Service name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Service
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

        {/* Services List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-900">Service Name</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Price</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Added</th>
                  <th className="text-right p-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-gray-500">
                      No services found
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        {editingId === service.id ? (
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="font-medium text-gray-900">{service.name}</div>
                        )}
                      </td>
                      <td className="p-4">
                        {editingId === service.id ? (
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.price}
                              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                              className="w-full pl-8 pr-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-green-600">
                            ₹{Number(service.price).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-gray-600">
                          {new Date(service.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === service.id ? (
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
                                onClick={() => handleEdit(service)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(service.id)}
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

export default ServiceManagement;