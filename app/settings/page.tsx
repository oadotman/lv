"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { mockUser } from "@/lib/mockData";
import { Download, Eye, EyeOff, Copy, RefreshCw, Settings, User, CreditCard, Bell, Key, AlertTriangle, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <TopBar />

      <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-200">
        {/* Modern Header with Glassmorphism */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 via-gray-600/20 to-zinc-600/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
          <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-8 border border-white/40 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-slate-600 to-gray-700 rounded-xl shadow-lg shadow-slate-500/30">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 bg-clip-text text-transparent tracking-tight">
                  Settings
                </h1>
                <p className="text-slate-600 font-medium mt-1">
                  Manage your account preferences and configuration
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="account" className="space-y-6">
            {/* Modern Tabs */}
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-white/70 backdrop-blur-xl border border-slate-200/60 p-2 rounded-2xl shadow-lg">
              <TabsTrigger
                value="account"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 rounded-xl font-semibold transition-all duration-300"
              >
                <User className="w-4 h-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 rounded-xl font-semibold transition-all duration-300"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Billing
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 rounded-xl font-semibold transition-all duration-300"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="api"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 rounded-xl font-semibold transition-all duration-300"
              >
                <Key className="w-4 h-4 mr-2" />
                API
              </TabsTrigger>
              <TabsTrigger
                value="danger"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/30 rounded-xl font-semibold transition-all duration-300"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Danger
              </TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold text-slate-900">Profile Information</CardTitle>
                  <CardDescription className="text-slate-600 font-medium">
                    Update your account details and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">Email</label>
                      <Input
                        value={mockUser.email}
                        readOnly
                        className="bg-slate-50 border border-slate-200 rounded-xl py-3 text-slate-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">Full Name</label>
                      <Input
                        defaultValue={mockUser.name}
                        className="border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">Company Name</label>
                      <Input
                        defaultValue={mockUser.company}
                        className="border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">Time Zone</label>
                      <Input
                        defaultValue="(GMT-08:00) Pacific Time"
                        className="border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 rounded-xl border-0 font-semibold px-6 py-2">
                      Update Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold text-slate-900">Subscription Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between py-4 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Current Plan</span>
                    <Badge className="bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border-2 border-violet-200 font-semibold px-3 py-1 rounded-lg">
                      Pro
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Minutes Used</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-full" style={{ width: "25%" }} />
                      </div>
                      <span className="text-sm font-medium text-slate-900">250 / 1000</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-semibold text-slate-700">Next Billing Date</span>
                    <span className="text-sm font-medium text-slate-900">July 30, 2024</span>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 rounded-xl border-0 font-semibold">
                      Manage Subscription
                    </Button>
                    <Button
                      variant="outline"
                      className="border-2 border-violet-200 hover:border-violet-300 hover:bg-violet-50 text-violet-600 hover:text-violet-700 rounded-xl font-semibold transition-all duration-200"
                    >
                      Upgrade Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold text-slate-900">Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-5 border-2 border-slate-200 rounded-xl hover:border-violet-200 hover:bg-violet-50/30 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-10 bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        VISA
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Visa ending in 4242</p>
                        <p className="text-xs text-slate-500 font-medium">Expires 12/26</p>
                      </div>
                    </div>
                    <Button variant="link" size="sm" className="text-violet-600 hover:text-violet-700 font-semibold">
                      Update
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold text-slate-900">Billing History</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider rounded-tl-lg">Date</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Amount</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider rounded-tr-lg">Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-violet-50/30 transition-colors duration-200">
                          <td className="py-4 px-4 text-sm font-medium text-slate-900">June 30, 2024</td>
                          <td className="py-4 px-4 text-sm font-semibold text-slate-900">$49.00</td>
                          <td className="py-4 px-4 text-sm">
                            <Button variant="link" size="sm" className="h-auto p-0 text-violet-600 hover:text-violet-700 font-semibold">
                              <Download className="w-4 h-4 mr-1.5" />
                              Download
                            </Button>
                          </td>
                        </tr>
                        <tr className="hover:bg-violet-50/30 transition-colors duration-200">
                          <td className="py-4 px-4 text-sm font-medium text-slate-900">May 30, 2024</td>
                          <td className="py-4 px-4 text-sm font-semibold text-slate-900">$49.00</td>
                          <td className="py-4 px-4 text-sm">
                            <Button variant="link" size="sm" className="h-auto p-0 text-violet-600 hover:text-violet-700 font-semibold">
                              <Download className="w-4 h-4 mr-1.5" />
                              Download
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold text-slate-900">Email Preferences</CardTitle>
                  <CardDescription className="text-slate-600 font-medium">
                    Manage how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between py-4 border-b border-slate-100">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">Call processing complete</p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        Get notified when your call recordings have been fully analyzed.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-2 border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
                      defaultChecked
                    />
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-slate-100">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">Weekly summary report</p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        Receive a weekly digest of your call activity and insights.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-2 border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
                      defaultChecked
                    />
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-slate-100">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">Product updates</p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        Stay up-to-date with the latest features and improvements.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-2 border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
                      defaultChecked
                    />
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">Marketing emails</p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        Receive special offers and marketing communications.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-2 border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 rounded-xl border-0 font-semibold px-6 py-2">
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api">
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold text-slate-900">API Access</CardTitle>
                  <CardDescription className="text-slate-600 font-medium">
                    Use your API key to integrate SynQall with your applications
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Your API Key</label>
                    <div className="flex gap-2">
                      <Input
                        value={showApiKey ? "csai_sk_1234567890abcdef12a3" : "csai_sk_••••••••••••••••••••12a3"}
                        readOnly
                        className="font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl py-3"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="border-2 border-slate-200 hover:border-violet-300 hover:bg-violet-50 rounded-xl transition-all duration-200"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4 text-slate-600" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-2 border-slate-200 hover:border-violet-300 hover:bg-violet-50 rounded-xl transition-all duration-200"
                      >
                        <Copy className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-2 border-slate-200 hover:border-violet-300 hover:bg-violet-50 rounded-xl transition-all duration-200"
                      >
                        <RefreshCw className="w-4 h-4 text-slate-600" />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-600 mt-3 font-medium">
                      Usage: <span className="font-bold text-slate-900">1,452 calls</span> this month
                    </p>
                  </div>
                  <Button variant="link" className="p-0 h-auto text-violet-600 hover:text-violet-700 font-semibold">
                    View API Documentation →
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger">
              <Card className="border-2 border-red-200 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
                  <CardTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Delete Account
                  </CardTitle>
                  <CardDescription className="text-red-600/80 font-medium">
                    Permanently delete your account and all associated data
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-slate-700 mb-6 font-medium leading-relaxed">
                    This action is irreversible. All your call history, insights, and custom
                    templates will be permanently deleted.
                  </p>
                  <Button className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/50 transition-all duration-300 rounded-xl border-0 font-semibold px-6 py-2">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
