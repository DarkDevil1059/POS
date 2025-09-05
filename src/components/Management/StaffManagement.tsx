import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, Save, X, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Staff } from '../../types';

const StaffManagement: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabaseClient
        .from('staff')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('name');

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a staff member name');
      return;
    }
    
    try {
      if (editingId) {
        // Update existing staff
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabaseClient
          .from('staff')
          .update({ name: formData.name.trim() })
          .eq('id', editingId)
          .eq('owner_user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        setStaff(staff.map(member => 
          member.id === editingId ? data : member
        ));
        setEditingId(null);
      } else {
        // Add new staff
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabaseClient
          .from('staff')
          .insert([{ name: formData.name.trim(), owner_user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        setStaff([...staff, data]);
        setShowAddForm(false);
      }
      
      setFormData({ name: '' });
    } catch (error) {
      console.error('Error saving staff:', error);
      alert(`Error saving staff member: ${error.message || 'Unknown error'}`);
    }
  };

  const handleEdit = (member: Staff) => {
    setEditingId(member.id);
    setFormData({ name: member.name });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabaseClient
        .from('staff')
        .delete()
        .eq('id', id)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      setStaff(staff.filter(member => member.id !== id));
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error deleting staff');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ name: '' });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 rounded-lg p-2">
              <Settings className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
              <p className="text-gray-600">{staff.length} staff members</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-teal-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Staff</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Staff Member</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Staff member name"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="bg-teal-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Staff
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

        {/* Staff List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs md:text-sm">
                <tr>
                  <th className="text-left p-2 md:p-4 font-semibold text-gray-900">Name</th>
                  <th className="text-left p-2 md:p-4 font-semibold text-gray-900 hidden md:table-cell">Added</th>
                  <th className="text-right p-2 md:p-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center p-4 md:p-8 text-gray-500">
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-2 md:p-4">
                        {editingId === member.id ? (
                          <div className="relative">
                            <User className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ name: e.target.value })}
                              className="w-full pl-8 pr-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                            <div className="bg-teal-100 rounded-full p-2">
                              <User className="w-4 h-4 text-teal-600" />
                            </div>
                            <div>
                              <span className="font-medium text-gray-900 text-sm md:text-base">{member.name}</span>
                              {/* Show date on mobile */}
                              <div className="text-xs text-gray-500 md:hidden">
                                Added {new Date(member.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-2 md:p-4 hidden md:table-cell">
                        <div className="text-gray-600">
                          {new Date(member.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-2 md:p-4">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === member.id ? (
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
                                onClick={() => handleEdit(member)}
                                className="p-1 md:p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              >
                                <Edit className="w-3 h-3 md:w-4 md:h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(member.id)}
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

export default StaffManagement;