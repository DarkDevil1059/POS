import React, { useState } from 'react';
import { Store, Menu } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import POSScreen from './components/POS/POSScreen';
import SalesHistory from './components/Sales/SalesHistory';
import CustomerManagement from './components/Management/CustomerManagement';
import ServiceManagement from './components/Management/ServiceManagement';
import StaffManagement from './components/Management/StaffManagement';
import ReportsAnalytics from './components/Reports/ReportsAnalytics';
import AdminSettings from './components/Settings/AdminSettings';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState('pos');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
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
      default:
        return <POSScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/Salon7 logo.jpeg" 
              alt="Salon7" 
              className="h-8 w-auto object-contain"
            />
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
          // Auto-close menu on mobile after selection
          if (view !== 'menu') {
            // Small delay to allow for smooth transition
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
      <AppContent />
    </AuthProvider>
  );
}

export default App;