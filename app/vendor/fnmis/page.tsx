"use client";
import { useEffect, useState, useCallback } from "react";
import { Globe, Clock, CheckCircle, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import BsDateDisplay from "@/components/BsDateDisplay";
import { useToast } from "@/components/providers/ToastContext";
import { useRealtimeRefresh } from "@/components/shared/hooks/useRealtimeRefresh";

type FnmisBooking = {
  id: string;
  checkIn: string;
  checkOut: string;
  fnmisDeadline: string | null;
  fnmisReported: boolean;
  fnmisOverdue: boolean;
  isOverdue: boolean;
  hoursLeft: number | null;
  user: { name: string; email: string; passportNumber: string | null; purposeOfVisit: string | null };
  hotel: { name: string; city: string };
  room: { name: string };
};

type FilterTab = "ALL" | "PENDING" | "OVERDUE";
const FILTER_TABS: FilterTab[] = ["ALL", "PENDING", "OVERDUE"];

export default function VendorFnmisPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [bookings, setBookings]   = useState<FnmisBooking[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<FilterTab>("ALL");
  const [reporting, setReporting] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/fnmis");
      const data = await res.json();
      if (data.success) setBookings(data.data ?? []);
      else toastError(data.error ?? "Failed to load FNMIS data");
    } catch {
      toastError("Network error loading FNMIS data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useRealtimeRefresh(fetchBookings);

  const report = async (bookingId: string) => {
    setReporting(bookingId);
    try {
      const res  = await fetch("/api/fnmis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (data.success) {
        toastSuccess(data.message ?? "FNMIS record submitted successfully");
        await fetchBookings();
      } else {
        toastError(data.error ?? "Failed to submit FNMIS record");
      }
    } catch {
      toastError("Network error");
    } finally {
      setReporting(null);
    }
  };

  const filtered = bookings.filter(b => {
    if (tab === "PENDING") return !b.fnmisReported && !b.isOverdue;
    if (tab === "OVERDUE") return b.isOverdue;
    return true;
  });

  const counts = {
    ALL:     bookings.length,
    PENDING: bookings.filter(b => !b.fnmisReported && !b.isOverdue).length,
    OVERDUE: bookings.filter(b => b.isOverdue).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">FNMIS Reporting</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Foreign National Management — record foreign guests within 24 hours of check-in
            </p>
          </div>
          <button onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-2xl font-bold text-slate-800">{counts.ALL}</p>
            <div className="flex items-center gap-2 mt-1">
              <Globe className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">Foreign Guests (Unreported)</p>
            </div>
          </div>
          <div className={`rounded-2xl border p-4 ${counts.PENDING > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100"}`}>
            <p className={`text-2xl font-bold ${counts.PENDING > 0 ? "text-amber-700" : "text-slate-800"}`}>{counts.PENDING}</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <p className={`text-sm ${counts.PENDING > 0 ? "text-amber-600" : "text-slate-500"}`}>Pending Record</p>
            </div>
          </div>
          <div className={`rounded-2xl border p-4 ${counts.OVERDUE > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-100"}`}>
            <p className={`text-2xl font-bold ${counts.OVERDUE > 0 ? "text-red-700" : "text-slate-800"}`}>{counts.OVERDUE}</p>
            <div className="flex items-center gap-2 mt-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className={`text-sm ${counts.OVERDUE > 0 ? "text-red-600" : "text-slate-500"}`}>Overdue</p>
            </div>
          </div>
        </div>

        {/* Overdue alert */}
        {counts.OVERDUE > 0 && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Overdue FNMIS records detected!</p>
              <p className="text-xs text-red-600 mt-0.5">
                {counts.OVERDUE} booking{counts.OVERDUE > 1 ? "s have" : " has"} exceeded the 24-hour recording window.
                Mark them immediately to maintain compliance.
              </p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {FILTER_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                tab === t ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400"
              }`}>
              {t} ({counts[t]})
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 h-20 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 text-center py-16">
            <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-600">No foreign guests require recording</p>
            <p className="text-sm text-slate-400 mt-1">All unreported foreign guest bookings will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Guest", "Passport No.", "Room", "Check-in", "FNMIS Deadline", "Status", "Action"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(b => (
                    <tr key={b.id} className={`hover:bg-slate-50/50 ${b.isOverdue ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{b.user.name}</p>
                        <p className="text-xs text-slate-400">{b.user.email}</p>
                        {b.user.purposeOfVisit && <p className="text-xs text-slate-400">{b.user.purposeOfVisit}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                          {b.user.passportNumber ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{b.room.name}</td>
                      <td className="px-4 py-3">
                        <BsDateDisplay date={b.checkIn} className="text-xs" />
                      </td>
                      <td className="px-4 py-3">
                        {b.fnmisDeadline ? (
                          <div>
                            <BsDateDisplay date={b.fnmisDeadline} className="text-xs" />
                            {!b.fnmisReported && b.hoursLeft !== null && (
                              <p className={`text-xs mt-0.5 font-semibold ${b.isOverdue ? "text-red-600" : "text-amber-600"}`}>
                                {b.isOverdue ? "OVERDUE" : `${b.hoursLeft}h remaining`}
                              </p>
                            )}
                          </div>
                        ) : <span className="text-xs text-slate-400">N/A</span>}
                      </td>
                      <td className="px-4 py-3">
                        {b.fnmisReported ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />Recorded
                          </span>
                        ) : b.isOverdue ? (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />Overdue
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <Clock className="w-3.5 h-3.5" />Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!b.fnmisReported && (
                          <button
                            onClick={() => report(b.id)}
                            disabled={reporting === b.id}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                              b.isOverdue
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-amber-500 hover:bg-amber-600 text-white"
                            }`}>
                            {reporting === b.id
                              ? <><Loader2 className="w-3 h-3 animate-spin" />Recording…</>
                              : "Mark Recorded"
                            }
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-400 text-center">
          All foreign nationals must be recorded within 24 hours of check-in per Nepal Tourism regulations (FNMIS).
        </p>
      </main>
    </div>
  );
}
