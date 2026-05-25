"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2, CalendarCheck, TrendingUp, TrendingDown,
  AlertTriangle, Globe, FileText, ArrowRight,
  Store, MessageSquareWarning,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/providers/ToastContext";

type Stats = {
  totalHotels: number; pendingHotels: number; approvedHotels: number;
  totalUsers: number; totalBookings: number; pendingBookings: number;
  revenueThisMonth: number; revenueLastMonth: number; revenueGrowth: number;
  pendingRefunds: number; fnmisPending: number; pendingComplaints: number;
  rooms: Record<string, number>;
};

export default function AdminDashboard() {
  const { error: toastError } = useToast();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); else toastError("Failed to load stats"); })
      .catch(() => toastError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i=><div key={i} className="bg-white rounded-2xl h-32 border border-slate-100"/>)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i=><div key={i} className="bg-slate-100 rounded-xl h-20"/>)}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Platform-wide overview</p>
        </div>

        {/* Alert banners */}
        {(stats.pendingHotels > 0 || stats.pendingRefunds > 0 || stats.fnmisPending > 0 || (stats.pendingComplaints ?? 0) > 0) && (
          <div className="space-y-2 mb-6">
            {stats.pendingHotels > 0 && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800 text-sm">
                    {stats.pendingHotels} hotel listing{stats.pendingHotels > 1 ? "s" : ""} awaiting approval
                  </p>
                </div>
                <Link href="/admin/hotels?status=PENDING"
                  className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium whitespace-nowrap">
                  Review →
                </Link>
              </div>
            )}
            {stats.pendingRefunds > 0 && (
              <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <p className="flex-1 font-semibold text-orange-800 text-sm">
                  {stats.pendingRefunds} refund{stats.pendingRefunds > 1 ? "s" : ""} require manual processing
                </p>
                <Link href="/admin/refunds"
                  className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium whitespace-nowrap">
                  Process →
                </Link>
              </div>
            )}
            {stats.fnmisPending > 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <Globe className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="flex-1 font-semibold text-red-800 text-sm">
                  {stats.fnmisPending} overdue FNMIS record{stats.fnmisPending > 1 ? "s" : ""} — action required
                </p>
                <Link href="/admin/fnmis"
                  className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium whitespace-nowrap">
                  View →
                </Link>
              </div>
            )}
            {(stats.pendingComplaints ?? 0) > 0 && (
              <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                <MessageSquareWarning className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <p className="flex-1 font-semibold text-purple-800 text-sm">
                  {stats.pendingComplaints} open complaint{stats.pendingComplaints > 1 ? "s" : ""} require attention
                </p>
                <Link href="/admin/complaints"
                  className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium whitespace-nowrap">
                  Review →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Revenue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Revenue This Month", value: `NPR ${stats.revenueThisMonth.toLocaleString()}`,
              sub: `Last month: NPR ${stats.revenueLastMonth.toLocaleString()}`,
              trend: stats.revenueGrowth, icon: TrendingUp, cls: "text-green-600 bg-green-50" },
            { label: "Total Bookings", value: stats.totalBookings,
              sub: `${stats.pendingBookings} pending`, icon: CalendarCheck, cls: "text-blue-600 bg-blue-50" },
            { label: "Total Hotels", value: stats.totalHotels,
              sub: `${stats.approvedHotels} approved`, icon: Building2, cls: "text-purple-600 bg-purple-50" },
            { label: "Registered Users", value: stats.totalUsers,
              icon: Store, cls: "text-amber-600 bg-amber-50" },
          ].map(({ label, value, sub, trend, icon: Icon, cls }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cls}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {trend !== undefined && (
                  <span className={`text-xs font-semibold flex items-center gap-1 ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(trend).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{label}</p>
              {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Room status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Available",   key: "AVAILABLE",   cls: "bg-green-50 border-green-200 text-green-700" },
            { label: "Occupied",    key: "OCCUPIED",    cls: "bg-blue-50 border-blue-200 text-blue-700" },
            { label: "Cleaning",    key: "CLEANING",    cls: "bg-yellow-50 border-yellow-200 text-yellow-700" },
            { label: "Maintenance", key: "MAINTENANCE", cls: "bg-red-50 border-red-200 text-red-700" },
          ].map(({ label, key, cls }) => (
            <div key={key} className={`rounded-xl border p-4 ${cls}`}>
              <p className="text-2xl font-bold">{stats.rooms[key] ?? 0}</p>
              <p className="text-xs font-medium mt-0.5">{label} rooms</p>
            </div>
          ))}
        </div>

        {/* Quick nav */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { href: "/admin/hotels",    icon: Building2,             label: "Hotel Approvals",  sub: `${stats.pendingHotels} pending` },
              { href: "/admin/complaints",icon: MessageSquareWarning,  label: "Complaints",        sub: `${stats.pendingComplaints ?? 0} open` },
              { href: "/admin/fnmis",     icon: Globe,                 label: "FNMIS Reports",     sub: `${stats.fnmisPending} overdue` },
            ].map(({ href, icon: Icon, label, sub }) => (
              <Link key={href} href={href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
