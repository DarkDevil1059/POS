import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check, User, ShoppingBag, Receipt, Search, Plus, Minus, X, FileText, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Customer, Staff, Service, SaleItem } from '../../types';

const POSScreen: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = useState<SaleItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState({ type: 'percentage' as 'percentage' | 'amount', value: 0 });
  
  // UI state
  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerContact, setNewCustomerContact] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');
  
  // Post-sale popup state
  const [showSaleCompleteModal, setShowSaleCompleteModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const [customersRes, staffRes, servicesRes] = await Promise.all([
        supabaseClient.from('customers').select('*').eq('user_id', user.id).order('name'),
        supabaseClient.from('staff').select('*').eq('owner_user_id', user.id).order('name'),
        supabaseClient.from('services').select('*').eq('user_id', user.id).order('name'),
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addCustomer = async () => {
    if (!newCustomerName.trim()) return;

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabaseClient
        .from('customers')
        .insert([{ 
          name: newCustomerName.trim(), 
          contact: newCustomerContact.trim() || null,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setCustomers([...customers, data]);
      setSelectedCustomer(data);
      setNewCustomerName('');
      setNewCustomerContact('');
      setShowAddCustomer(false);
    } catch (error) {
      console.error('Error adding customer:', error);
      alert(`Error adding customer: ${error.message || 'Unknown error'}`);
    }
  };

  const addService = (service: Service) => {
    const existingItem = selectedServices.find(item => item.service_id === service.id);
    
    if (existingItem) {
      setSelectedServices(selectedServices.map(item =>
        item.service_id === service.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: SaleItem = {
        service_id: service.id,
        service_name: service.name,
        price: service.price,
        quantity: 1,
        staff_id: staff[0]?.id || null,
        staff_name: staff[0]?.name || null,
      };
      setSelectedServices([...selectedServices, newItem]);
    }
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(item => item.service_id !== serviceId));
  };

  const updateServiceQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeService(serviceId);
      return;
    }
    
    setSelectedServices(selectedServices.map(item =>
      item.service_id === serviceId
        ? { ...item, quantity }
        : item
    ));
  };

  const updateServiceStaff = (serviceId: string, staffId: string) => {
    const selectedStaffMember = staff.find(s => s.id === staffId);
    
    setSelectedServices(selectedServices.map(item =>
      item.service_id === serviceId
        ? { 
            ...item, 
            staff_id: staffId,
            staff_name: selectedStaffMember?.name || null
          }
        : item
    ));
  };

  const updateServiceDiscount = (serviceId: string, discountType: 'percentage' | 'amount', discountValue: number) => {
    setSelectedServices(selectedServices.map(item =>
      item.service_id === serviceId
        ? { 
            ...item, 
            discount_type: discountType,
            discount_percentage: discountType === 'percentage' ? discountValue : undefined,
            discount_amount: discountType === 'amount' ? discountValue : undefined
          }
        : item
    ));
  };

  const getServiceDiscountedPrice = (item: SaleItem): number => {
    let discountedPrice = item.price;
    
    if (item.discount_type === 'percentage' && item.discount_percentage) {
      discountedPrice = item.price * (1 - item.discount_percentage / 100);
    } else if (item.discount_type === 'amount' && item.discount_amount) {
      discountedPrice = Math.max(0, item.price - item.discount_amount);
    }
    
    return discountedPrice;
  };

  const completeSale = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate subtotal (without any discounts)
      const subtotal = selectedServices.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Calculate service-level discounts
      const serviceDiscountTotal = selectedServices.reduce((sum, item) => {
        const originalTotal = item.price * item.quantity;
        const discountedTotal = getServiceDiscountedPrice(item) * item.quantity;
        return sum + (originalTotal - discountedTotal);
      }, 0);
      
      // Calculate subtotal after service discounts
      const subtotalAfterServiceDiscounts = subtotal - serviceDiscountTotal;
      
      // Calculate overall discount
      let overallDiscountAmount = 0;
      if (overallDiscount.value > 0) {
        if (overallDiscount.type === 'percentage') {
          overallDiscountAmount = subtotalAfterServiceDiscounts * (overallDiscount.value / 100);
        } else {
          overallDiscountAmount = Math.min(overallDiscount.value, subtotalAfterServiceDiscounts);
        }
      }
      
      const finalTotal = Math.max(0, subtotalAfterServiceDiscounts - overallDiscountAmount);

      // Store sale data for the popup
      const saleData = {
        customer: selectedCustomer,
        services: selectedServices,
        subtotal,
        serviceDiscountTotal,
        overallDiscountAmount,
        finalTotal,
        date: new Date().toISOString(),
        paymentMode: paymentMode
      };

      // Create individual sale records for each service
      for (const serviceItem of selectedServices) {
        const serviceDiscountedPrice = getServiceDiscountedPrice(serviceItem);
        const serviceSubtotal = serviceDiscountedPrice * serviceItem.quantity;
        
        // Calculate proportional overall discount for this service
        const serviceOverallDiscount = subtotalAfterServiceDiscounts > 0 ? (serviceSubtotal / subtotalAfterServiceDiscounts) * overallDiscountAmount : 0;
        const serviceFinalPrice = Math.max(0, serviceDiscountedPrice - (serviceOverallDiscount / serviceItem.quantity));
        
        for (let i = 0; i < serviceItem.quantity; i++) {
          const individualSaleData = {
            customer_id: selectedCustomer!.id,
            staff_id: serviceItem.staff_id,
            service_id: serviceItem.service_id,
            total: serviceFinalPrice,
            date: new Date().toISOString(),
            user_id: user.id,
            discount_amount: (serviceItem.discount_amount || 0) + (serviceOverallDiscount / serviceItem.quantity),
            payment_mode: paymentMode
          };

          const { error } = await supabaseClient
            .from('sales')
            .insert([individualSaleData]);

          if (error) throw error;
        }
      }

      // Show completion modal instead of alert
      setCompletedSale(saleData);
      setShowSaleCompleteModal(true);
      
    } catch (error) {
      console.error('Error completing sale:', error);
      alert(`Error completing sale: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetPOS = () => {
    setCurrentStep(1);
    setSelectedCustomer(null);
    setSelectedServices([]);
    setOverallDiscount({ type: 'percentage', value: 0 });
    setCustomerSearch('');
    setServiceSearch('');
    setShowAddCustomer(false);
    setShowSaleCompleteModal(false);
    setCompletedSale(null);
    setPaymentMode('cash');
  };

  
const printReceipt = () => {
  if (!completedSale) {
    alert("No sale data available to print.");
    return;
  }

  try {
    const services = completedSale.services || [];
    const customer = completedSale.customer || {};

    const receiptRows = services.map((item) => {
      const originalTotal = item.price * item.quantity;
      const discountedPrice =
        item.discount_type === "percentage"
          ? item.price * (1 - (item.discount_percentage || 0) / 100)
          : item.discount_type === "amount"
          ? Math.max(0, item.price - (item.discount_amount || 0))
          : item.price;

      const lineTotal = discountedPrice * item.quantity;
      const discountShown = originalTotal - lineTotal;

      return `
        <tr>
          <td>${item.service_name || ""}</td>
          <td>₹${(item.price || 0).toFixed(2)}</td>
          <td>${item.quantity || 0}</td>
          <td>₹${discountShown.toFixed(2)}</td>
          <td>₹${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

const receiptContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Invoice</title>
    <style>
      @page { size: 100mm auto; margin: 0; }
      body { font-family: 'Poppins', sans-serif; margin: 0; padding: 14px; }
      .receipt { width: 100mm; font-size: 14px; }
      .center { text-align: center; }
      .shop-name { font-weight: 900; text-transform: uppercase; font-size: 16px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0; }
      th, td { 
        padding: 8px 4px;  /* was 5px → more vertical space */
        border-bottom: 1px dashed #000; 
      }
      .totals { margin-top: 12px; text-align: right; font-size: 13px; }
      .grand-total { font-size: 18px; font-weight: 700; text-align: right; margin-top: 12px; }
      hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
      .section { margin-bottom: 8px; }
      .bold-line { border: none; border-top: 2px solid #000; margin: 8px 0; }
    </style>
  </head>
  <body onload="window.print()">
    <div class="receipt">
      <div class="center">
        <div class="shop-name">SALON7</div>
        51, Gajapathy St, Shenoy Nagar, Chennai–30<br/>
        Contact: 044 3555 4106, 9840722893
      </div>
      <hr />
      <div class="section">
        <strong>Invoice To:</strong><br/>
        ${customer.name || "Walk-in Customer"}<br/>
        ${customer.contact || ""}
      </div>
      <div class="section">
        <strong>Payment Mode:</strong> ${completedSale.paymentMode || "Cash"}
      </div>
      <div class="section">
        <strong>Date:</strong> ${completedSale.date ? new Date(completedSale.date).toLocaleDateString() : ""}<br/>
        <strong>Time:</strong> ${completedSale.date ? new Date(completedSale.date).toLocaleTimeString() : ""}<br/>
      </div>
      <hr />
      <table>
        <thead>
          <tr><th>Service</th><th>Price</th><th>Qty</th><th>Disc</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${receiptRows}
        </tbody>
      </table>
      <div class="totals">
        Sub Total: ₹${(completedSale.subtotal || 0).toFixed(2)}<br/>
        ${completedSale.serviceDiscountTotal > 0 ? `Service Discounts: ₹${completedSale.serviceDiscountTotal.toFixed(2)}<br/>` : ""}
        ${completedSale.overallDiscountAmount > 0 ? `Overall Discount: ₹${completedSale.overallDiscountAmount.toFixed(2)}<br/>` : ""}
      </div>
      <hr class="bold-line" />
      <div class="grand-total">
        Grand Total: ₹${(completedSale.finalTotal || 0).toFixed(2)}
      </div>
      <div class="center" style="margin-top:12px;"><strong>Thank you for visiting Salon 7</strong></div>
    </div>
  </body>
  </html>
`;


    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Unable to open print window. Please check your browser settings.");
      return;
    }

    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.focus();
  } catch (error) {
    console.error("Error printing receipt:", error);
    alert("An unexpected error occurred while preparing the receipt.");
  }
};


  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedFromStep1 = selectedCustomer !== null;
  const canProceedFromStep2 = selectedServices.length > 0 && selectedServices.every(item => item.staff_id);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (customer.contact && customer.contact.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // Calculate subtotal (original prices without any discounts)
  const subtotal = selectedServices.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate service-level discounts
  const serviceDiscountTotal = selectedServices.reduce((sum, item) => {
    const originalTotal = item.price * item.quantity;
    const discountedTotal = getServiceDiscountedPrice(item) * item.quantity;
    return sum + (originalTotal - discountedTotal);
  }, 0);
  
  // Calculate subtotal after service discounts
  const subtotalAfterServiceDiscounts = subtotal - serviceDiscountTotal;
  
  // Calculate overall discount
  const overallDiscountAmount = overallDiscount.value > 0 
    ? overallDiscount.type === 'percentage' 
      ? subtotalAfterServiceDiscounts * (overallDiscount.value / 100)
      : Math.min(overallDiscount.value, subtotalAfterServiceDiscounts)
    : 0;
    
  const finalTotal = Math.max(0, subtotalAfterServiceDiscounts - overallDiscountAmount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Point of Sale
            </h1>
            <p className="text-gray-600">Complete your sale in 3 simple steps</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                    step === currentStep 
                      ? 'bg-blue-600 text-white shadow-lg scale-110' 
                      : step < currentStep 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-2 transition-all duration-300 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-4">
              <div className="text-sm font-medium text-gray-600">
                Step {currentStep} of 3: {
                  currentStep === 1 ? 'Select Customer' :
                  currentStep === 2 ? 'Add Services' :
                  'Review & Confirm'
                }
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 min-h-[500px]">
            {/* Step 1: Customer Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-100 rounded-full p-3">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Select Customer</h2>
                </div>

                {!showAddCustomer ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search customers by name or contact..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>

                    <div className="grid gap-3 max-h-80 overflow-y-auto">
                      {filteredCustomers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          {customerSearch ? 'No customers found' : 'No customers available'}
                        </div>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => setSelectedCustomer(customer)}
                            className={`p-4 text-left rounded-xl border-2 transition-all duration-200 ${
                              selectedCustomer?.id === customer.id
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <div className="font-semibold text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-600">{customer.contact || 'No contact'}</div>
                          </button>
                        ))
                      )}
                    </div>

                    <button
  onClick={() => {
    // Auto-fill new customer form with whatever was typed
    if (customerSearch.trim()) {
      setNewCustomerName(customerSearch.trim());
      // If it's all numbers, assume it's a phone number
      if (/^\d+$/.test(customerSearch.trim())) {
        setNewCustomerContact(customerSearch.trim());
        setNewCustomerName('');
      }
    }
    setShowAddCustomer(true);
  }}
  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
>
  <Plus className="w-5 h-5" />
  Add New Customer
</button>

                  </>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add New Customer</h3>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Customer name"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Contact (optional)"
                        value={newCustomerContact}
                        onChange={(e) => setNewCustomerContact(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={addCustomer}
                          className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium"
                        >
                          Add Customer
                        </button>
                        <button
                      onClick={() => {
                                    setShowAddCustomer(false);
                                    setNewCustomerName('');
                                    setNewCustomerContact('');
  }}
  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-all duration-200 font-medium"
>
  Cancel
</button>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Add Services */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-green-100 rounded-full p-3">
                    <ShoppingBag className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Add Services</h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Available Services */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Available Services</h3>
                    
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search services..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {filteredServices.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          {serviceSearch ? 'No services found' : 'No services available'}
                        </div>
                      ) : (
                        filteredServices.map((service) => (
                          <button
                            key={service.id}
                            onClick={() => addService(service)}
                            className="w-full p-4 text-left rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                          >
                            <div className="font-medium text-gray-900">{service.name}</div>
                            <div className="text-lg font-bold text-green-600">
                              ₹{Number(service.price).toFixed(2)}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Selected Services */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Selected Services</h3>
                    
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {selectedServices.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                          No services selected
                        </div>
                      ) : (
                        selectedServices.map((item) => (
                          <div key={item.service_id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{item.service_name}</div>
                                <div className="text-green-600 font-bold">
                                  ₹{item.price.toFixed(2)} each
                                </div>
                              </div>
                              
                              <button
                                onClick={() => removeService(item.service_id)}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Qty:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateServiceQuantity(item.service_id, item.quantity - 1)}
                                    className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                                  <button
                                    onClick={() => updateServiceQuantity(item.service_id, item.quantity + 1)}
                                    className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Assign Staff:</label>
                              <select
                                value={item.staff_id || ''}
                                onChange={(e) => updateServiceStaff(item.service_id, e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                                  !item.staff_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                }`}
                              >
                                <option value="">Select Staff</option>
                                {staff.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                  </option>
                                ))}
                              </select>
                              {!item.staff_id && (
                                <p className="text-xs text-red-600 mt-1">Staff assignment required</p>
                              )}
                            </div>
                            
                            {/* Discount Section */}
<div className="border-t border-gray-200 pt-3 mt-3">
  <label className="block text-sm text-gray-600 mb-2">Service Discount (Optional):</label>

  {/* Toggle Buttons */}
  <div className="flex gap-2 mb-2">
    <button
      type="button"
      onClick={() => updateServiceDiscount(item.service_id, 'percentage', item.discount_percentage || 0)}
      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
        (item.discount_type || 'percentage') === 'percentage'
          ? 'bg-green-600 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      Percentage (%)
    </button>
    <button
      type="button"
      onClick={() => updateServiceDiscount(item.service_id, 'amount', item.discount_amount || 0)}
      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
        item.discount_type === 'amount'
          ? 'bg-green-600 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      Fixed Amount (₹)
    </button>
  </div>

  {/* Input Box */}
  <input
    type="number"
    min="0"
    max={item.discount_type === 'percentage' ? 100 : item.price}
    step={item.discount_type === 'percentage' ? 1 : 0.01}
    value={
      item.discount_type === 'percentage'
        ? (item.discount_percentage || 0)
        : (item.discount_amount || 0)
    }
    onChange={(e) => {
      const value = parseFloat(e.target.value) || 0;
      updateServiceDiscount(item.service_id, item.discount_type || 'percentage', value);
    }}
    className="w-28 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-green-500"
    placeholder={item.discount_type === 'percentage' ? '0%' : '₹0'}
  />

  {/* Preview */}
  <div className="text-xs text-gray-500 mt-1">
    {item.discount_type === 'percentage' && item.discount_percentage
      ? `₹${(item.price * item.discount_percentage / 100).toFixed(2)} off`
      : item.discount_type === 'amount' && item.discount_amount
      ? `${((item.discount_amount / item.price) * 100).toFixed(1)}% off`
      : 'No discount'}
  </div>
</div>



                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Sale Summary */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-purple-100 rounded-full p-3">
                    <Receipt className="w-6 h-6 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Review & Confirm</h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium text-gray-900">{selectedCustomer?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contact:</span>
                        <span className="font-medium text-gray-900">{selectedCustomer?.contact || 'No contact'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Items:</span>
                        <span className="font-medium text-gray-900">{selectedServices.length} services</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Quantity:</span>
                        <span className="font-medium text-gray-900">
                          {selectedServices.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
                      </div>
                      {serviceDiscountTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-red-600">Service Discounts:</span>
                          <span className="font-medium text-red-600">-₹{serviceDiscountTotal.toFixed(2)}</span>
                        </div>
                      )}
                      {overallDiscountAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-red-600">Overall Discount:</span>
                          <span className="font-medium text-red-600">-₹{overallDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-green-200 pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="text-lg font-bold text-green-800">Total:</span>
                          <span className="text-lg font-bold text-green-600">₹{finalTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Mode Selection */}
                <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Mode</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['cash', 'card', 'upi', 'other'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`px-4 py-3 rounded-lg font-medium transition-colors capitalize ${
                          paymentMode === mode
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-indigo-100 border border-gray-300'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overall Discount Section */}
                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Discount (Optional)</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Discount Type:</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOverallDiscount({ type: 'percentage', value: 0 })}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            overallDiscount.type === 'percentage'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Percentage (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverallDiscount({ type: 'amount', value: 0 })}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            overallDiscount.type === 'amount'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Fixed Amount (₹)
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          {overallDiscount.type === 'percentage' ? 'Percentage:' : 'Amount (₹):'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={overallDiscount.type === 'percentage' ? 100 : subtotalAfterServiceDiscounts}
                          step={overallDiscount.type === 'percentage' ? 1 : 0.01}
                          value={overallDiscount.value}
                          onChange={(e) => setOverallDiscount({ 
                            ...overallDiscount, 
                            value: parseFloat(e.target.value) || 0 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Discount Amount:</label>
                        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
                          ₹{overallDiscountAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    {overallDiscountAmount > 0 && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-yellow-300">
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Preview:</span> 
                          <span className="ml-2">Subtotal: ₹{subtotal.toFixed(2)}</span>
                          {serviceDiscountTotal > 0 && (
                            <>
                              <span className="mx-2">-</span>
                              <span className="text-orange-600">Service Discounts: ₹{serviceDiscountTotal.toFixed(2)}</span>
                            </>
                          )}
                          <span className="mx-2">-</span>
                          <span className="text-red-600">Overall Discount: ₹{overallDiscountAmount.toFixed(2)}</span>
                          <span className="mx-2">=</span>
                          <span className="font-bold text-green-600">Final: ₹{finalTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Services List */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Services Details</h3>
                  <div className="space-y-3">
                    {selectedServices.map((item) => (
                      <div key={item.service_id} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.service_name}</div>
                            <div className="text-sm text-gray-600">
                              Staff: {item.staff_name} • Qty: {item.quantity}
                            </div>
                            {(item.discount_percentage || item.discount_amount) && (
                              <div className="text-xs text-orange-600 font-medium">
                                Service discount: {item.discount_type === 'percentage' 
                                  ? `${item.discount_percentage}% off` 
                                  : `₹${item.discount_amount} off`}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {(item.discount_percentage || item.discount_amount) ? (
                              <>
                                <div className="font-bold text-green-600">
                                  ₹{(getServiceDiscountedPrice(item) * item.quantity).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-500 line-through">
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ₹{getServiceDiscountedPrice(item).toFixed(2)} × {item.quantity}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-bold text-green-600">
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ₹{item.price.toFixed(2)} × {item.quantity}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-8 border-t border-gray-200 mt-8">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>

              {currentStep < 3 ? (
                <button
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && !canProceedFromStep1) ||
                    (currentStep === 2 && !canProceedFromStep2)
                  }
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    (currentStep === 1 && !canProceedFromStep1) ||
                    (currentStep === 2 && !canProceedFromStep2)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                  }`}
                >
                  Next
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={completeSale}
                  disabled={loading}
                  className="bg-green-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-green-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirm Sale
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Step Requirements */}
            {currentStep === 1 && !canProceedFromStep1 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">Please select a customer to continue</p>
              </div>
            )}

            {currentStep === 2 && !canProceedFromStep2 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {selectedServices.length === 0 
                    ? 'Please add at least one service to continue'
                    : 'Please assign staff to all services to continue'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sale Complete Modal */}
      {showSaleCompleteModal && completedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Sale Completed!</h3>
                <p className="text-gray-600">Transaction processed successfully</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium text-gray-900">{completedSale.customer?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Services:</span>
                    <span className="font-medium text-gray-900">{completedSale.services.length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">₹{completedSale.subtotal.toFixed(2)}</span>
                  </div>
                  {(completedSale.serviceDiscountTotal > 0 || completedSale.overallDiscountAmount > 0) && (
                    <div className="flex justify-between text-red-600">
                      <span>Total Discounts:</span>
                      <span>-₹{(completedSale.serviceDiscountTotal + completedSale.overallDiscountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-green-600 pt-2 border-t border-gray-200">
                    <span>Final Total:</span>
                    <span>₹{completedSale.finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            

              <div className="space-y-3">
                <button
                  onClick={printReceipt}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  PRINT RECEIPT
                </button>
                
                <button
                  onClick={resetPOS}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  NEW SALE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSScreen;