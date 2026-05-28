"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, RefreshCw, FileText, ShieldCheck, AlertCircle, DollarSign, CheckCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BsDateDisplay from "@/components/BsDateDisplay";
import { useToast } from "@/components/providers/ToastContext";
import { useRealtimeRefresh } from "@/components/shared/hooks/useRealtimeRefresh";

type Booking = {
  id: string; status: string; checkIn: string; checkOut: string; totalPrice: number;
  paymentStatus: string; invoiceNumber: string | null; creditNoteRef: string | null;
  refundStatus: string; refundAmount: number | null; refundPercent: number | null;
  paidAt: string | null; fnmisReported: boolean; fnmisAutoReported: boolean;
  passportNumber: string | null; guestNationality: string | null;
  user:  { name: string; email: string };
  hotel: { name: string; city: string };
  room:  { name: string; type: string };
};

const STATUS_CLS: Record<string, string> = {
  PENDING:     "bg-yellow-100 text-yellow-800",
  CONFIRMED:   "bg-blue-100 text-blue-800",
  CHECKED_IN:  "bg-green-100 text-green-800",
  CHECKED_OUT: "bg-slate-100 text-slate-700",
  CANCELLED:   "bg-red-100 text-red-800",
  NO_SHOW:     "bg-orange-100 text-orange-800",
};

const REFUND_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING:      { label: "Refund Pending",  cls: "bg-orange-100 text-orange-700 border border-orange-200" },
  COMPLETED:    { label: "Refunded",        cls: "bg-green-100 text-green-700 border border-green-200" },
  NOT_ELIGIBLE: { label: "No Refund",       cls: "bg-slate-100 text-slate-500 border border-slate-200" },
};

function RowSkeleton() {
  return (
    <tr className="border-b border-slate-50 animate-pulse">
      {[1,2,3,4,5,6,7,8,9,10].map(i => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20"/></td>
      ))}
    </tr>
  );
}

export default function AdminBookingsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("ALL");
  const [working, setWorking]     = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = filter !== "ALL" ? `?status=${filter}&limit=100` : "?limit=100";
    const res    = await fetch(`/api/bookings${params}`);
    const data   = await res.json();
    if (data.success) setBookings(data.data);
    else toastError("Failed to load bookings");
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useRealtimeRefresh(fetchBookings);

  const issueInvoice = async (id: string) => {
    setWorking(id + "_inv");
    const res = await fetch("/api/admin/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: id }),
    });
    const data = await res.json();
    if (data.success) {
      toastSuccess(`Invoice ${data.data.invoiceNumber} issued (cash payment)`);
    } else {
      toastError(data.error);
    }
    await fetchBookings();
    setWorking(null);
  };

  const reportFNMIS = async (id: string, guestName: string) => {
    setWorking(id + "_fnmis");
    const res  = await fetch("/api/fnmis", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: id }),
    });
    const data = await res.json();
    if (data.success) toastSuccess(`FNMIS reported for ${guestName}`); else toastError(data.error);
    await fetchBookings();
    setWorking(null);
  };

  const pendingRefundCount = bookings.filter(b => b.refundStatus === "PENDING").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Booking Management</h1>
            <p className="text-slate-500 mt-1 text-sm">All bookings across all hotels</p>
          </div>
          <button onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>

        {pendingRefundCount > 0 && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-orange-800 text-sm">
                {pendingRefundCount} refund{pendingRefundCount > 1 ? "s" : ""} require manual processing
              </p>
              <p className="text-orange-600 text-xs mt-0.5">Refund pending. Contact hotel to confirm manual transfer completion.</p>
            </div>
            <button onClick={() => setFilter("CANCELLED")}
              className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium whitespace-nowrap">
              View Cancelled
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["ALL","PENDING","CONFIRMED","CHECKED_IN","CHECKED_OUT","CANCELLED"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === s ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400"
              }`}>
              {s === "ALL" ? "All Bookings" : s.replace("_"," ")}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Guest","Hotel","Room","Check-in","Check-out","Total","Status","Invoice","Refund","FNMIS","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading
                  ? [1,2,3,4,5,6,7,8].map(i => <RowSkeleton key={i} />)
                  : bookings.length === 0
                  ? <tr><td colSpan={11} className="text-center py-12 text-slate-400">No bookings found.</td></tr>
                  : bookings.map(b => (
                    <tr key={b.id} className={`hover:bg-slate-50/50 ${b.refundStatus === "PENDING" ? "bg-orange-50/20" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{b.user?.name}</p>
                        <p className="text-xs text-slate-400">{b.user?.email}</p>
                        {b.guestNationality && b.guestNationality !== "Nepali" && (
                          <p className="text-xs text-blue-600">🌍 {b.guestNationality}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {b.hotel?.name}<br/><span className="text-slate-400">{b.hotel?.city}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {b.room?.name}<br/><span className="text-slate-400">{b.room?.type}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><BsDateDisplay date={b.checkIn} showBoth /></td>
                      <td className="px-4 py-3 whitespace-nowrap"><BsDateDisplay date={b.checkOut} showBoth /></td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap text-slate-800">
                        NPR {b.totalPrice?.toLocaleString()}
                        {b.paidAt && <p className="text-xs text-green-600 font-normal">✓ Paid</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[b.status]}`}>
                          {b.status.replace("_"," ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.invoiceNumber
                          ? <span className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded">{b.invoiceNumber}</span>
                          : ["CONFIRMED","CHECKED_IN","CHECKED_OUT"].includes(b.status)
                          ? (
                            <button onClick={() => issueInvoice(b.id)} disabled={working === b.id + "_inv"}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50">
                              <FileText className="w-3 h-3" />Issue
                            </button>
                          ) : null
                        }
                        {b.creditNoteRef && (
                          <span className="text-xs font-mono text-red-600 mt-0.5 block">{b.creditNoteRef}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {b.refundStatus && b.refundStatus !== "NONE" ? (
                          <div className="space-y-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium block w-fit ${REFUND_BADGE[b.refundStatus]?.cls ?? ""}`}>
                              {REFUND_BADGE[b.refundStatus]?.label ?? b.refundStatus}
                            </span>
                            {b.refundAmount != null && (
                              <p className="text-xs text-slate-400">NPR {b.refundAmount.toLocaleString()} ({b.refundPercent}%)</p>
                            )}
                            {b.refundStatus === "PENDING" && (
                              <p className="text-xs text-slate-500">Contact hotel to confirm.</p>
                            )}
                          </div>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {b.passportNumber ? (
                          b.fnmisReported ? (
                            <span className={`flex items-center gap-1 text-xs font-medium ${b.fnmisAutoReported ? "text-amber-600" : "text-green-600"}`}>
                              <ShieldCheck className="w-3 h-3" />{b.fnmisAutoReported ? "Auto" : "Reported"}
                            </span>
                          ) : (
                            <button onClick={() => reportFNMIS(b.id, b.user?.name)} disabled={working === b.id + "_fnmis"}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50">
                              {working === b.id + "_fnmis" ? <Loader2 className="w-3 h-3 animate-spin"/> : <ShieldCheck className="w-3 h-3"/>}
                              Report
                            </button>
                          )
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-400">Managed by hotel staff</p>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
