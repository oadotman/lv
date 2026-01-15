/**
 * LoadVoice UX Polish Components
 * Loading states, animations, and responsive design
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Package, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Animated LoadVoice Logo
 */
export function LoadVoiceLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <motion.div
      className={`relative ${sizes[size]}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', duration: 0.5 }}
    >
      <Truck className="w-full h-full text-blue-600" />
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <div className="w-2 h-2 bg-blue-600 rounded-full" />
      </motion.div>
    </motion.div>
  );
}

/**
 * Extraction Progress Component
 */
export function ExtractionProgress({
  status,
  progress = 0,
  message = 'Processing...'
}: {
  status: 'idle' | 'uploading' | 'processing' | 'extracting' | 'complete' | 'error';
  progress?: number;
  message?: string;
}) {
  const statusConfig = {
    idle: { icon: Package, color: 'text-gray-400', bgColor: 'bg-gray-100' },
    uploading: { icon: Package, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    processing: { icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
    extracting: { icon: Truck, color: 'text-sky-500', bgColor: 'bg-sky-50' },
    complete: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50' },
    error: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-50' }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      className="w-full max-w-md mx-auto p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Animated Icon */}
        <motion.div
          className={`p-4 rounded-full ${config.bgColor}`}
          animate={status === 'processing' || status === 'extracting' ? {
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className={`w-8 h-8 ${config.color}`} />
        </motion.div>

        {/* Progress Bar */}
        {progress > 0 && progress < 100 && (
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-sky-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        {/* Status Message */}
        <motion.p
          key={message}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600 text-center"
        >
          {message}
        </motion.p>

        {/* Time Indicator for Processing */}
        {(status === 'processing' || status === 'extracting') && (
          <CountdownTimer targetSeconds={60} />
        )}
      </div>
    </motion.div>
  );
}

/**
 * Extraction Progress Timer
 * Shows elapsed time without false promises
 */
function CountdownTimer({ targetSeconds = 90 }: { targetSeconds?: number }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const displayMinutes = Math.floor(seconds / 60);
  const displaySeconds = seconds % 60;
  const timeDisplay = displayMinutes > 0
    ? `${displayMinutes}:${displaySeconds.toString().padStart(2, '0')}`
    : `${seconds}s`;

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative w-16 h-16">
        <svg className="transform -rotate-90 w-16 h-16">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200"
          />
          <motion.circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 28}`}
            className="text-blue-500"
            initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">
            {timeDisplay}
          </span>
        </div>
      </div>
      <span className="text-xs text-gray-500">
        Processing your call...
      </span>
    </div>
  );
}

/**
 * Load Status Badge with Animation
 */
export function LoadStatusBadge({
  status
}: {
  status: 'needs_carrier' | 'dispatched' | 'in_transit' | 'delivered' | 'completed'
}) {
  const statusConfig = {
    needs_carrier: { label: 'Needs Carrier', color: 'bg-red-100 text-red-800', icon: '🔍' },
    dispatched: { label: 'Dispatched', color: 'bg-blue-100 text-blue-800', icon: '📋' },
    in_transit: { label: 'In Transit', color: 'bg-yellow-100 text-yellow-800', icon: '🚛' },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: '✅' },
    completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800', icon: '📦' }
  };

  const config = statusConfig[status];

  return (
    <motion.span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </motion.span>
  );
}

/**
 * Animated Success Notification
 */
export function SuccessNotification({
  message,
  onClose
}: {
  message: string;
  onClose?: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed top-4 right-4 z-50 max-w-sm"
    >
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow-lg">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
          <p className="text-sm font-medium text-green-800">{message}</p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Skeleton Loading States
 */
export function LoadListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <motion.div
          key={i}
          className="bg-white rounded-lg p-6 shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded-full w-24"></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Empty State Component
 */
export function EmptyState({
  title,
  description,
  icon: Icon = Package,
  action
}: {
  title: string;
  description: string;
  icon?: any;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <motion.div
      className="text-center py-12"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
      {action && (
        <motion.button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

/**
 * Mobile-Optimized Navigation Drawer
 */
export function MobileDrawer({
  isOpen,
  onClose,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 md:hidden"
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Responsive Data Table
 */
export function ResponsiveTable({
  columns,
  data,
  onRowClick
}: {
  columns: { key: string; label: string; render?: (value: any) => React.ReactNode }[];
  data: any[];
  onRowClick?: (row: any) => void;
}) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, idx) => (
              <motion.tr
                key={idx}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onRowClick?.(row)}
                whileHover={{ backgroundColor: '#f9fafb' }}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm">
                    {col.render ? col.render(row[col.key]) : row[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {data.map((row, idx) => (
          <motion.div
            key={idx}
            className="bg-white shadow rounded-lg p-4"
            onClick={() => onRowClick?.(row)}
            whileTap={{ scale: 0.98 }}
          >
            {columns.map(col => (
              <div key={col.key} className="flex justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-500">{col.label}:</span>
                <span className="text-sm font-medium">
                  {col.render ? col.render(row[col.key]) : row[col.key]}
                </span>
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </>
  );
}

/**
 * Floating Action Button for Mobile
 */
export function FloatingActionButton({
  onClick,
  icon: Icon = Truck
}: {
  onClick: () => void;
  icon?: any;
}) {
  return (
    <motion.button
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center md:hidden z-30"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
    >
      <Icon className="w-6 h-6" />
    </motion.button>
  );
}

/**
 * Error Boundary Fallback
 */
export function ErrorFallback({
  error,
  resetError
}: {
  error: Error;
  resetError: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6">{error.message}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={resetError}
        >
          Try again
        </button>
      </div>
    </div>
  );
}