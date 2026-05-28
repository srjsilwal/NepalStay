"use client";
import { useEffect, useState, useCallback } from "react";
import { CalendarCheck, RefreshCw, CheckCircle, Loader2, AlertCircle, X, RotateCcw, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import BsDateDisplay from "@/components/BsDateDisplay";
import { useToast } from "@/components/providers/ToastContext";
import { useRealtimeRefresh } from "@/components/shared/hooks/useRealtimeRefresh";

type Booking = {
  id: string; status: string; checkIn: string; checkOut: string;
  nights: number; totalPrice: number; paymentStatus: string;
  refundStatus: string; invoiceNumber: string | null; paidAt: string | null;
  createdAt: string;
  user:  { name: string; email: string; phone: string | null };
  hotel: { name: string };
  room:  { name: string; type: string };
};

type RefundResult = {
  creditNoteNumber: string;
  refundAmount: number;
  refundPercent: number;
  refundStatus: string;
  policy: string;
  manualProcessingRequired: boolean;
};

const STATUS_CLS: Record<string, string> = {
  PENDING:     "bg-yellow-100 text-yellow-800",
  CONFIRMED:   "bg-blue-100 text-blue-800",
  CHECKED_IN:  "bg-green-100 text-green-800",
  CHECKED_OUT: "bg-slate-100 text-slate-700",
  CANCELLED:   "bg-red-100 text-red-800",
  NO_SHOW:     "bg-orange-100 text-orange-800",
};

function RowSkeleton() {
  return (
    <tr className="border-b border-slate-50 animate-pulse">
      {[1,2,3,4,5,6,7,8].map(i => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20"/></td>
      ))}
    </tr>
  );
}

function RefundModal({ booking, onClose, onConfirm, loading }: {
  booking: Booking;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("Guest cancellation");
  const daysToCheckIn = Math.ceil((new Date(booking.checkIn).getTime() - Date.now()) / 86400000);
  // Improved refund calculation: ensure minimum refund for any cancellation
  const pct =
  daysToCheckIn > 7
    ? 100
    : daysToCheckIn >= 3
    ? 50
    : 25;
  const refundAmt = Math.round(booking.totalPrice * pct / 100);
  const policy = daysToCheckIn > 7 ? "Full refund (>7 days)" : daysToCheckIn >= 3 ? "50% refund (3–7 days)" : "25% refund (<3 days)";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={!loading ? onClose : undefined}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Process Refund</h2>
            <p className="text-xs text-slate-500 mt-0.5">Guest cancelled — process refund per policy</p>
          </div>
          <button onClick={onClose} disabled={loading} className={`${loading ? "opacity-50 cursor-not-allowed" : "text-slate-400 hover:text-slate-600"}`}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Guest</span>
              <span className="font-medium text-slate-800">{booking.user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Room</span>
              <span className="font-medium text-slate-800">{booking.room.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Original Amount</span>
              <span className="font-medium text-slate-800">NPR {booking.totalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-500">Policy (Days to check-in)</span>
              <span className="font-medium text-slate-600 text-xs text-right">
                {daysToCheckIn > 7 ? "100% refund (>7 days)" : daysToCheckIn >= 3 ? "50% refund (3-7 days)" : "25% refund (<3 days)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-semibold">Refund Amount</span>
              <span className={`font-bold text-lg ${refundAmt > 0 ? "text-green-700" : "text-red-600"}`}>
                NPR {refundAmt.toLocaleString()} ({pct}%)
              </span>
            </div>
          </div>
          {pct < 50 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600">
                Limited refund due to short cancellation notice. Guest will receive NPR {refundAmt.toLocaleString()}.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for Cancellation</label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={loading}
              className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={loading}
              className={`flex-1 py-2.5 border border-slate-200 rounded-xl text-sm transition-colors ${loading ? "opacity-50 cursor-not-allowed text-slate-400" : "text-slate-600 hover:bg-slate-50"}`}>
              Cancel
            </button>
            <button onClick={() => onConfirm(reason)} disabled={loading}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Refund
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefundResultModal({ result, onClose }: { result: RefundResult; onClose: () => void }) {
  const handleDone = () => {
    onClose();
  };

  const isNotEligible = result.refundStatus === "NOT_ELIGIBLE";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleDone}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            {isNotEligible ? (
              <>
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <AlertCircle className="w-7 h-7 text-slate-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Booking Cancelled</h2>
                <p className="text-slate-500 text-sm mt-1">No refund applicable</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">✅ Refund Processed Successfully</h2>
                <p className="text-slate-500 text-sm mt-1">Credit note has been issued to guest</p>
              </>
            )}
          </div>

          <div className={`rounded-xl p-4 space-y-3 text-sm mb-6 border ${
            isNotEligible 
              ? "bg-slate-50 border-slate-200" 
              : "bg-green-50 border-green-200"
          }`}>
            {!isNotEligible && (
              <div className="flex justify-between">
                <span className="text-slate-600">Credit Note #</span>
                <span className="font-mono font-bold text-green-700">{result.creditNoteNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">Refund Amount</span>
              <span className={`font-bold ${isNotEligible ? "text-slate-600" : "text-green-700"}`}>
                NPR {(result.refundAmount || 0).toLocaleString()} ({result.refundPercent || 0}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Status</span>
              <span className={`font-bold ${
                result.refundStatus === "COMPLETED" 
                  ? "text-green-600" 
                  : isNotEligible 
                  ? "text-slate-600"
                  : "text-amber-600"
              }`}>
                {result.refundStatus === "COMPLETED" ? "✓ Completed" : 
                 result.refundStatus === "NOT_ELIGIBLE" ? "No Refund" : 
                 "⏳ Pending (3-5 days)"}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3">
              <span className="text-slate-600">Policy</span>
              <span className="text-slate-700 font-medium text-xs text-right">{result.policy}</span>
            </div>
          </div>

          {result.manualProcessingRequired && !isNotEligible && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600">
                <strong>Manual Processing Required:</strong> Khalti refund is pending. It will be processed within 3–5 business days.
              </p>
            </div>
          )}

          <button onClick={handleDone}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
              isNotEligible
                ? "bg-slate-600 hover:bg-slate-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorBookingsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("ALL");
  const [working, setWorking]     = useState<string | null>(null);
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [refundResult, setRefundResult] = useState<RefundResult | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const url  = filter !== "ALL" ? `/api/bookings?status=${filter}&limit=100` : "/api/bookings?limit=100";
    const res  = await fetch(url);
    const data = await res.json();
    if (data.success) setBookings(data.data);
    else toastError("Failed to load bookings");
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useRealtimeRefresh(fetchBookings);

  const updateStatus = async (id: string, status: string) => {
    setWorking(id);
    const res  = await fetch(`/api/bookings/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setWorking(null);
    if (data.success) {
      toastSuccess(`Booking ${status.replace("_"," ").toLowerCase()}`);
      fetchBookings();
    } else toastError(data.error);
  };

  const processRefund = async (reason: string) => {
    if (!refundBooking) return;
    setRefunding(true);
    try {
      const res = await fetch(`/api/bookings/${refundBooking.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      
      if (data.success && data.refund) {
        // Close confirmation modal and show result modal
        setRefundBooking(null);
        // Use API response directly - now has consistent structure
        const refundData: RefundResult = {
          creditNoteNumber: data.refund.creditNoteNumber,
          refundAmount: data.refund.refundAmount,
          refundPercent: data.refund.refundPercent,
          refundStatus: data.refund.refundStatus,
          policy: data.refund.policy,
          manualProcessingRequired: data.refund.manualProcessingRequired,
        };
        setRefundResult(refundData);
        // Refresh bookings in background
        await fetchBookings();;
      } else {
        toastError(data.error ?? "Failed to process refund");
      }
    } catch (err) {
      console.error("[VENDOR_REFUND]", err);
      toastError("Network error processing refund");
    } finally {
      setRefunding(false);
    }
  };

 

  const counts = {
    ALL:         bookings.length,
    PENDING:     bookings.filter(b => b.status === "PENDING").length,
    CONFIRMED:   bookings.filter(b => b.status === "CONFIRMED").length,
    CHECKED_IN:  bookings.filter(b => b.status === "CHECKED_IN").length,
    CHECKED_OUT: bookings.filter(b => b.status === "CHECKED_OUT").length,
  };

  // Show "Refund" button only on CANCELLED bookings where refund is pending
  // (i.e., customer cancelled and now vendor needs to process refund)
  const canRefund = (b: Booking) =>
  b.status === "CANCELLED" &&
  !!b.paidAt &&
  (
    b.refundStatus === "PENDING" ||
    b.refundStatus === "NONE"
  );

  // Show "Issue Invoice" button for cash bookings that are confirmed/checked-in/checked-out and don't have invoice yet
  const canIssueInvoice = (b: Booking) =>
    ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status) &&
    !b.invoiceNumber &&
    b.paymentStatus === "UNPAID" &&
    !b.paidAt;

  const issueInvoice = async (bookingId: string) => {
    setWorking(bookingId);
    try {
      const res = await fetch("/api/vendor/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      setWorking(null);
      if (data.success) {
        toastSuccess(`Invoice ${data.data.invoiceNumber} issued`);
        fetchBookings();
      } else {
        toastError(data.error || "Failed to issue invoice");
      }
    } catch (err) {
      setWorking(null);
      toastError("Network error");
    }
  };

  // Disabled - only vendors process refunds, no admin/staff involvement
 

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Bookings</h1>
            <p className="text-slate-500 mt-1 text-sm">{bookings.length} total bookings for your hotel</p>
          </div>
          <button onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(["ALL","PENDING","CONFIRMED","CHECKED_IN","CHECKED_OUT"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === s ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400"
              }`}>
              {s === "ALL" ? "All" : s.replace("_"," ")} ({counts[s as keyof typeof counts] ?? 0})
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Guest","Room","Check-in","Check-out","Total","Status","Payment","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading
                  ? [1,2,3,4,5].map(i => <RowSkeleton key={i} />)
                  : bookings.length === 0
                  ? (
                    <tr><td colSpan={8} className="text-center py-14 text-slate-400">
                      <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No bookings found.
                    </td></tr>
                  )
                  : bookings.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{b.user?.name}</p>
                        <p className="text-xs text-slate-400">{b.user?.email}</p>
                        {b.user?.phone && <p className="text-xs text-slate-400">{b.user.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {b.room?.name}<br/>
                        <span className="text-slate-400">{b.room?.type}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <BsDateDisplay date={b.checkIn} className="text-xs" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <BsDateDisplay date={b.checkOut} className="text-xs" />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                        NPR {b.totalPrice?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[b.status]}`}>
                          {b.status.replace("_"," ")}
                        </span>
                        {b.refundStatus !== "NONE" && (
                          <p className="text-xs text-orange-600 mt-0.5">{b.refundStatus}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {b.paidAt ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3 h-3" />Paid
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Unpaid</span>
                        )}
                        {b.invoiceNumber && (
                          <p className="text-xs font-mono text-green-700 mt-0.5">{b.invoiceNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {b.status === "PENDING" && (
                            <button onClick={() => updateStatus(b.id, "CONFIRMED")} disabled={working === b.id}
                              className="text-xs px-2.5 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 whitespace-nowrap">
                              {working === b.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : null} Confirm
                            </button>
                          )}
                          {b.status === "CONFIRMED" && (
                            <button onClick={() => updateStatus(b.id, "CHECKED_IN")} disabled={working === b.id}
                              className="text-xs px-2.5 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:opacity-50 whitespace-nowrap">
                              Check In
                            </button>
                          )}
                          {b.status === "CHECKED_IN" && (
                            <button onClick={() => updateStatus(b.id, "CHECKED_OUT")} disabled={working === b.id}
                              className="text-xs px-2.5 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium disabled:opacity-50 whitespace-nowrap">
                              Check Out
                            </button>
                          )}
                          {b.status === "CONFIRMED" && (
                            <button onClick={() => updateStatus(b.id, "NO_SHOW")} disabled={working === b.id}
                              className="text-xs px-2.5 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 font-medium disabled:opacity-50 whitespace-nowrap">
                              No Show
                            </button>
                          )}
                          {b.status === "PENDING" && (
                            <button onClick={() => updateStatus(b.id, "CANCELLED")} disabled={working === b.id}
                              className="text-xs px-2.5 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 font-medium disabled:opacity-50 whitespace-nowrap">
                              Cancel
                            </button>
                          )}
                          {canRefund(b) && (
                            <button onClick={() => setRefundBooking(b)} disabled={working === b.id}
                              className="text-xs px-2.5 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-medium disabled:opacity-50 whitespace-nowrap flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />Refund
                            </button>
                          )}
                          {canIssueInvoice(b) && (
                            <button onClick={() => issueInvoice(b.id)} disabled={working === b.id}
                              className="text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium disabled:opacity-50 whitespace-nowrap flex items-center gap-1">
                              {working === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                              Invoice
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Refund confirmation modal */}
      {refundBooking && (
        <RefundModal
          booking={refundBooking}
          onClose={() => setRefundBooking(null)}
          onConfirm={processRefund}
          loading={refunding}
        />
      )}

      {/* Refund result modal */}
      {refundResult && (
        <RefundResultModal
          result={refundResult}
          onClose={() => {
            setRefundResult(null);
            toastSuccess(
  refundResult?.refundStatus === "COMPLETED"
    ? "Refund completed successfully."
    : "Refund request submitted."
);
          }}
        />
      )}
    </div>
  );
}
