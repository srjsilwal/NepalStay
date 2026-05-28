"use client";
import { useEffect, useState } from "react";
import {
  BedDouble, CalendarCheck, Loader2, CheckCircle, XCircle, AlertCircle,
  Star, ChevronDown, ChevronUp, ReceiptText,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BsDateDisplay from "@/components/BsDateDisplay";
import { useToast } from "@/components/providers/ToastContext";
import { useRealtimeRefresh } from "@/components/shared/hooks/useRealtimeRefresh";
import Link from "next/link";

type Booking = {
  id: string; status: string; checkIn: string; checkOut: string;
  nights: number; totalPrice: number; adults: number; children: number;
  paymentStatus: string; invoiceNumber: string | null; creditNoteRef: string | null;
  refundStatus: string; refundAmount: number | null; refundPercent: number | null;
  paidAt: string | null; createdAt: string;
  hotel: { id: string; name: string; slug: string; city: string; images: string[] };
  room:  { name: string; type: string; floor: number };
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  PENDING:     { label: "Pending",    cls: "bg-yellow-100 text-yellow-800", icon: Loader2 },
  CONFIRMED:   { label: "Confirmed",  cls: "bg-blue-100 text-blue-800",    icon: CheckCircle },
  CHECKED_IN:  { label: "Checked In", cls: "bg-green-100 text-green-800",  icon: CheckCircle },
  CHECKED_OUT: { label: "Completed",  cls: "bg-slate-100 text-slate-700",  icon: CheckCircle },
  CANCELLED:   { label: "Cancelled",  cls: "bg-red-100 text-red-800",      icon: XCircle },
  NO_SHOW:     { label: "No Show",    cls: "bg-orange-100 text-orange-800", icon: AlertCircle },
};

function BookingSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-5 bg-slate-200 rounded w-1/3" />
        <div className="h-5 bg-slate-100 rounded w-24" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}
      </div>
    </div>
  );
}

export default function CustomerBookingsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refunding, setRefunding]   = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchBookings = async () => {
    const res  = await fetch("/api/bookings?limit=50");
    const data = await res.json();
    if (data.success) setBookings(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);
  useRealtimeRefresh(fetchBookings);

  const handleCancel = async (id: string, hasPaid: boolean) => {
    setConfirmCancel(null);
    setRefunding(id);
    let res: Response;
    if (hasPaid) {
      res = await fetch(`/api/bookings/${id}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    } else {
      res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
    }
    const data = await res.json();
    setRefunding(null);
    if (!data.success) {
      toastError(data.error || "Cancellation failed");
    } else if (hasPaid && data.refund?.refundAmount > 0) {
      const refundMessage = data.refund.refundPercent === 100 
        ? "Your full refund is being processed."
        : data.refund.refundPercent >= 50
        ? "A partial refund is being processed."
        : "A limited refund is being processed (short notice).";
      toastSuccess(`✓ Booking cancelled. ${refundMessage} You'll receive NPR ${data.refund.refundAmount.toLocaleString()} within 3–5 business days.`);
    } else if (hasPaid) {
      toastSuccess("✓ Booking cancelled. Unfortunately, no refund applies due to your cancellation timing. (Less than 3 days before check-in)");
    } else {
      toastSuccess("✓ Booking cancelled. No charge was made.");
    }
    fetchBookings();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <CalendarCheck className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-slate-800">My Bookings</h1>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map((i) => <BookingSkeleton key={i} />)}</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <BedDouble className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-600">No bookings yet</p>
            <Link href="/hotels" className="mt-3 inline-block text-amber-600 text-sm hover:underline">
              Browse hotels →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const cfg     = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.PENDING;
              const hasPaid = !!b.paidAt;
              const canCancel = ["PENDING", "CONFIRMED"].includes(b.status);
              const canReview = b.status === "CHECKED_OUT";
              const expanded  = expandedId === b.id;

              return (
                <div key={b.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  {/* Main row */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/hotels/${b.hotel.slug}`}
                          className="font-bold text-slate-800 hover:text-amber-600 transition-colors text-lg line-clamp-1">
                          {b.hotel.name}
                        </Link>
                        <p className="text-sm text-slate-500">{b.room.name} · {b.hotel.city}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {b.invoiceNumber && (
                          <span className="text-xs font-mono bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">
                            {b.invoiceNumber}
                          </span>
                        )}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Check-in</p>
                        <BsDateDisplay date={b.checkIn} className="font-medium text-slate-700" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Check-out</p>
                        <BsDateDisplay date={b.checkOut} className="font-medium text-slate-700" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Duration</p>
                        <p className="font-medium text-slate-700">{b.nights} night{b.nights !== 1 ? "s" : ""}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Total</p>
                        <p className="font-bold text-slate-800">NPR {b.totalPrice.toLocaleString()}</p>
                        {hasPaid && <p className="text-xs text-green-600">✓ Paid</p>}
                      </div>
                    </div>

                    {/* Cancellation/refund status */}
                    {b.status === "CANCELLED" && (
                      <div className={`mb-3 p-3 rounded-xl text-sm border flex gap-2 items-start ${
                        b.refundStatus === "COMPLETED" ? "bg-green-50 border-green-200 text-green-700" :
                        b.refundStatus === "PENDING"   ? "bg-amber-50 border-amber-200 text-amber-700" :
                        "bg-slate-50 border-slate-200 text-slate-600"
                      }`}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            {b.refundStatus === "COMPLETED" ? "Refund Completed" :
                             b.refundStatus === "PENDING"   ? "Refund Being Processed" :
                             b.creditNoteRef ? "Credit Note Issued" : "Booking Cancelled — No Charge"}
                          </p>
                          {b.creditNoteRef && <p className="text-xs mt-0.5 font-mono">{b.creditNoteRef}</p>}
                          {(b.refundAmount ?? 0) > 0 && (
                            <p className="text-xs mt-0.5">NPR {b.refundAmount?.toLocaleString()} ({b.refundPercent}%)</p>
                          )}
                          {b.refundStatus === "PENDING" && (
                            <p className="text-xs mt-1 font-medium">Refund will be processed within 3–5 business days.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {canCancel && (
                        confirmCancel === b.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-700 font-medium">Sure?</span>
                            <button onClick={() => handleCancel(b.id, hasPaid)} disabled={refunding === b.id}
                              className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50">
                              {refunding === b.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : null}
                              Yes, cancel
                            </button>
                            <button onClick={() => setConfirmCancel(null)}
                              className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmCancel(b.id)}
                            className="text-xs px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
                            Cancel Booking
                          </button>
                        )
                      )}

                      {canReview && (
                        <button onClick={() => setExpandedId(expanded ? null : b.id)}
                          className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5" />Write a Review
                        </button>
                      )}

                      <a href={`/customer/bookings/${b.id}`}
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                        View receipt
                      </a>
                      <button onClick={() => setExpandedId(expanded ? null : b.id)}
                        className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                        Details
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded — review form */}
                  {expanded && canReview && (
                    <ReviewForm bookingId={b.id} hotelName={b.hotel.name}
                      onSubmitted={() => { setExpandedId(null); fetchBookings(); }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function ReviewForm({ bookingId, hotelName, onSubmitted }: { bookingId: string; hotelName: string; onSubmitted: () => void }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [scores, setScores] = useState({ cleanlinessScore: 5, staffScore: 5, locationScore: 5, valueScore: 5, facilitiesScore: 5 });
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [saving, setSaving] = useState(false);

  const scoreKeys = [
    { key: "cleanlinessScore", label: "Cleanliness" },
    { key: "staffScore",       label: "Staff" },
    { key: "locationScore",    label: "Location" },
    { key: "valueScore",       label: "Value" },
    { key: "facilitiesScore",  label: "Facilities" },
  ] as const;

  const handleSubmit = async () => {
    if (!body.trim() || body.length < 10) { toastError("Review must be at least 10 characters"); return; }
    setSaving(true);
    const res  = await fetch("/api/reviews", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, ...scores, title: title || undefined, body }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) { toastSuccess("Review submitted! Thank you."); onSubmitted(); }
    else toastError(data.error || "Failed to submit review");
  };

  return (
    <div className="border-t border-slate-100 p-5 bg-amber-50/30">
      <h3 className="font-semibold text-slate-800 mb-4">Review your stay at {hotelName}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {scoreKeys.map(({ key, label }) => (
          <div key={key}>
            <p className="text-xs text-slate-500 mb-1.5">{label}</p>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <button key={s} type="button" onClick={() => setScores((p) => ({ ...p, [key]: s }))}
                  className="p-0.5">
                  <Star className={`w-5 h-5 transition-colors ${s <= scores[key] ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Summary (optional)" maxLength={120}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
        placeholder="Describe your experience (min 10 characters)…"
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3" />
      <button onClick={handleSubmit} disabled={saving}
        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60 flex items-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}Submit Review
      </button>
    </div>
  );
}
