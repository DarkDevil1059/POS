import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Customer, Staff, Service } from '../types';

export const useUserData = () => {
  const { supabaseClient, user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      initializeUserData();
    }
  }, [user]);

  const initializeUserData = async () => {
    if (!user) return;

    try {
      // Check if user has any data
      const [customersRes, staffRes, servicesRes] = await Promise.all([
        supabaseClient.from('customers').select('*').eq('user_id', user.id).limit(1),
        supabaseClient.from('staff').select('*').eq('owner_user_id', user.id).limit(1),
        supabaseClient.from('services').select('*').eq('user_id', user.id).limit(1),
      ]);

      // If no data exists, create sample data for new users
      const hasCustomers = customersRes.data && customersRes.data.length > 0;
      const hasStaff = staffRes.data && staffRes.data.length > 0;
      const hasServices = servicesRes.data && servicesRes.data.length > 0;

      if (!hasCustomers || !hasStaff || !hasServices) {
        await createSampleData();
      }

      // Fetch all user data
      await fetchAllData();
    } catch (error) {
      console.error('Error initializing user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    if (!user) return;

    try {
      // Create sample customers
      const { data: sampleCustomers } = await supabaseClient
        .from('customers')
        .insert([
          { name: 'Walk-in Customer', contact: null, user_id: user.id },
          { name: 'Regular Customer', contact: 'regular@example.com', user_id: user.id },
        ])
        .select();

      // Create sample staff
      const { data: sampleStaff } = await supabaseClient
        .from('staff')
        .insert([
          { name: 'Main Stylist', owner_user_id: user.id },
          { name: 'Assistant', owner_user_id: user.id },
        ])
        .select();

      // Create sample services
      const { data: sampleServices } = await supabaseClient
        .from('services')
        .insert([
          { name: 'Haircut', price: 25.00, user_id: user.id },
          { name: 'Hair Wash', price: 15.00, user_id: user.id },
          { name: 'Styling', price: 35.00, user_id: user.id },
          { name: 'Color Treatment', price: 75.00, user_id: user.id },
        ])
        .select();

      console.log('Sample data created for new user');
    } catch (error) {
      console.error('Error creating sample data:', error);
    }
  };

  const fetchAllData = async () => {
    if (!user) return;

    try {
      const [customersRes, staffRes, servicesRes] = await Promise.all([
        supabaseClient.from('customers').select('*').eq('user_id', user.id).order('name'),
        supabaseClient.from('staff').select('*').eq('owner_user_id', user.id).order('name'),
        supabaseClient.from('services').select('*').eq('user_id', user.id).order('name'),
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  return {
    customers,
    staff,
    services,
    loading,
    refetch: fetchAllData,
    setCustomers,
    setStaff,
    setServices,
  };
};