"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Globe,
  MapPin,
  BarChart2,
  Star,
  CalendarCheck,
  BedDouble,
  Award,
  RefreshCw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Stats = {
  overview: {
    totalHotels: number;
    totalBookings: number;
    totalVisitors: number;
    monthBookings: number;
    bookingGrowth: number;
    foreignGuests: number;
  };
  byCity: Array<{ city: string; hotels: number }>;
  byType: Array<{ type: string; count: number }>;
  topHotels: Array<{
    id: string;
    name: string;
    city: string;
    starRating: number;
    images: string[];
    slug: string;
    bookingCount: number;
    reviewCount: number;
  }>;
  generatedAt: string;
};

const PIE_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
];

function StatCard({
  icon: Icon,
  value,
  label,
  sub,
  trend,
  color = "amber",
}: {
  icon: any;
  value: string | number;
  label: string;
  sub?: string;
  trend?: number;
  color?: string;
}) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span
            className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? "text-green-600" : "text-red-500"}`}
          >
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-amber-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 className="w-6 h-6 text-amber-400" />
                <span className="text-amber-400 font-semibold text-sm uppercase tracking-wide">
                  Live Platform Data
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-2">
                Platform Statistics
              </h1>
              <p className="text-slate-300">
                Real-time statistics from NepalStay · Powered by actual booking
                data
              </p>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-28 border border-slate-100"
              />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Overview stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Building2}
                value={stats.overview.totalHotels}
                label="Active Hotels"
                sub="Approved listings"
                color="amber"
              />
              <StatCard
                icon={CalendarCheck}
                value={stats.overview.totalBookings}
                label="Total Bookings"
                sub="All confirmed stays"
                color="blue"
              />
              <StatCard
                icon={Users}
                value={stats.overview.totalVisitors.toLocaleString()}
                label="Guests Served"
                sub="Total visitors"
                color="green"
              />
              <StatCard
                icon={Globe}
                value={stats.overview.foreignGuests}
                label="Foreign Tourists"
                sub="FNMIS registered"
                color="purple"
              />
              <StatCard
                icon={CalendarCheck}
                value={stats.overview.monthBookings}
                label="Bookings This Month"
                trend={stats.overview.bookingGrowth}
                sub="vs last month"
                color="blue"
              />
              <StatCard
                icon={Building2}
                value={stats.byCity.length}
                label="Cities Covered"
                sub="Across Nepal"
                color="amber"
              />
              <StatCard
                icon={BedDouble}
                value={stats.byType.length}
                label="Property Types"
                sub="Hotel varieties"
                color="purple"
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Hotels by City */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  Hotels by City
                </h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={stats.byCity}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="city"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                      formatter={(val) => [`${val} hotels`, "Count"]}
                    />
                    <Bar
                      dataKey="hotels"
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Hotels by Type (Pie) */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  Property Types
                </h2>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={stats.byType}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ type, percent }) =>
                        `${type} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {stats.byType.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Hotels */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Most Popular Hotels on NepalStay
              </h2>
              <div className="space-y-3">
                {stats.topHotels.map((hotel, i) => (
                  <div
                    key={hotel.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    {/* Rank */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        i === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : i === 1
                            ? "bg-slate-100 text-slate-600"
                            : i === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      #{i + 1}
                    </div>

                    {/* Image */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                      {hotel.images?.[0] ? (
                        <Image
                          src={hotel.images[0]}
                          alt={hotel.name}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <BedDouble className="w-6 h-6 text-slate-400 m-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/hotels/${hotel.slug}`}
                        className="font-semibold text-slate-800 hover:text-amber-600 transition-colors"
                      >
                        {hotel.name}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {hotel.city}
                        </span>
                        <span>{"★".repeat(hotel.starRating)}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-800">
                        {hotel.bookingCount}
                      </p>
                      <p className="text-xs text-slate-400">bookings</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-amber-600">
                        {hotel.reviewCount}
                      </p>
                      <p className="text-xs text-slate-400">reviews</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <div className="mt-6 text-center text-xs text-slate-400">
              Data updated live from NepalStay bookings · Last refreshed{" "}
              {new Date(stats.generatedAt).toLocaleTimeString()}
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-slate-400">
            Failed to load statistics
          </div>
        )}
      </main>
    </div>
  );
}
