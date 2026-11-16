"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign, 
} from "lucide-react";

// Types
interface RevenueData {
  name: string;
  revenue: number;
}

interface DeviceUsage {
  name: string;
  value: number;
  color: string;
}

interface VisitorData {
  country: string;
  visitors: number;
  color: string;
}

interface RecentOrder {
  id: string;
  customer: string;
  amount: number;
  status: string;
}

interface DashboardStats {
  revenueData: RevenueData[];
  deviceUsage: DeviceUsage[];
  visitorsDistribution: VisitorData[];
  recentOrders: RecentOrder[];
  totalRevenue: number;
  totalOrders: number;
  totalVisitors: number;
  conversionRate: number;
}

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axiosInstance.get("/order/api/get-dashboard-stats");
        if (response.data.success) {
          setStats(response.data.stats);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setLoadError("Dashboard data could not be loaded. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) return <div role="alert" className="m-8 rounded-xl border border-red-800 bg-red-950 p-5 text-red-200">{loadError || "Dashboard data could not be loaded."}</div>;

  return (
    <div className="p-6 space-y-6 bg-black min-h-screen text-slate-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm">Welcome back, here's what's happening today.</p>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`KES ${stats.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="text-emerald-400" />} 
          trend="All time"
        />
        <StatCard 
          title="Total Orders" 
          value={stats.totalOrders.toLocaleString()}
          icon={<ShoppingBag className="text-blue-400" />} 
          trend="All time"
        />
        <StatCard 
          title="Visitors" 
          value={stats.totalVisitors.toLocaleString()}
          icon={<Users className="text-purple-400" />} 
          trend="Unique visitors"
        />
        <StatCard 
          title="Conversion Rate" 
          value={`${stats.conversionRate.toFixed(1)}%`}
          icon={<TrendingUp className="text-yellow-400" />} 
          trend="Purchases / views"
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-[#0f0f0f] border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Revenue</h2>
              <p className="text-xs text-slate-500">Last 6 months performance</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `KES ${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={false}
                  fill="url(#colorRevenue)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Usage Chart */}
        <div className="bg-[#0f0f0f] border border-slate-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Device Usage</h2>
            <p className="text-xs text-slate-500">How visitors visit your shop</p>
          </div>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.deviceUsage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.deviceUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-white">
                {stats.deviceUsage.reduce((total, entry) => total + entry.value, 0)}
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {stats.deviceUsage.map((device) => (
              <div key={device.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: device.color }}></div>
                <span className="text-xs text-slate-400">{device.name}</span>
              </div>
            ))}
            {stats.deviceUsage.length === 0 && <span className="text-xs text-slate-500">Device data not available yet</span>}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitors Distribution (Map Placeholder) */}
        <div className="bg-[#0f0f0f] border border-slate-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Visitors Distribution</h2>
            <p className="text-xs text-slate-500">Visual breakdown of global visitors activity</p>
          </div>
          <div className="space-y-3">
            {stats.visitorsDistribution.map((entry) => (
              <div key={entry.country} className="flex items-center justify-between rounded-lg bg-slate-900/60 px-4 py-3">
                <span className="text-sm text-slate-300">{entry.country}</span>
                <span className="text-sm font-semibold text-white">{entry.visitors.toLocaleString()}</span>
              </div>
            ))}
            {stats.visitorsDistribution.length === 0 && (
              <p className="rounded-lg bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-500">
                Visitor location data will appear when customers view your products.
              </p>
            )}
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-[#0f0f0f] border border-slate-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
            <p className="text-xs text-slate-500">A quick snapshot of your latest transactions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                    <td className="px-4 py-3 font-medium text-white">{order.id}</td>
                    <td className="px-4 py-3 text-slate-300">{order.customer}</td>
                    <td className="px-4 py-3 text-slate-300">KES {order.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                        order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
                {stats.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-slate-500">No recent orders</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Component for Stat Cards
const StatCard = ({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) => (
  <div className="bg-[#0f0f0f] border border-slate-800 p-5 rounded-xl flex items-start justify-between">
    <div>
      <p className="text-slate-400 text-sm mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      <p className="text-xs mt-2 text-slate-500">
        {trend}
      </p>
    </div>
    <div className="p-3 bg-slate-900/50 rounded-lg">
      {icon}
    </div>
  </div>
);

export default DashboardPage;