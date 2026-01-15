'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Download,
  Calendar,
  Filter,
  FileText,
  PieChart,
  Activity,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';

// Mock data for charts
const revenueData = [
  { month: 'Jan', revenue: 125000, loads: 145, margin: 18.5 },
  { month: 'Feb', revenue: 135000, loads: 162, margin: 19.2 },
  { month: 'Mar', revenue: 142000, loads: 178, margin: 17.8 },
  { month: 'Apr', revenue: 155000, loads: 195, margin: 20.1 },
  { month: 'May', revenue: 148000, loads: 182, margin: 19.5 },
  { month: 'Jun', revenue: 165000, loads: 203, margin: 21.3 },
];

const topCarriers = [
  { name: 'Swift Transportation', loads: 45, revenue: 62500, onTime: 94 },
  { name: 'Knight Transport', loads: 38, revenue: 51200, onTime: 92 },
  { name: 'Werner Enterprises', loads: 32, revenue: 44800, onTime: 96 },
  { name: 'J.B. Hunt', loads: 28, revenue: 38500, onTime: 91 },
  { name: 'Schneider', loads: 25, revenue: 34200, onTime: 93 },
];

const topLanes = [
  { lane: 'Chicago, IL → Nashville, TN', loads: 28, avgRate: 2850, avgMargin: 485 },
  { lane: 'Dallas, TX → Phoenix, AZ', loads: 24, avgRate: 1950, avgMargin: 380 },
  { lane: 'Atlanta, GA → Miami, FL', loads: 22, avgRate: 1680, avgMargin: 295 },
  { lane: 'Los Angeles, CA → Las Vegas, NV', loads: 18, avgRate: 980, avgMargin: 175 },
  { lane: 'Seattle, WA → Portland, OR', loads: 16, avgRate: 620, avgMargin: 115 },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('last30days');
  const [reportType, setReportType] = useState('overview');

  const downloadReport = () => {
    // Mock download functionality
    alert('Report download would be triggered here');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">
            Track your business performance and gain insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="last3months">Last 3 Months</SelectItem>
              <SelectItem value="last6months">Last 6 Months</SelectItem>
              <SelectItem value="lastyear">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={downloadReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardDescription>
            <CardTitle className="text-2xl">$865,200</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+12.5%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Loads
            </CardDescription>
            <CardTitle className="text-2xl">1,065</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+8.3%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Average Margin
            </CardDescription>
            <CardTitle className="text-2xl">19.4%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm">
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-red-500">-0.8%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Carriers
            </CardDescription>
            <CardTitle className="text-2xl">247</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+15</span>
              <span className="text-gray-500 ml-1">new this period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="carriers">Carrier Performance</TabsTrigger>
          <TabsTrigger value="lanes">Lane Analysis</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue and load volume</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Chart placeholder */}
              <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">Revenue chart would be displayed here</p>
                  <p className="text-sm text-gray-400 mt-1">Integration with chart library pending</p>
                </div>
              </div>

              {/* Revenue Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loads</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {revenueData.map((data) => (
                      <tr key={data.month}>
                        <td className="px-4 py-3 text-sm">{data.month}</td>
                        <td className="px-4 py-3 text-sm font-medium">${data.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">{data.loads}</td>
                        <td className="px-4 py-3 text-sm">{data.margin}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Carriers Tab */}
        <TabsContent value="carriers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Carriers</CardTitle>
              <CardDescription>Carriers ranked by load volume and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Carrier</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loads</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">On-Time %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topCarriers.map((carrier) => (
                      <tr key={carrier.name}>
                        <td className="px-4 py-3 text-sm font-medium">{carrier.name}</td>
                        <td className="px-4 py-3 text-sm">{carrier.loads}</td>
                        <td className="px-4 py-3 text-sm">${carrier.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`font-medium ${carrier.onTime >= 95 ? 'text-green-600' : carrier.onTime >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {carrier.onTime}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lanes Tab */}
        <TabsContent value="lanes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Lanes by Volume</CardTitle>
              <CardDescription>Most frequently used shipping lanes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lane</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loads</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Rate</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topLanes.map((lane, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium">{lane.lane}</td>
                        <td className="px-4 py-3 text-sm">{lane.loads}</td>
                        <td className="px-4 py-3 text-sm">${lane.avgRate.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">${lane.avgMargin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Call Processing Metrics</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Calls Processed</span>
                    <span className="font-medium">1,847</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Processing Time</span>
                    <span className="font-medium">2.4 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Data Accuracy</span>
                    <span className="font-medium">94.6%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Extraction Success Rate</span>
                    <span className="font-medium">91.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Load Status Distribution</CardTitle>
                <CardDescription>Current load statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Quoted</span>
                    <span className="font-medium">45</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">In Transit</span>
                    <span className="font-medium">128</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Delivered</span>
                    <span className="font-medium">892</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cancelled</span>
                    <span className="font-medium">12</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}