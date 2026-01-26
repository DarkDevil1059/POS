import React from 'react';
import {
  ShoppingCart,
  Users,
  Briefcase,
  Settings,
  BarChart3,
  LogOut,
  Store,
  TrendingUp,
  UserCog
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { signOut } = useAuth();
  const { settings } = useSettings();

  const menuItems = [
    { id: 'pos', label: 'Point of Sale', icon: ShoppingCart, color: 'text-blue-600' },
    { id: 'sales', label: 'Sales History', icon: BarChart3, color: 'text-green-600' },
    { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp, color: 'text-indigo-600' },
    { id: 'customers', label: 'Customers', icon: Users, color: 'text-purple-600' },
    { id: 'services', label: 'Services', icon: Briefcase, color: 'text-orange-600' },
    { id: 'staff', label: 'Staff', icon: UserCog, color: 'text-teal-600' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-600' },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="bg-white h-screen w-full md:w-64 shadow-2xl flex flex-col border-r border-gray-100">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-transparent">
        <div className="flex items-center gap-3">
          {settings?.shop_logo_url ? (
            <img 
              src={settings.shop_logo_url} 
              alt={settings.shop_name || 'POS System'} 
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-2 shadow-md">
              <Store className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">{settings?.shop_name || 'POS System'}</h1>
            <p className="text-xs text-gray-500 font-medium">Point of Sale</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 md:p-4 space-y-1 md:space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl transition-all duration-300 text-sm md:text-base font-medium smooth-transition ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 text-white scale-105'
                  : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900 hover:scale-102 hover:shadow-md'
              }`}
            >
              <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'text-white' : item.color}`} />
              <span className="font-medium hidden sm:block">{item.label}</span>
              <span className="font-medium sm:hidden text-xs">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-2 md:p-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 text-sm md:text-base font-medium smooth-transition hover:scale-102 hover:shadow-md"
        >
          <LogOut className="w-4 h-4 md:w-5 md:h-5" />
          <span className="font-medium hidden sm:block">Sign Out</span>
          <span className="font-medium sm:hidden">Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;