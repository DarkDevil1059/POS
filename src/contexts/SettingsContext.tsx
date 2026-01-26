import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface Settings {
  id: string;
  shop_name: string;
  shop_logo_url: string | null;
  address: string;
  contact_number: string;
  receipt_footer: string;
  auto_print: boolean;
  show_customer_details: boolean;
  show_logo: boolean;
  show_shop_name: boolean;
  theme_style: string;
  primary_color: string;
  accent_color: string;
  font_style: string;
  layout_density: string;
  blur_intensity: number;
  session_timeout: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { supabaseClient, user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // safer than .single()

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // No row exists → create one safely
        const { data: newSettings, error: createError } = await supabaseClient
          .from('settings')
          .insert([
            {
              user_id: user.id,
              shop_name: 'POS System',
              shop_logo_url: null,
              address: '',
              contact_number: '',
              receipt_footer: 'Thank you for your business!',
              auto_print: false,
              show_customer_details: true,
              show_logo: true,
              show_shop_name: true,
              theme_style: 'light',
              primary_color: '#10b981',
              accent_color: '#3b82f6',
              font_style: 'default',
              layout_density: 'comfortable',
              blur_intensity: 50,
              session_timeout: 30,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (data: Partial<Settings>) => {
    if (!user) {
      console.warn('No user, cannot update settings');
      return;
    }

    try {
      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.user_id;
      delete updateData.created_at;

      // First, try to update existing settings
      const { data: updateResult, error: updateError } = await supabaseClient
        .from('settings')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;

      if (updateResult) {
        setSettings(updateResult);
      } else {
        // No existing record, create new one
        const { data: insertResult, error: insertError } = await supabaseClient
          .from('settings')
          .insert({
            ...updateData,
            user_id: user.id,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(insertResult);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const refreshSettings = async () => {
    setLoading(true);
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const value: SettingsContextType = {
    settings,
    loading,
    updateSettings,
    refreshSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
