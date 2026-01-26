import React, { useState, useEffect } from 'react';
import { Store, Menu } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import LoginForm from './components/Auth/LoginForm';
import SetupAdminPassword from './components/Auth/SetupAdminPassword';
import Sidebar from './components/Layout/Sidebar';
import POSScreen from './components/POS/POSScreen';
import SalesHistory from './components/Sales/SalesHistory';
import CustomerManagement from './components/Management/CustomerManagement';
import ServiceManagement from './components/Management/ServiceManagement';
import StaffManagement from './components/Management/StaffManagement';
import ReportsAnalytics from './components/Reports/ReportsAnalytics';
import SettingsPage from './components/Settings/SettingsPage';

const AppContent: React.FC = () => {
  const { user, loading, supabaseClient } = useAuth();
  const { settings } = useSettings();
  const [activeView, setActiveView] = useState('pos');
  const [needsAdminPassword, setNeedsAdminPassword] = useState(false);
  const [checkingAdminPassword, setCheckingAdminPassword] = useState(true);

  useEffect(() => {
    if (settings?.theme_style) {
      document.documentElement.setAttribute('data-theme', settings.theme_style);
    }
  }, [settings?.theme_style]);

  useEffect(() => {
    const checkAdminPassword = async () => {
      if (!user) {
        setCheckingAdminPassword(false);
        return;
      }

      try {
        const { data, error } = await supabaseClient
          .from('admin_passwords')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        setNeedsAdminPassword(!data);
      } catch (error) {
        console.error('Error checking admin password:', error);
        setNeedsAdminPassword(true);
      } finally {
        setCheckingAdminPassword(false);
      }
    };

    checkAdminPassword();
  }, [user, supabaseClient]);

  if (loading || checkingAdminPassword) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (needsAdminPassword) {
    return <SetupAdminPassword onComplete={() => setNeedsAdminPassword(false)} />;
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'pos':
        return <POSScreen />;
      case 'sales':
        return <SalesHistory />;
      case 'reports':
        return <ReportsAnalytics />;
      case 'customers':
        return <CustomerManagement />;
      case 'services':
        return <ServiceManagement />;
      case 'staff':
        return <StaffManagement />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <POSScreen />;
    }
  };

  const themeClass = settings?.theme_style === 'dark'
    ? 'theme-dark'
    : settings?.theme_style === 'glass'
    ? 'theme-glass'
    : 'theme-light';

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${themeClass}`}>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 theme-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-8 h-8 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">POS SYSTEM</span>
          </div>
          <button
            onClick={() => setActiveView('menu')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sidebar - Hidden on mobile unless menu is active */}
      <div className={`${activeView === 'menu' ? 'block' : 'hidden'} md:block`}>
        <Sidebar activeView={activeView} onViewChange={(view) => {
          setActiveView(view);
          if (view !== 'menu') {
            setTimeout(() => setActiveView(view), 100);
          }
        }} />
      </div>

      <div className={`flex-1 ${activeView === 'menu' ? 'hidden md:block' : 'block'}`}>
        {renderActiveView()}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;