import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit, Trash2, Save, X, DollarSign, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Service } from '../../types';
import * as XLSX from 'xlsx';

const ServiceManagement: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '' });
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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

  const downloadTemplate = () => {
    const templateData = [
      ['Service Name', 'Price'],
      ['Haircut', '25.00'],
      ['Hair Wash', '15.00'],
      ['Styling', '35.00'],
      ['Color Treatment', '75.00']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Services Template');
    XLSX.writeFile(wb, 'services_template.xlsx');
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip header row and process data
      const rows = jsonData.slice(1) as string[][];
      const validServices = [];
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because we skipped header and arrays are 0-indexed
        
        if (!row || row.length < 2) continue; // Skip empty rows
        
        const name = row[0]?.toString().trim();
        const priceStr = row[1]?.toString().trim();
        
        if (!name) {
          errors.push(`Row ${rowNumber}: Service name is required`);
          continue;
        }
        
        const price = parseFloat(priceStr);
        if (isNaN(price) || price < 0) {
          errors.push(`Row ${rowNumber}: Invalid price "${priceStr}". Must be a positive number.`);
          continue;
        }
        
        // Check for duplicate names in the import
        if (validServices.some(s => s.name.toLowerCase() === name.toLowerCase())) {
          errors.push(`Row ${rowNumber}: Duplicate service name "${name}" in import file`);
          continue;
        }
        
        // Check if service already exists in database
        if (services.some(s => s.name.toLowerCase() === name.toLowerCase())) {
          errors.push(`Row ${rowNumber}: Service "${name}" already exists in database`);
          continue;
        }
        
        validServices.push({ name, price });
      }

      if (errors.length > 0) {
        alert(`Import errors found:\n\n${errors.join('\n')}\n\nPlease fix these issues and try again.`);
        return;
      }

      if (validServices.length === 0) {
        alert('No valid services found in the file. Please check your Excel file format.');
        return;
      }

      // Import valid services
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const servicesToInsert = validServices.map(service => ({
        ...service,
        user_id: user.id
      }));

      const { data, error } = await supabaseClient
        .from('services')
        .insert(servicesToInsert)
        .select();

      if (error) throw error;

      setServices([...services, ...data]);
      setShowImportModal(false);
      alert(`Successfully imported ${validServices.length} services!`);
      
    } catch (error) {
      console.error('Error importing services:', error);
      alert(`Error importing services: ${error.message || 'Unknown error'}`);
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
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
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 rounded-lg p-2">
              <Briefcase className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
              <p className="text-gray-600">{services.length} services</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import Excel</span>
              <span className="sm:hidden">Import</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-orange-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Service</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Services from Excel</h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Excel Format Required</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    Your Excel file should have these columns:
                  </p>
                  <div className="bg-white rounded border p-2 text-xs font-mono">
                    <div className="grid grid-cols-2 gap-4 font-bold border-b pb-1 mb-1">
                      <span>Service Name</span>
                      <span>Price</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-gray-600">
                      <span>Haircut</span>
                      <span>25.00</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={downloadTemplate}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>

                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Excel File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileImport}
                    disabled={importing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                  {importing && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Importing services...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={importing}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Service</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="bg-orange-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Service
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-300 text-gray-700 px-4 py-3 md:py-2 rounded-lg hover:bg-gray-400 transition-colors flex items-center justify-center gap-2"
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
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs md:text-sm">
                <tr>
                  <th className="text-left p-2 md:p-4 font-semibold text-gray-900">Service</th>
                  <th className="text-left p-2 md:p-4 font-semibold text-gray-900">Price</th>
                  <th className="text-left p-2 md:p-4 font-semibold text-gray-900 hidden md:table-cell">Added</th>
                  <th className="text-right p-2 md:p-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-4 md:p-8 text-gray-500">
                      No services found
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-2 md:p-4">
                        {editingId === service.id ? (
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        ) : (
                          <div>
                            <div className="font-medium text-gray-900 text-sm md:text-base">{service.name}</div>
                            {/* Show date on mobile */}
                            <div className="text-xs text-gray-500 md:hidden">
                              Added {new Date(service.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-2 md:p-4">
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
                          <div className="text-sm md:text-lg font-bold text-green-600">
                            ₹{Number(service.price).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="p-2 md:p-4 hidden md:table-cell">
                        <div className="text-gray-600">
                          {new Date(service.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-2 md:p-4">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === service.id ? (
                            <>
                              <button
                                onClick={handleSubmit}
                                className="p-1 md:p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                              >
                                <Save className="w-3 h-3 md:w-4 md:h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 md:p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                <X className="w-3 h-3 md:w-4 md:h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(service)}
                                className="p-1 md:p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              >
                                <Edit className="w-3 h-3 md:w-4 md:h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(service.id)}
                                className="p-1 md:p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
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