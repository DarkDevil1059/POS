import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import POSScreen from './components/POS/POSScreen';
import SalesHistory from './components/Sales/SalesHistory';
import CustomerManagement from './components/Management/CustomerManagement';
import ServiceManagement from './components/Management/ServiceManagement';
import StaffManagement from './components/Management/StaffManagement';
import ReportsAnalytics from './components/Reports/ReportsAnalytics';

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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex-1 overflow-hidden">
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