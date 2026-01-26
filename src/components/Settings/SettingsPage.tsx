import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Image,
  Building2,
  Receipt,
  Shield,
  Upload,
  Phone,
  MapPin,
  Download,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLogoUpload } from '../../hooks/useLogoUpload';

const SettingsPage: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();
  const { supabaseClient } = useAuth();

  const [formData, setFormData] = useState({
    shopName: settings?.shop_name || 'POS System',
    address: settings?.address || '',
    contactNumber: settings?.contact_number || '',
    receiptFooter: settings?.receipt_footer || 'Thank you for your business!',
    autoPrint: settings?.auto_print || false,
    showCustomerDetails: settings?.show_customer_details ?? true,
    showLogo: settings?.show_logo ?? true,
    showShopName: settings?.show_shop_name ?? true,
    sessionTimeout: settings?.session_timeout || 30,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('business');

  const { uploadLogo, uploading } = useLogoUpload();

  useEffect(() => {
    if (settings) {
      setFormData({
        shopName: settings.shop_name,
        address: settings.address || '',
        contactNumber: settings.contact_number || '',
        receiptFooter: settings.receipt_footer || 'Thank you for your business!',
        autoPrint: settings.auto_print || false,
        showCustomerDetails: settings.show_customer_details ?? true,
        showLogo: settings.show_logo ?? true,
        showShopName: settings.show_shop_name ?? true,
        sessionTimeout: settings.session_timeout || 30,
      });
      setLogoUrl(settings.shop_logo_url || null);
    }
  }, [settings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setLogoFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let newLogoUrl = logoUrl;

      if (logoFile) {
        newLogoUrl = await uploadLogo(logoFile);
        setLogoUrl(newLogoUrl);
        setLogoFile(null);
      }

      await updateSettings({
        shop_name: formData.shopName,
        shop_logo_url: newLogoUrl,
        address: formData.address,
        contact_number: formData.contactNumber,
        receipt_footer: formData.receiptFooter,
        auto_print: formData.autoPrint,
        show_customer_details: formData.showCustomerDetails,
        show_logo: formData.showLogo,
        show_shop_name: formData.showShopName,
        session_timeout: formData.sessionTimeout,
      });
      alert('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(`Error saving settings: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'business', label: 'Business Settings', icon: Building2 },
    { id: 'billing', label: 'Billing & Receipt', icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 rounded-lg p-3">
                <SettingsIcon className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">Manage your business preferences and configurations</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 sticky top-4">
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                          activeSection === section.id
                            ? 'bg-green-50 text-green-700 font-medium shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Business Settings */}
                {activeSection === 'business' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <div className="border-b border-gray-200 pb-4">
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-green-600" />
                        Business Settings
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">Configure your business information and branding</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {/* Business Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.shopName}
                          onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          placeholder="Enter your business name"
                          required
                        />
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Address
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                          placeholder="Enter your business address"
                          rows={3}
                        />
                      </div>

                      {/* Contact Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Contact Number
                        </label>
                        <input
                          type="tel"
                          value={formData.contactNumber}
                          onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>

                      {/* Logo Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Business Logo
                        </label>

                        {logoUrl && (
                          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-4">
                              <img
                                src={logoUrl}
                                alt="Current logo"
                                className="h-20 w-20 object-contain rounded-lg bg-white border border-gray-200 p-2"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Current Logo</p>
                                <p className="text-xs text-gray-600 mt-1">Upload a new image to replace</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="relative">
                          <input
                            type="file"
                            id="logo"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="logo"
                            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer"
                          >
                            <Upload className="w-5 h-5 text-gray-600" />
                            <span className="text-sm text-gray-700">
                              {logoFile ? logoFile.name : 'Choose file or drag and drop'}
                            </span>
                          </label>
                          {logoFile && (
                            <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                              <Image className="w-4 h-4" />
                              <span>Ready to upload: {logoFile.name}</span>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 5MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing & Receipt */}
                {activeSection === 'billing' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <div className="border-b border-gray-200 pb-4">
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-green-600" />
                        Billing & Receipt
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">Customize receipt appearance and printing behavior</p>
                    </div>

                    <div className="space-y-6">
                      {/* Receipt Footer */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Receipt Footer Message
                        </label>
                        <textarea
                          value={formData.receiptFooter}
                          onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                          placeholder="Thank you for your business!"
                          rows={3}
                        />
                        <p className="text-xs text-gray-500 mt-1">This message will appear at the bottom of receipts</p>
                      </div>

                      {/* Toggle Options */}
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Auto Print After Sale</p>
                            <p className="text-xs text-gray-600 mt-1">Automatically print receipt after completing a sale</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, autoPrint: !formData.autoPrint })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              formData.autoPrint ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formData.autoPrint ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div>
                            <p className="font-medium text-gray-900">Show Logo on Receipt</p>
                            <p className="text-xs text-gray-600 mt-1">Display business logo on printed receipts</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, showLogo: !formData.showLogo })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              formData.showLogo ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formData.showLogo ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div>
                            <p className="font-medium text-gray-900">Show Shop Name on Receipt</p>
                            <p className="text-xs text-gray-600 mt-1">Display business name on printed receipts</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, showShopName: !formData.showShopName })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              formData.showShopName ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formData.showShopName ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div>
                            <p className="font-medium text-gray-900">Show Customer Details</p>
                            <p className="text-xs text-gray-600 mt-1">Display customer name on receipts</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, showCustomerDetails: !formData.showCustomerDetails })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              formData.showCustomerDetails ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formData.showCustomerDetails ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* Save Button - Always Visible */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Uploading...
                      </>
                    ) : saving ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
