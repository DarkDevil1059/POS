import React from 'react';
import { 
  ShoppingCart, 
  Users, 
  Briefcase, 
  Settings, 
  BarChart3, 
  LogOut,
  Store,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { signOut } = useAuth();

  const menuItems = [
    { id: 'pos', label: 'Point of Sale', icon: ShoppingCart, color: 'text-blue-600' },
    { id: 'sales', label: 'Sales History', icon: BarChart3, color: 'text-green-600' },
    { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp, color: 'text-indigo-600' },
    { id: 'customers', label: 'Customers', icon: Users, color: 'text-purple-600' },
    { id: 'services', label: 'Services', icon: Briefcase, color: 'text-orange-600' },
    { id: 'staff', label: 'Staff', icon: Settings, color: 'text-teal-600' },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="bg-white h-screen w-64 shadow-lg flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-lg p-2">
            <Store className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-900">POS System</h1>
            <p className="text-xs text-gray-500">Business Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-50 border border-blue-200 text-blue-700' 
                  : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : item.color}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;