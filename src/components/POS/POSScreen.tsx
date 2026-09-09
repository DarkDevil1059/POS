import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check, User, ShoppingBag, Receipt, Search, Plus, Minus, X, FileText, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Customer, Staff, Service, SaleItem } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
import { formatCurrency } from '../../utils/format';

const POSScreen: React.FC = () => {
  const { supabaseClient } = useAuth();
  const { settings } = useSettings();
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

  // Customer history state
  const [customerHistory, setCustomerHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Post-sale popup state
  const [showSaleCompleteModal, setShowSaleCompleteModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  useEffect(() => {
    fetchData();
    subscribeToCustomerChanges();
  }, []);

  useEffect(() => {
    return () => {
      if (supabaseClient) {
        supabaseClient.removeAllChannels();
      }
    };
  }, [supabaseClient]);

  // Fetch every customer for the user, one page at a time.
  // Sort by (name, id): id is the unique tiebreaker that keeps .range()
  // pagination stable when many rows share the same name. Without it,
  // tied rows land on more than one page and get fetched twice.
  const fetchAllCustomers = async (userId: string): Promise<Customer[]> => {
    let allCustomers: Customer[] = [];
    let from = 0;
    const PAGE_SIZE = 1000;

    while (true) {
      const { data, error } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .order('name')
        .order('id')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error(error);
        break;
      }

      if (!data || data.length === 0) break;

      allCustomers = [...allCustomers, ...data];

      if (data.length < PAGE_SIZE) break;

      from += PAGE_SIZE;
    }

    // Drop any row that still slipped through twice, so customer.id
    // stays unique and React list keys never collide.
    return Array.from(new Map(allCustomers.map(c => [c.id, c])).values());
  };

  const fetchData = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    setCustomers(await fetchAllCustomers(user.id));

    // Fetch staff
    const { data: staffData, error: staffError } = await supabaseClient
      .from('staff')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
      .limit(10000);

    if (staffError) {
      console.error('Error fetching staff:', staffError);
    } else {
      setStaff(staffData || []);
    }

    // Fetch services
    const { data: servicesData, error: servicesError } = await supabaseClient
      .from('services')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
      .limit(10000);

    if (servicesError) {
      console.error('Error fetching services:', servicesError);
    } else {
      setServices(servicesData || []);
    }
  };

  const refetchCustomers = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setCustomers(await fetchAllCustomers(user.id));
    } catch (error) {
      console.error('Error refetching customers:', error);
    }
  };

  const subscribeToCustomerChanges = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      supabaseClient
        .channel(`customers:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'customers',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            refetchCustomers();
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error subscribing to customer changes:', error);
    }
  };

  const addCustomer = async () => {
    if (!newCustomerName.trim()) return;

    setLoading(true);
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

      if (data && data.id) {
        setSelectedCustomer(data);
        setNewCustomerName('');
        setNewCustomerContact('');
        setShowAddCustomer(false);
        await refetchCustomers();
      } else {
        throw new Error('Customer created but no data returned');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      alert(`Error adding customer: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerHistory = async () => {
    if (!selectedCustomer) return;

    setHistoryLoading(true);
    setShowHistory(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get most recent sale record for this customer
      const { data: latestSale, error: latestError } = await supabaseClient
        .from('sales')
        .select('date')
        .eq('user_id', user.id)
        .eq('customer_id', selectedCustomer.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) throw latestError;
      if (!latestSale) {
        setCustomerHistory(null);
        return;
      }

      const lastDate = new Date(latestSale.date);
      const startOfDay = new Date(lastDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(lastDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch all sales from that SAME DAY
      const { data: allSalesFromLastVisit, error: salesError } = await supabaseClient
        .from('sales')
        .select('service_id, date, total')
        .eq('user_id', user.id)
        .eq('customer_id', selectedCustomer.id)
        .gte('date', startOfDay.toISOString())
        .lte('date', endOfDay.toISOString())
        .order('date', { ascending: true });

      if (salesError) throw salesError;
      if (!allSalesFromLastVisit || allSalesFromLastVisit.length === 0) {
        setCustomerHistory(null);
        return;
      }

      // Collect all unique services
      const uniqueServiceIds = [...new Set(allSalesFromLastVisit.map(sale => sale.service_id))];

      const { data: services, error: serviceError } = await supabaseClient
        .from('services')
        .select('id, name')
        .in('id', uniqueServiceIds);

      if (serviceError) throw serviceError;

      const serviceMap = new Map(services?.map(s => [s.id, s.name]) || []);
      const serviceNames = uniqueServiceIds
        .map(id => serviceMap.get(id) || 'Unknown Service')
        .join(', ');

      const totalAmount = allSalesFromLastVisit.reduce((sum, sale) => sum + Number(sale.total), 0);

      setCustomerHistory({
        serviceName: serviceNames,
        date: allSalesFromLastVisit[0].date,
        total: totalAmount
      });
    } catch (error) {
      console.error('Error fetching customer history:', error);
      setCustomerHistory(null);
    } finally {
      setHistoryLoading(false);
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

      // Create single timestamp for all sales in this transaction
      const saleTimestamp = new Date().toISOString();

      // Store sale data for the popup
      const saleData = {
        customer: selectedCustomer,
        services: selectedServices,
        subtotal,
        serviceDiscountTotal,
        overallDiscountAmount,
        finalTotal,
        date: saleTimestamp,
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
            date: saleTimestamp,
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
    setCustomerHistory(null);
    setShowHistory(false);
    setHistoryLoading(false);
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
          <td>${formatCurrency(item.price || 0)}</td>
          <td>${item.quantity || 0}</td>
          <td>${formatCurrency(discountShown)}</td>
          <td>${formatCurrency(lineTotal)}</td>
        </tr>
      `;
      }).join("");

      const hasLogo = settings?.show_logo !== false && !!settings?.shop_logo_url;

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
      .shop-info { font-size: 12px; margin-bottom: 4px; color: #333; }
      .logo { max-width: 80px; max-height: 60px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0; }
      th, td {
        padding: 8px 4px;
        border-bottom: 1px dashed #000;
      }
      .totals { margin-top: 12px; text-align: right; font-size: 13px; }
      .grand-total { font-size: 18px; font-weight: 700; text-align: right; margin-top: 12px; }
      hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
      .section { margin-bottom: 8px; }
      .bold-line { border: none; border-top: 2px solid #000; margin: 8px 0; }
      .footer { margin-top: 12px; font-size: 12px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="center">
        ${hasLogo ? `<img id="shop-logo" src="${settings.shop_logo_url}" alt="Logo" class="logo" />` : ''}
        ${settings?.show_shop_name !== false ? `<div class="shop-name">${(settings?.shop_name || 'POS SYSTEM').toUpperCase()}</div>` : ''}
        ${settings?.address ? `<div class="shop-info">${settings.address}</div>` : ''}
        ${settings?.contact_number ? `<div class="shop-info">Tel: ${settings.contact_number}</div>` : ''}
      </div>
      <hr />
      ${settings?.show_customer_details !== false ? `
      <div class="section">
        <strong>Invoice To:</strong><br/>
        ${customer.name || "Walk-in Customer"}<br/>
        ${customer.contact || ""}
      </div>
      ` : ''}
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
        Sub Total: ${formatCurrency(completedSale.subtotal || 0)}<br/>
        ${completedSale.serviceDiscountTotal > 0 ? `Service Discounts: ${formatCurrency(completedSale.serviceDiscountTotal)}<br/>` : ""}
        ${completedSale.overallDiscountAmount > 0 ? `Overall Discount: ${formatCurrency(completedSale.overallDiscountAmount)}<br/>` : ""}
      </div>
      <hr class="bold-line" />
      <div class="grand-total">
        Grand Total: ${formatCurrency(completedSale.finalTotal || 0)}
      </div>
      ${settings?.receipt_footer ? `<div class="footer"><strong>${settings.receipt_footer}</strong></div>` : ''}
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

      const triggerPrint = () => {
        printWindow.print();
      };

      if (hasLogo) {
        // Wait for logo image to load before printing
        const logoImg = printWindow.document.getElementById('shop-logo') as HTMLImageElement | null;
        if (logoImg && !logoImg.complete) {
          logoImg.onload = triggerPrint;
          logoImg.onerror = triggerPrint; // still print even if logo fails
          // Fallback in case onload never fires
          setTimeout(triggerPrint, 2000);
        } else {
          // Logo already cached/loaded
          printWindow.onload ? triggerPrint() : (printWindow.onload = triggerPrint);
          setTimeout(triggerPrint, 300);
        }
      } else {
        // No logo — print as soon as window is ready
        if (printWindow.document.readyState === 'complete') {
          triggerPrint();
        } else {
          printWindow.onload = triggerPrint;
          setTimeout(triggerPrint, 300);
        }
      }
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
    <div className="min-h-screen">
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Point of Sale
            </h1>
            <p className="text-gray-600 text-lg">Complete your sale in 3 simple steps</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 smooth-transition ${step === currentStep
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/40 scale-125'
                    : step < currentStep
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-500'
                    }`}>
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-20 h-1.5 mx-3 transition-all duration-500 rounded-full ${step < currentStep ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-200'
                      }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <div className="text-sm font-semibold text-gray-700 bg-white px-6 py-2 rounded-full shadow-sm border border-gray-100">
                Step {currentStep} of 3: {
                  currentStep === 1 ? 'Select Customer' :
                    currentStep === 2 ? 'Add Services' :
                      'Review & Confirm'
                }
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 md:p-8 min-h-[500px] smooth-transition hover:shadow-3xl">
            {/* Step 1: Customer Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-3 shadow-lg shadow-blue-500/30">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Select Customer</h2>
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
                        className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md"
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
                            className={`p-4 text-left rounded-2xl border-2 transition-all duration-300 smooth-transition ${selectedCustomer?.id === customer.id
                              ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-xl shadow-blue-500/20 scale-102'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-lg hover:scale-102'
                              }`}
                          >
                            <div className="font-semibold text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-600">{customer.contact || 'No contact'}</div>
                          </button>
                        ))
                      )}
                    </div>

                    {selectedCustomer && (
                      <div className="space-y-3">
                        <button
                          onClick={fetchCustomerHistory}
                          disabled={historyLoading}
                          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg smooth-transition disabled:opacity-50"
                        >
                          {historyLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <FileText className="w-5 h-5" />
                              Quick Customer History
                            </>
                          )}
                        </button>

                        {showHistory && (
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border-2 border-blue-200 shadow-sm">
                            {customerHistory ? (
                              <div className="space-y-2">
                                <h4 className="font-semibold text-gray-900 text-sm mb-3">Last Visit Details</h4>
                                <div className="text-sm">
                                  <span className="text-gray-600 block mb-1">Services:</span>
                                  <span className="font-medium text-gray-900 block">{customerHistory.serviceName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Last Visit Date:</span>
                                  <span className="font-medium text-gray-900">
                                    {new Date(customerHistory.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Last Total Bill:</span>
                                  <span className="font-bold text-green-600">
                                    {formatCurrency(Number(customerHistory.total))}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 text-center">
                                No history available for this customer.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

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
                      className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 py-3 rounded-2xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-sm hover:shadow-lg smooth-transition"
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
                        type="tel"
                        placeholder="Contact (optional)"
                        value={newCustomerContact}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setNewCustomerContact(value);
                        }}
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
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-3 shadow-lg shadow-green-500/30">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Add Services</h2>
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
                              {formatCurrency(Number(service.price))}
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
                                  {formatCurrency(item.price)} each
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
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val)) updateServiceQuantity(item.service_id, val);
                                    }}
                                    onBlur={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (isNaN(val) || val < 1) updateServiceQuantity(item.service_id, 1);
                                    }}
                                    style={{ MozAppearance: 'textfield' } as React.CSSProperties}
                                    className="w-12 text-center font-medium border border-gray-300 rounded-lg py-1 focus:ring-2 focus:ring-green-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
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
                              <label className="block text-sm text-gray-600 mb-1">Select Staff:</label>
                              <select
                                value={item.staff_id || ''}
                                onChange={(e) => updateServiceStaff(item.service_id, e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${!item.staff_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${(item.discount_type || 'percentage') === 'percentage'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                  Percentage (%)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateServiceDiscount(item.service_id, 'amount', item.discount_amount || 0)}
                                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${item.discount_type === 'amount'
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
                                  ? `${formatCurrency(item.price * item.discount_percentage / 100)} off`
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
                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-3 shadow-lg shadow-teal-500/30">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Review & Confirm</h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 shadow-md">
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
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 shadow-md">
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
                        <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                      </div>
                      {serviceDiscountTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-red-600">Service Discounts:</span>
                          <span className="font-medium text-red-600">-{formatCurrency(serviceDiscountTotal)}</span>
                        </div>
                      )}
                      {overallDiscountAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-red-600">Overall Discount:</span>
                          <span className="font-medium text-red-600">-{formatCurrency(overallDiscountAmount)}</span>
                        </div>
                      )}
                      <div className="border-t border-green-200 pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="text-lg font-bold text-green-800">Total:</span>
                          <span className="text-lg font-bold text-green-600">{formatCurrency(finalTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Mode Selection */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 shadow-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Mode</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['cash', 'card', 'upi', 'other'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 capitalize smooth-transition ${paymentMode === mode
                          ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg scale-105'
                          : 'bg-white text-gray-700 hover:bg-slate-50 border border-gray-300 hover:shadow-md hover:scale-102'
                          }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overall Discount Section */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border border-amber-200 shadow-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Discount (Optional)</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Discount Type:</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOverallDiscount({ type: 'percentage', value: 0 })}
                          className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 smooth-transition ${overallDiscount.type === 'percentage'
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg scale-105'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-102'
                            }`}
                        >
                          Percentage (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverallDiscount({ type: 'amount', value: 0 })}
                          className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 smooth-transition ${overallDiscount.type === 'amount'
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg scale-105'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-102'
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
                          {formatCurrency(overallDiscountAmount)}
                        </div>
                      </div>
                    </div>
                    {overallDiscountAmount > 0 && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-yellow-300">
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Preview:</span>
                          <span className="ml-2">Subtotal: {formatCurrency(subtotal)}</span>
                          {serviceDiscountTotal > 0 && (
                            <>
                              <span className="mx-2">-</span>
                              <span className="text-orange-600">Service Discounts: {formatCurrency(serviceDiscountTotal)}</span>
                            </>
                          )}
                          <span className="mx-2">-</span>
                          <span className="text-red-600">Overall Discount: {formatCurrency(overallDiscountAmount)}</span>
                          <span className="mx-2">=</span>
                          <span className="font-bold text-green-600">Final: {formatCurrency(finalTotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Services List */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-md">
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
                                  : `${formatCurrency(item.discount_amount)} off`}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {(item.discount_percentage || item.discount_amount) ? (
                              <>
                                <div className="font-bold text-green-600">
                                  {formatCurrency(getServiceDiscountedPrice(item) * item.quantity)}
                                </div>
                                <div className="text-sm text-gray-500 line-through">
                                  {formatCurrency(item.price * item.quantity)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(getServiceDiscountedPrice(item))} × {item.quantity}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-bold text-green-600">
                                  {formatCurrency(item.price * item.quantity)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(item.price)} × {item.quantity}
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
            <div className="flex justify-between items-center pt-8 border-t-2 border-gray-200 mt-8">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 smooth-transition ${currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 hover:from-gray-300 hover:to-gray-400 shadow-md hover:shadow-lg hover:scale-105'
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
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 smooth-transition ${(currentStep === 1 && !canProceedFromStep1) ||
                    (currentStep === 2 && !canProceedFromStep2)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/40 hover:shadow-xl hover:scale-105'
                    }`}
                >
                  Next
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={completeSale}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-2xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-300 smooth-transition flex items-center gap-2 shadow-lg shadow-green-500/40 hover:shadow-xl hover:scale-105"
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
              <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl shadow-sm">
                <p className="text-sm text-amber-800 font-medium">Please select a customer to continue</p>
              </div>
            )}

            {currentStep === 2 && !canProceedFromStep2 && (
              <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl shadow-sm">
                <p className="text-sm text-amber-800 font-medium">
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
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 smooth-transition">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 smooth-transition transform scale-100 hover:scale-102">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/40">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Sale Completed!</h3>
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
                    <span className="font-medium text-gray-900">{formatCurrency(completedSale.subtotal)}</span>
                  </div>
                  {(completedSale.serviceDiscountTotal > 0 || completedSale.overallDiscountAmount > 0) && (
                    <div className="flex justify-between text-red-600">
                      <span>Total Discounts:</span>
                      <span>-{formatCurrency(completedSale.serviceDiscountTotal + completedSale.overallDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-green-600 pt-2 border-t border-gray-200">
                    <span>Final Total:</span>
                    <span>{formatCurrency(completedSale.finalTotal)}</span>
                  </div>
                </div>
              </div>



              <div className="space-y-3">
                <button
                  onClick={printReceipt}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-2xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 smooth-transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <FileText className="w-5 h-5" />
                  PRINT RECEIPT
                </button>

                <button
                  onClick={resetPOS}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-2xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-300 smooth-transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
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