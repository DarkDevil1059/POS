import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Save, X, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Customer } from '../../types';
import * as XLSX from 'xlsx';

const CustomerManagement: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', contact: '' });
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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

  const downloadTemplate = () => {
    const templateData = [
      ['Customer Name', 'Contact'],
      ['John Doe', 'john@example.com'],
      ['Jane Smith', '555-0123'],
      ['Bob Johnson', 'bob@company.com'],
      ['Walk-in Customer', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers Template');
    XLSX.writeFile(wb, 'customers_template.xlsx');
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
      const validCustomers = [];
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because we skipped header and arrays are 0-indexed
        
        if (!row || row.length < 1) continue; // Skip empty rows
        
        const name = row[0]?.toString().trim();
        const contact = row[1]?.toString().trim() || null;
        
        if (!name) {
          errors.push(`Row ${rowNumber}: Customer name is required`);
          continue;
        }
        
        // Check for duplicate names in the import
        if (validCustomers.some(c => c.name.toLowerCase() === name.toLowerCase())) {
          errors.push(`Row ${rowNumber}: Duplicate customer name "${name}" in import file`);
          continue;
        }
        
        // Check if customer already exists in database
        if (customers.some(c => c.name.toLowerCase() === name.toLowerCase())) {
          errors.push(`Row ${rowNumber}: Customer "${name}" already exists in database`);
          continue;
        }
        
        validCustomers.push({ name, contact });
      }

      if (errors.length > 0) {
        alert(`Import errors found:\n\n${errors.join('\n')}\n\nPlease fix these issues and try again.`);
        return;
      }

      if (validCustomers.length === 0) {
        alert('No valid customers found in the file. Please check your Excel file format.');
        return;
      }

      // Import valid customers
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const customersToInsert = validCustomers.map(customer => ({
        ...customer,
        user_id: user.id
      }));

      const { data: insertedData, error } = await supabaseClient
        .from('customers')
        .insert(customersToInsert)
        .select();

      if (error) throw error;

      setCustomers([...customers, ...insertedData]);
      setShowImportModal(false);
      alert(`Successfully imported ${validCustomers.length} customers!`);
      
    } catch (error) {
      console.error('Error importing customers:', error);
      alert(`Error importing customers: ${error.message || 'Unknown error'}`);
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
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
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-gray-600">{customers.length} customers</p>
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
              className="bg-purple-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Customers from Excel</h3>
              
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
                      <span>Customer Name</span>
                      <span>Contact</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-gray-600">
                      <span>John Doe</span>
                      <span>john@example.com</span>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  {importing && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Importing customers...
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Customer</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Customer
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

        {/* Customers List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs md:text-sm">
                <tr>
                  <th className="text-left p-2 md:p-4 font-semibold text-gray-900">Name</th>
                  <th className="text-left p-2 md:p-4 font-semibold text-gray-900 hidden sm:table-cell">Contact</th>
                  <th className="text-left p-2 md:p-4 font-semibold text-gray-900 hidden md:table-cell">Added</th>
                  <th className="text-right p-2 md:p-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-4 md:p-8 text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-2 md:p-4">
                        {editingId === customer.id ? (
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        ) : (
                          <div>
                            <div className="font-medium text-gray-900 text-sm md:text-base">{customer.name}</div>
                            {/* Show contact on mobile */}
                            <div className="text-xs text-gray-500 sm:hidden">
                              {customer.contact || 'No contact'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-2 md:p-4 hidden sm:table-cell">
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
                      <td className="p-2 md:p-4 hidden md:table-cell">
                        <div className="text-gray-600">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-2 md:p-4">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === customer.id ? (
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
                                onClick={() => handleEdit(customer)}
                                className="p-1 md:p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              >
                                <Edit className="w-3 h-3 md:w-4 md:h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(customer.id)}
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

export default CustomerManagement;