import React, { useState } from 'react';
import { Trash2, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { getAdminPassword, setLastAuthTime, isWithinCooldown } from '../Settings/AdminSettings';

interface DeleteSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<boolean>;
  saleName: string;
  saleAmount: number;
  loading: boolean;
}

const DeleteSaleModal: React.FC<DeleteSaleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  saleName,
  saleAmount,
  loading
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isInCooldown, setIsInCooldown] = useState(false);

  // Check cooldown status when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const { isActive, remainingMs } = isWithinCooldown();
      setIsInCooldown(isActive);
      setCooldownRemaining(Math.ceil(remainingMs / 1000));
      
      if (isActive) {
        // Set up countdown timer
        const interval = setInterval(() => {
          const { isActive: stillActive, remainingMs: newRemaining } = isWithinCooldown();
          if (!stillActive) {
            setIsInCooldown(false);
            setCooldownRemaining(0);
            clearInterval(interval);
          } else {
            setCooldownRemaining(Math.ceil(newRemaining / 1000));
          }
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If in cooldown, use stored password
    if (isInCooldown) {
      setError('');
      const success = await onConfirm(getAdminPassword());
      
      if (success) {
        setLastAuthTime(); // Refresh cooldown
        setPassword('');
        onClose();
      } else {
        setError('Deletion failed. Please try again.');
      }
      return;
    }
    
    // Normal password validation
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setError('');
    
    // Validate password first
    if (password !== getAdminPassword()) {
      setError('Incorrect password. Access denied.');
      return;
    }
    
    // Password is correct, proceed with deletion
    const success = await onConfirm(password);
    
    if (success) {
      setLastAuthTime(); // Set cooldown period
      setPassword('');
      onClose();
    } else {
      setError('Deletion failed. Please try again.');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setIsInCooldown(false);
    setCooldownRemaining(0);
    onClose();
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-red-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Sale Record</h3>
              <p className="text-sm text-gray-600">This action requires authorization</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-800">Warning: Permanent Deletion</span>
            </div>
            <p className="text-sm text-red-700 mb-3">
              You are about to permanently delete this sale record:
            </p>
            <div className="bg-white rounded border p-3 text-sm">
              <div className="font-medium text-gray-900">{saleName}</div>
              <div className="text-red-600 font-bold">₹{saleAmount.toFixed(2)}</div>
            </div>
            <p className="text-xs text-red-600 mt-2">
              This action cannot be undone and will affect your sales reports.
            </p>
          </div>

          {error && !isInCooldown && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {isInCooldown ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">Authentication Active</span>
              </div>
              <p className="text-sm text-green-700 mb-2">
                You are authenticated for administrative actions.
              </p>
              <p className="text-xs text-green-600">
                Time remaining: {formatTime(cooldownRemaining)}
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12"
                      placeholder="Enter admin password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Contact your system administrator if you don't have the password
                  </p>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {isInCooldown ? 'Confirm Delete' : 'Delete Sale'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeleteSaleModal;