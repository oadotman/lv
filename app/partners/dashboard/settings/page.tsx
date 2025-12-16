// =====================================================
// PARTNER SETTINGS PAGE
// Manage partner profile and payment settings
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Mail,
  Building,
  Globe,
  Phone,
  CreditCard,
  DollarSign,
  Bell,
  Shield,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface PartnerSettings {
  profile: {
    full_name: string;
    email: string;
    company_name: string;
    website: string;
    phone: string;
  };
  payment: {
    payment_method: 'paypal' | 'bank_transfer' | 'wise' | '';
    paypal_email?: string;
    bank_account_holder?: string;
    bank_account_number?: string;
    bank_routing_number?: string;
    bank_name?: string;
    wise_email?: string;
  };
  notifications: {
    email_on_signup: boolean;
    email_on_conversion: boolean;
    email_on_payout: boolean;
    email_monthly_summary: boolean;
  };
  preferences: {
    custom_link_slug?: string;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PartnerSettings>({
    profile: {
      full_name: '',
      email: '',
      company_name: '',
      website: '',
      phone: '',
    },
    payment: {
      payment_method: '',
    },
    notifications: {
      email_on_signup: true,
      email_on_conversion: true,
      email_on_payout: true,
      email_monthly_summary: true,
    },
    preferences: {
      custom_link_slug: '',
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/partners/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/partners/settings/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings.profile),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayment = async () => {
    if (!settings.payment.payment_method) {
      toast({
        title: 'Error',
        description: 'Please select a payment method',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/partners/settings/payment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings.payment),
      });

      if (!response.ok) throw new Error('Failed to update payment settings');

      toast({
        title: 'Success',
        description: 'Payment settings updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update payment settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/partners/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings.notifications),
      });

      if (!response.ok) throw new Error('Failed to update notification settings');

      toast({
        title: 'Success',
        description: 'Notification settings updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/partners/settings/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) throw new Error('Failed to change password');

      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your partner account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal and business information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={settings.profile.full_name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    profile: { ...settings.profile, full_name: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={settings.profile.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={settings.profile.company_name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    profile: { ...settings.profile, company_name: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={settings.profile.phone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    profile: { ...settings.profile, phone: e.target.value },
                  })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={settings.profile.website}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    profile: { ...settings.profile, website: e.target.value },
                  })
                }
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Settings
          </CardTitle>
          <CardDescription>
            Configure how you want to receive your commission payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Payouts are processed monthly on the 15th when you reach the $100 minimum threshold
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={settings.payment.payment_method}
              onValueChange={(value: any) =>
                setSettings({
                  ...settings,
                  payment: { ...settings.payment, payment_method: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="wise">Wise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.payment.payment_method === 'paypal' && (
            <div>
              <Label htmlFor="paypal_email">PayPal Email</Label>
              <Input
                id="paypal_email"
                type="email"
                value={settings.payment.paypal_email || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payment: { ...settings.payment, paypal_email: e.target.value },
                  })
                }
                placeholder="your@paypal.com"
              />
            </div>
          )}

          {settings.payment.payment_method === 'bank_transfer' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="bank_account_holder">Account Holder Name</Label>
                <Input
                  id="bank_account_holder"
                  value={settings.payment.bank_account_holder || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, bank_account_holder: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={settings.payment.bank_name || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, bank_name: e.target.value },
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={settings.payment.bank_account_number || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        payment: { ...settings.payment, bank_account_number: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="bank_routing_number">Routing Number / IBAN</Label>
                  <Input
                    id="bank_routing_number"
                    value={settings.payment.bank_routing_number || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        payment: { ...settings.payment, bank_routing_number: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {settings.payment.payment_method === 'wise' && (
            <div>
              <Label htmlFor="wise_email">Wise Email</Label>
              <Input
                id="wise_email"
                type="email"
                value={settings.payment.wise_email || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payment: { ...settings.payment, wise_email: e.target.value },
                  })
                }
                placeholder="your@email.com"
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSavePayment} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Payment Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Signup Notification</Label>
                <p className="text-sm text-gray-600">
                  Get notified when someone signs up using your link
                </p>
              </div>
              <Switch
                checked={settings.notifications.email_on_signup}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email_on_signup: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Conversion Notification</Label>
                <p className="text-sm text-gray-600">
                  Get notified when a referral becomes a paying customer
                </p>
              </div>
              <Switch
                checked={settings.notifications.email_on_conversion}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email_on_conversion: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Payout Notification</Label>
                <p className="text-sm text-gray-600">
                  Get notified when a payout is processed
                </p>
              </div>
              <Switch
                checked={settings.notifications.email_on_payout}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email_on_payout: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Monthly Summary</Label>
                <p className="text-sm text-gray-600">
                  Receive a monthly summary of your performance
                </p>
              </div>
              <Switch
                checked={settings.notifications.email_monthly_summary}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email_monthly_summary: checked },
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your partner account password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}