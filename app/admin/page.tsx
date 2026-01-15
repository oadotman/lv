// =====================================================
// ADMIN DASHBOARD
// Main admin dashboard with navigation to all admin sections
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  FileText,
  DollarSign,
  Settings,
  Shield,
  BarChart,
  UserCheck,
  CreditCard,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Building,
  UserPlus,
  FileSearch
} from 'lucide-react';

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [stats, setStats] = useState({
    totalPartners: 0,
    pendingApplications: 0,
    pendingPayouts: 0,
    totalUsers: 0
  });
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    checkAdminAccess();
    loadStats();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || '');

      // Check if user is admin or owner
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (userOrg?.role === 'owner' || userOrg?.role === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get partner stats
      const { data: partners } = await supabase
        .from('partners')
        .select('id', { count: 'exact' })
        .eq('status', 'active');

      const { data: applications } = await supabase
        .from('partner_applications')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      const { data: commissions } = await supabase
        .from('partner_commissions')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      const { data: users } = await supabase
        .from('user_organizations')
        .select('id', { count: 'exact' });

      setStats({
        totalPartners: partners?.length || 0,
        pendingApplications: applications?.length || 0,
        pendingPayouts: commissions?.length || 0,
        totalUsers: users?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Only administrators and owners can access this area. If you believe this is an error, please contact your system administrator.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.push('/')}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminSections = [
    {
      title: 'Partner Program',
      description: 'Manage partners, applications, and commissions',
      icon: Users,
      color: 'bg-sky-500',
      items: [
        {
          label: 'Partner Overview',
          href: '/admin/partners',
          icon: BarChart,
          badge: stats.totalPartners > 0 ? `${stats.totalPartners} active` : null
        },
        {
          label: 'Applications',
          href: '/admin/partners/applications',
          icon: FileText,
          badge: stats.pendingApplications > 0 ? `${stats.pendingApplications} pending` : null,
          badgeVariant: 'warning'
        },
        {
          label: 'Payouts',
          href: '/admin/partners/payouts',
          icon: CreditCard,
          badge: stats.pendingPayouts > 0 ? `${stats.pendingPayouts} pending` : null,
          badgeVariant: 'warning'
        }
      ]
    },
    {
      title: 'User Management',
      description: 'Manage users, organizations, and permissions',
      icon: UserCheck,
      color: 'bg-blue-500',
      items: [
        {
          label: 'All Users',
          href: '/admin/users',
          icon: Users,
          badge: stats.totalUsers > 0 ? `${stats.totalUsers} total` : null
        },
        {
          label: 'Organizations',
          href: '/admin/organizations',
          icon: Building
        },
        {
          label: 'Invitations',
          href: '/admin/invitations',
          icon: UserPlus
        }
      ]
    },
    {
      title: 'System',
      description: 'System settings, logs, and configuration',
      icon: Settings,
      color: 'bg-gray-500',
      items: [
        {
          label: 'Audit Logs',
          href: '/admin/audit',
          icon: FileSearch
        },
        {
          label: 'System Settings',
          href: '/admin/settings',
          icon: Settings
        },
        {
          label: 'Security',
          href: '/admin/security',
          icon: Shield
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-sky-600" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">Welcome back, {userEmail}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Partners</p>
                  <p className="text-2xl font-bold">{stats.totalPartners}</p>
                </div>
                <Users className="h-8 w-8 text-sky-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Applications</p>
                  <p className="text-2xl font-bold">{stats.pendingApplications}</p>
                </div>
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Payouts</p>
                  <p className="text-2xl font-bold">{stats.pendingPayouts}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Sections */}
        <div className="space-y-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${section.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link key={item.href} href={item.href}>
                          <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <ItemIcon className="h-5 w-5 text-gray-600" />
                                  <span className="font-medium">{item.label}</span>
                                </div>
                                {item.badge && (
                                  <Badge variant={item.badgeVariant as any || 'default'}>
                                    {item.badge}
                                  </Badge>
                                )}
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.push('/admin/partners/applications')}>
                Review Applications
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/partners/payouts')}>
                Process Payouts
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/audit')}>
                View Audit Logs
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/settings')}>
                System Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}