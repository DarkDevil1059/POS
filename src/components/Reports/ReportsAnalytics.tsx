import React, { useState } from 'react';
import { TrendingUp, BarChart3, Users, Award, CreditCard } from 'lucide-react';
import SalesReports from './SalesReports';
import BestSellingServices from './BestSellingServices';
import StaffPerformance from './StaffPerformance';
import PaymentMethodReports from './PaymentMethodReports';

const ReportsAnalytics: React.FC = () => {
  const [activeSection, setActiveSection] = useState('sales');

  const sections = [
    { 
      id: 'sales', 
      label: 'Sales Reports', 
      icon: TrendingUp, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      id: 'services', 
      label: 'Best-Selling Services', 
      icon: Award, 
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    { 
      id: 'staff', 
      label: 'Staff Performance', 
      icon: Users, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      id: 'payment', 
      label: 'Payment Methods', 
      icon: CreditCard, 
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'sales':
        return <SalesReports />;
      case 'services':
        return <BestSellingServices />;
      case 'staff':
        return <StaffPerformance />;
      case 'payment':
        return <PaymentMethodReports />;
      default:
        return <SalesReports />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Side Menu */}
      <div className="w-full md:w-64 bg-white shadow-lg">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 rounded-lg p-2">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Analytics</h1>
              <p className="text-xs text-gray-500">Business Insights</p>
            </div>
          </div>
        </div>

        <nav className="p-2 md:p-4 space-y-1 md:space-y-2">
          {/* Mobile: Show as horizontal scroll */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? `${section.bgColor} border border-opacity-30 ${section.color}` 
                      : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? section.color : 'text-gray-500'}`} />
                  <span className="font-medium text-xs whitespace-nowrap">{section.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
          
          {/* Desktop: Show as vertical list */}
          <div className="hidden md:block space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? `${section.bgColor} border border-opacity-30 ${section.color}` 
                    : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? section.color : 'text-gray-500'}`} />
                <span className="font-medium text-sm">{section.label}</span>
              </button>
            );
          })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {renderActiveSection()}
      </div>
    </div>
  );
};

export default ReportsAnalytics;