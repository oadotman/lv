// =====================================================
// PARTNER DASHBOARD LAYOUT
// Layout wrapper for all partner dashboard pages
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Download,
  Award,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartnerInfo {
  id: string;
  full_name: string;
  email: string;
  company_name?: string;
  tier: 'standard' | 'premium';
  referral_code: string;
  commission_rate: number;
}

export default function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchPartnerInfo();
  }, []);

  const fetchPartnerInfo = async () => {
    try {
      const response = await fetch('/api/partners/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch partner info');
      }
      const data = await response.json();
      setPartner(data.partner);
    } catch (error) {
      console.error('Error fetching partner info:', error);
      router.push('/partners/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/partners/auth/logout', {
        method: 'POST',
      });
      router.push('/partners/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigation = [
    {
      name: 'Overview',
      href: '/partners/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'My Referrals',
      href: '/partners/dashboard/referrals',
      icon: Users,
    },
    {
      name: 'Earnings & Payouts',
      href: '/partners/dashboard/earnings',
      icon: DollarSign,
    },
    {
      name: 'Marketing Resources',
      href: '/partners/dashboard/resources',
      icon: FileText,
    },
    {
      name: 'Settings',
      href: '/partners/dashboard/settings',
      icon: Settings,
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <div className="flex-shrink-0 flex items-center">
                <Link href="/partners/dashboard" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg text-gray-900">LoadVoice Partners</span>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {partner?.tier === 'premium' && (
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-sky-100 to-blue-100 text-sky-800">
                  <Award className="w-3 h-3 mr-1" />
                  Premium Partner
                </span>
              )}
              <div className="hidden lg:block text-right">
                <p className="text-sm font-medium text-gray-900">{partner?.full_name}</p>
                <p className="text-xs text-gray-500">{partner?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform lg:translate-x-0 lg:static lg:inset-0",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full pt-20 lg:pt-4">
            <nav className="flex-1 px-4 pb-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5",
                        isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500"
                      )}
                    />
                    {item.name}
                    {isActive && (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Partner Info Card */}
            <div className="px-4 py-4 border-t">
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg p-4">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Your Referral Code</p>
                  <p className="font-mono text-blue-600 mt-1">{partner?.referral_code}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Commission Rate</span>
                    <span className="font-semibold text-gray-900">
                      {((partner?.commission_rate || 0.25) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}