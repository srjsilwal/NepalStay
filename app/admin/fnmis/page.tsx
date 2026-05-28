"use client";
import { useEffect, useState } from "react";
import {
  Globe, ShieldCheck, AlertTriangle, Clock, RefreshCw, Loader2, CheckCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BsDateDisplay from "@/components/BsDateDisplay";
import { useToast } from "@/components/providers/ToastContext";
import { useRealtimeRefresh } from "@/components/shared/hooks/useRealtimeRefresh";

type FnmisBooking = {
  id: string;
  fnmisReported: boolean;
  fnmisAutoReported: boolean;
  fnmisReportedAt: string | null;
  fnmisDeadline: string | null;
  fnmisOverdue: boolean;
  checkIn: string;
  status: string;
  isOverdue: boolean;
  hoursLeft: number | null;
  user: {
    name: string;
    email: string;
    passportNumber: string | null;
    nationality: string;
    purposeOfVisit: string | null;
  };
  hotel: { name: string; city: string };
  room:  { name: string };
};

function FnmisSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i=><div key={i} className="bg-white rounded-2xl h-24 border border-slate-100"/>)}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 h-48"/>
    </div>
  );
}

export default function AdminFnmisPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [bookings, setBookings] = useState<FnmisBooking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [reporting, setReporting] = useState<string | null>(null);
  const [filter, setFilter]     = useState<"ALL" | "PENDING" | "OVERDUE" | "REPORTED">("ALL");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/fnmis");
      const data = await res.json();
      if (data.success) setBookings(data.data ?? []);
      else toastError(data.error ?? "Failed to load FNMIS data");
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useRealtimeRefresh(fetchData);

  const reportFNMIS = async (id: string, guestName: string) => {
    setReporting(id);
    try {
      const res  = await fetch("/api/fnmis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      const data = await res.json();
      if (data.success) { toastSuccess(`FNMIS recorded for ${guestName}`); fetchData(); }
      else toastError(data.error ?? "Failed to submit");
    } catch {
      toastError("Network error");
    } finally {
      setReporting(null);
    }
  };

  const filtered = bookings.filter(b => {
    if (filter === "PENDING")  return !b.fnmisReported;
    if (filter === "OVERDUE")  return b.isOverdue;
    if (filter === "REPORTED") return b.fnmisReported;
    return true;
  });

  const counts = {
    ALL:      bookings.length,
    PENDING:  bookings.filter(b => !b.fnmisReported).length,
    OVERDUE:  bookings.filter(b => b.isOverdue).length,
    REPORTED: bookings.filter(b => b.fnmisReported).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">FNMIS Compliance</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Foreign National Management Information System — hotels must record within 24 hours of check-in
            </p>
          </div>
          <button onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>

        {loading ? <FnmisSkeleton /> : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { key: "ALL",      label: "Total Foreign Guests", cls: "bg-slate-100 text-slate-700 border-slate-200" },
                { key: "PENDING",  label: "Unreported",           cls: "bg-amber-50 text-amber-700 border-amber-200" },
                { key: "OVERDUE",  label: "Overdue (>24h)",       cls: "bg-red-50 text-red-700 border-red-200" },
                { key: "REPORTED", label: "Recorded",             cls: "bg-green-50 text-green-700 border-green-200" },
              ].map(({ key, label, cls }) => (
                <button key={key} onClick={() => setFilter(key as any)}
                  className={`rounded-xl border p-4 text-left transition-all ${cls} ${filter === key ? "ring-2 ring-offset-1 ring-current opacity-100" : "opacity-80 hover:opacity-100"}`}>
                  <p className="text-2xl font-bold">{counts[key as keyof typeof counts]}</p>
                  <p className="text-xs font-medium mt-0.5">{label}</p>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["Guest","Passport","Hotel","Room","Check-in","Deadline","Status","Action"].map(h=>(
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                        <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No foreign guests in this category.
                      </td></tr>
                    )}
                    {filtered.map(b => (
                      <tr key={b.id} className={`hover:bg-slate-50 ${b.isOverdue ? "bg-red-50/30" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{b.user.name}</p>
                          <p className="text-xs text-slate-400">{b.user.email}</p>
                          {b.user.purposeOfVisit && (
                            <p className="text-xs text-slate-400">{b.user.purposeOfVisit}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {b.user.passportNumber ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {b.hotel.name}<br/>
                          <span className="text-slate-400">{b.hotel.city}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{b.room.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <BsDateDisplay date={b.checkIn} showBoth />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {b.fnmisDeadline ? (
                            <div>
                              <BsDateDisplay date={b.fnmisDeadline} className="text-xs" />
                              {!b.fnmisReported && b.hoursLeft !== null && (
                                <p className={`text-xs font-semibold ${b.isOverdue ? "text-red-600" : b.hoursLeft < 6 ? "text-orange-600" : "text-slate-400"}`}>
                                  {b.isOverdue ? "OVERDUE" : `${b.hoursLeft}h left`}
                                </p>
                              )}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {b.fnmisReported ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                              <CheckCircle className="w-3.5 h-3.5" />Recorded
                            </span>
                          ) : b.isOverdue ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                              <AlertTriangle className="w-3.5 h-3.5" />Overdue
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <Clock className="w-3.5 h-3.5" />Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!b.fnmisReported ? (
                            <button onClick={() => reportFNMIS(b.id, b.user.name)}
                              disabled={reporting === b.id}
                              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 ${
                                b.isOverdue
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                              }`}>
                              {reporting === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                              Mark Recorded
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {b.fnmisReportedAt ? new Date(b.fnmisReportedAt).toLocaleDateString() : "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
