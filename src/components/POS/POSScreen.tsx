import React, { useState, useEffect } from 'react';
import { Plus, ShoppingCart, Printer, Check, Percent, Search, Minus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Customer, Staff, Service, SaleItem } from '../../types';

const POSScreen: React.FC = () => {
  const { supabaseClient } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = useState<SaleItem[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerContact, setNewCustomerContact] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Filter functions
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (customer.contact && customer.contact.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(staffSearch.toLowerCase())
  );

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
        staff_id: null,
        staff_name: null,
        discount_percentage: 0,
        discount_amount: 0,
        discount_type: 'percentage'
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

  const updateServiceDiscount = (serviceId: string, discountType: 'percentage' | 'amount', value: number) => {
    setSelectedServices(selectedServices.map(item => {
      if (item.service_id === serviceId) {
        const itemSubtotal = item.price * item.quantity;
        
        if (discountType === 'percentage') {
          return {
            ...item,
            discount_type: 'percentage',
            discount_percentage: Math.min(100, Math.max(0, value)),
            discount_amount: 0
          };
        } else {
          return {
            ...item,
            discount_type: 'amount',
            discount_amount: Math.min(itemSubtotal, Math.max(0, value)),
            discount_percentage: 0
          };
        }
      }
      return item;
    }));
  };

  const getServiceDiscountedPrice = (item: SaleItem) => {
    const itemSubtotal = item.price * item.quantity;
    let itemDiscount = 0;
    
    if (item.discount_type === 'percentage') {
      itemDiscount = (itemSubtotal * (item.discount_percentage || 0)) / 100;
    } else {
      itemDiscount = item.discount_amount || 0;
    }
    
    return Math.max(0, itemSubtotal - itemDiscount);
  };
  const completeSale = async () => {
    // Validation
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (selectedServices.length === 0) {
      alert('Please add at least one service');
      return;
    }

    const unassignedServices = selectedServices.filter(item => !item.staff_id);
    if (unassignedServices.length > 0) {
      alert('Please assign staff to all services');
      return;
    }

    setLoading(true);
    try {
      // Calculate totals with service-level discounts
      const overallSubtotal = selectedServices.reduce((sum, item) => sum + getServiceDiscountedPrice(item), 0);
      const totalDiscountAmount = discountType === 'percentage' 
        ? (overallSubtotal * discountPercentage) / 100 
        : discountAmount;
      const grandTotal = Math.max(0, overallSubtotal - totalDiscountAmount);

      console.log('Starting sale completion process...');
      console.log('Selected services:', selectedServices);
      console.log('Selected customer:', selectedCustomer);

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create individual sale records
      const individualSaleRecords = [];
      
      for (const serviceItem of selectedServices) {
        const serviceDiscountedPrice = getServiceDiscountedPrice(serviceItem) / serviceItem.quantity;
        
        for (let i = 0; i < serviceItem.quantity; i++) {
          const itemSubtotal = serviceDiscountedPrice;
          const itemProportionalDiscount = (itemSubtotal / overallSubtotal) * totalDiscountAmount;
          const itemFinalTotal = Math.max(0, itemSubtotal - itemProportionalDiscount);

          console.log(`Processing service ${serviceItem.service_name}, quantity ${i + 1}/${serviceItem.quantity}`);

          const saleData = {
            customer_id: selectedCustomer.id,
            staff_id: serviceItem.staff_id,
            service_id: serviceItem.service_id,
            total: itemFinalTotal,
            date: new Date().toISOString(),
            user_id: user.id,
          };


          console.log('Sale data to insert:', saleData);

          const { data, error } = await supabaseClient
            .from('sales')
            .insert([saleData])
            .select('*')
            .single();

          if (error) {
            console.error('Database error:', error);
            throw new Error(`Database error: ${error.message || 'Unknown database error'}`);
          }

          individualSaleRecords.push(data);
        }
      }

      // Create summary for lastSale
      const salesSummary = {
        id: 'summary',
        customer_id: selectedCustomer.id,
        total: grandTotal,
        date: new Date().toISOString(),
        customers: selectedCustomer,
        selected_services: selectedServices,
        selected_staff: staff,
        individual_records: individualSaleRecords
      };

      setLastSale(salesSummary);
      setSaleCompleted(true);
      
      // Reset form
      console.log('Sale completed successfully');
      setSelectedCustomer(null);
      setSelectedServices([]);
      setDiscountPercentage(0);
      setDiscountAmount(0);
    } catch (error) {
      console.error('Detailed error completing sale:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Unknown error: ${JSON.stringify(error)}`;
      
      alert(`Error completing sale: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    if (!lastSale) return;

    // Enhanced data validation
    if (!lastSale.customers) {
      alert('Error: Customer information is missing. Cannot print receipt.');
      return;
    }

    if (!lastSale.selected_services || lastSale.selected_services.length === 0) {
      alert('Error: Service information is missing. Cannot print receipt.');
      return;
    }

    // Validate that all selected services have required data
    const invalidServices = lastSale.selected_services.filter((item: SaleItem) => 
      !item.service_name || !item.staff_name || item.price === undefined
    );

    if (invalidServices.length > 0) {
      alert('Error: Some service information is incomplete. Cannot print receipt.');
      return;
    }

    try {
      // Create receipt content first
      const receiptContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Receipt</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      margin: 0;
      padding: 20px;
      background: white;
    }
    .receipt {
      max-width: 300px;
      margin: 0 auto;
      background: white;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .header h2 {
      margin: 0;
      font-size: 18px;
    }
    .header p {
      margin: 5px 0;
      font-size: 14px;
    }
    .section {
      margin-bottom: 15px;
    }
    .section p {
      margin: 3px 0;
      font-size: 12px;
    }
    .items {
      border-top: 1px solid #000;
      padding-top: 10px;
      margin-bottom: 15px;
    }
    .item {
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #ccc;
    }
    .item:last-child {
      border-bottom: none;
    }
    .discount {
      border-top: 1px solid #000;
      padding-top: 10px;
      margin-bottom: 15px;
    }
    .total {
      border-top: 2px solid #000;
      padding-top: 10px;
      text-align: right;
    }
    .total p {
      font-size: 16px;
      font-weight: bold;
      margin: 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 10px;
    }
    @media print {
      body { margin: 0; padding: 10px; }
      .receipt { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h2>SALON7</h2>
      <p>RECEIPT</p>
      <p>Professional Beauty Services</p>
    </div>
    
    <div class="section">
      <p><strong>Date:</strong> ${new Date(lastSale.date).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${new Date(lastSale.date).toLocaleTimeString()}</p>
      <p><strong>Transaction:</strong> Summary Sale</p>
    </div>
    
    <div class="section">
      <p><strong>Customer:</strong> ${lastSale.customers?.name || 'Walk-in Customer'}</p>
      <p><strong>Contact:</strong> ${lastSale.customers?.contact || 'N/A'}</p>
    </div>
    
    <div class="items">
      <p><strong>Services:</strong></p>
      ${lastSale.selected_services?.map((item: SaleItem) => `
        <div class="item">
          <p>${item.service_name} x${item.quantity}</p>
          <p>Staff: ${item.staff_name}</p>
          <p>₹${getServiceDiscountedPrice(item).toFixed(2)}</p>
          ${((item.discount_percentage || 0) > 0 || (item.discount_amount || 0) > 0) ? `
          <p style="color: #666; font-size: 10px;">Service discount applied</p>
          ` : ''}
        </div>
      `).join('') || ''}
      <p><strong>Subtotal:</strong> ₹${(lastSale.total + (lastSale.discount_amount || 0)).toFixed(2)}</p>
    </div>
    
    ${lastSale.discount_amount > 0 ? `
    <div class="discount">
      <p><strong>Discount:</strong> -₹${Number(lastSale.discount_amount || 0).toFixed(2)}</p>
    </div>
    ` : ''}
    
    <div class="total">
      <p>TOTAL: ₹${Number(lastSale.total || 0).toFixed(2)}</p>
    </div>
    
    <div class="footer">
      <p>Thank you for your business!</p>
    </div>
  </div>
</body>
</html>`;

      // Open print window immediately and synchronously
      const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
      
      if (!printWindow) {
        // Fallback: try to print using a different approach
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'absolute';
        printFrame.style.top = '-1000px';
        printFrame.style.left = '-1000px';
        printFrame.style.width = '1px';
        printFrame.style.height = '1px';
        printFrame.style.border = 'none';
        
        document.body.appendChild(printFrame);
        
        if (printFrame.contentWindow) {
          printFrame.contentWindow.document.open();
          printFrame.contentWindow.document.write(receiptContent);
          printFrame.contentWindow.document.close();
          
          // Wait a moment for content to load, then print
          setTimeout(() => {
            try {
              printFrame.contentWindow?.focus();
              printFrame.contentWindow?.print();
              
              // Clean up after printing
              setTimeout(() => {
                document.body.removeChild(printFrame);
              }, 1000);
            } catch (error) {
              console.error('Error printing with iframe:', error);
              document.body.removeChild(printFrame);
              alert('Unable to print receipt. Please try copying the receipt content manually.');
            }
          }, 100);
        } else {
          document.body.removeChild(printFrame);
          alert('Unable to print receipt. Your browser may be blocking print operations.');
        }
        return;
      }

      try {
        // Write content and close document immediately
        printWindow.document.open();
        printWindow.document.write(receiptContent);
        printWindow.document.close();
        
        // Focus and print immediately after document is ready
        printWindow.focus();
        
        // Use a very short delay to ensure content is rendered
        setTimeout(() => {
          try {
            printWindow.print();
            
            // Close the window after printing (optional)
            printWindow.addEventListener('afterprint', () => {
              printWindow.close();
            });
            
            // Fallback to close window after 3 seconds if afterprint doesn't fire
            setTimeout(() => {
              if (!printWindow.closed) {
                printWindow.close();
              }
            }, 3000);
          } catch (printError) {
            console.error('Error during print:', printError);
            alert('Error occurred while printing. The print window is open - you can manually print using Ctrl+P.');
          }
        }, 50);
        
      } catch (documentError) {
        console.error('Error writing to print window:', documentError);
        alert('Error preparing receipt for printing. Please try again.');
        if (printWindow && !printWindow.closed) {
          printWindow.close();
        }
      }
    } catch (error) {
      console.error('Error in printReceipt function:', error);
      alert('An unexpected error occurred while preparing the receipt. Please try again.');
    }
  };

  const resetSale = () => {
    setSaleCompleted(false);
    setLastSale(null);
    setDiscountPercentage(0);
    setDiscountAmount(0);
    setCustomerSearch('');
    setServiceSearch('');
    setStaffSearch('');
  };

  if (saleCompleted && lastSale) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sale Completed!</h2>
          <div className="text-left space-y-2 mb-6 p-4 bg-gray-50 rounded-lg">
            <p><strong>Customer:</strong> {lastSale.customers?.name}</p>
            <div className="space-y-1">
              <p><strong>Services:</strong></p>
              {lastSale.selected_services?.map((item: SaleItem, index: number) => (
                <div key={index} className="ml-4 text-sm">
                  <p>• {item.service_name} x{item.quantity} - {item.staff_name}</p>
                </div>
              ))}
            </div>
            {lastSale.discount_amount > 0 && (
              <p><strong>Discount:</strong> -₹{Number(lastSale.discount_amount).toFixed(2)}</p>
            )}
            <p><strong>Total:</strong> ₹{Number(lastSale.total).toFixed(2)}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={printReceipt}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print Receipt
            </button>
            <button
              onClick={resetSale}
              className="w-full bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              New Sale
            </button>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = selectedServices.reduce((sum, item) => sum + getServiceDiscountedPrice(item), 0);
  const finalDiscountAmount = discountType === 'percentage' 
    ? (subtotal * discountPercentage) / 100 
    : discountAmount;
  const total = Math.max(0, subtotal - finalDiscountAmount);

  return (
    <div className="h-screen flex flex-col">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-100 rounded-lg p-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
        </div>
      </div>

      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <div className="grid lg:grid-cols-4 gap-6 h-full min-h-0">
          {/* Customer Selection */}
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col h-full min-h-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Customer</h3>
            
            {!showAddCustomer ? (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div className="space-y-2 mb-4 flex-1 overflow-y-auto min-h-0">
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      {customerSearch ? 'No customers found' : 'No customers available'}
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${
                          selectedCustomer?.id === customer.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.contact || 'No contact'}</div>
                      </button>
                    ))
                  )}
                </div>
                
                <button
                  onClick={() => setShowAddCustomer(true)}
                  className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add New Customer
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Customer name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  placeholder="Contact (optional)"
                  value={newCustomerContact}
                  onChange={(e) => setNewCustomerContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addCustomer}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddCustomer(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Service Selection */}
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col h-full min-h-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Services</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            
            <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
              {filteredServices.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {serviceSearch ? 'No services found' : 'No services available'}
                </div>
              ) : (
                filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => addService(service)}
                    className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-sm">{service.name}</div>
                    <div className="text-lg font-bold text-blue-600">
                      ₹{Number(service.price).toFixed(2)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Selected Services Cart */}
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col h-full min-h-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Services</h3>
            
            <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
              {selectedServices.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No services selected
                </div>
              ) : (
                selectedServices.map((item) => (
                  <div key={item.service_id} className={`p-3 rounded-lg border transition-colors ${
                    !item.staff_id ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.service_name}</div>
                        <div className="text-blue-600 font-bold">
                          ₹{item.price.toFixed(2)}
                          {((item.discount_percentage || 0) > 0 || (item.discount_amount || 0) > 0) && (
                            <span className="text-red-500 text-xs ml-1">
                              (₹{getServiceDiscountedPrice(item).toFixed(2)} after discount)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeService(item.service_id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-600">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateServiceQuantity(item.service_id, parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Assign Staff:</label>
                      <select
                        value={item.staff_id || ''}
                        onChange={(e) => updateServiceStaff(item.service_id, e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-blue-500 ${
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
                    
                    {/* Service-level discount */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className="block text-xs text-gray-600 mb-2">Service Discount:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={item.discount_type || 'percentage'}
                          onChange={(e) => {
                            const newType = e.target.value as 'percentage' | 'amount';
                            updateServiceDiscount(item.service_id, newType, 0);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="percentage">% Off</option>
                          <option value="amount">₹ Off</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          max={item.discount_type === 'percentage' ? '100' : (item.price * item.quantity).toString()}
                          step={item.discount_type === 'percentage' ? '1' : '0.01'}
                          value={item.discount_type === 'percentage' ? (item.discount_percentage || 0) : (item.discount_amount || 0)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateServiceDiscount(item.service_id, item.discount_type || 'percentage', value);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                      {((item.discount_percentage || 0) > 0 || (item.discount_amount || 0) > 0) && (
                        <div className="text-xs text-green-600 mt-1">
                          Saving: ₹{(item.price * item.quantity - getServiceDiscountedPrice(item)).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sale Summary & Complete */}
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col h-full min-h-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Sale Summary</h3>
            
            <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">
                  {selectedCustomer ? selectedCustomer.name : 'Not selected'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Services:</span>
                  <span className="font-medium">{selectedServices.length} items</span>
                </div>
                {selectedServices.map((item) => (
                  <div key={item.service_id} className="flex justify-between text-sm pl-4">
                    <span className="text-gray-600">
                      {item.service_name} x{item.quantity}
                      {item.staff_name && <span className="text-blue-600"> ({item.staff_name})</span>}
                    </span>
                    <span>₹{getServiceDiscountedPrice(item).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Discount Section */}
              {selectedServices.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Percent className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-gray-900">Apply Discount</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'amount')}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-yellow-500"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="amount">Fixed Amount (₹)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {discountType === 'percentage' ? 'Percentage' : 'Amount'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={discountType === 'percentage' ? '100' : subtotal.toString()}
                        step={discountType === 'percentage' ? '1' : '0.01'}
                        value={discountType === 'percentage' ? discountPercentage : discountAmount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          if (discountType === 'percentage') {
                            setDiscountPercentage(Math.min(100, Math.max(0, value)));
                          } else {
                            setDiscountAmount(Math.min(subtotal, Math.max(0, value)));
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-yellow-500"
                        placeholder={discountType === 'percentage' ? '0' : '0.00'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedServices.length > 0 && (
                <>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {finalDiscountAmount > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-red-600">
                        -₹{finalDiscountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 text-lg font-bold text-blue-600">
                    <span>Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={completeSale}
                disabled={!selectedCustomer || selectedServices.length === 0 || selectedServices.some(item => !item.staff_id) || loading}
                className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Complete Sale
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSScreen;