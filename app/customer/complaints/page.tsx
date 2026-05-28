"use client";
import { useEffect, useState } from "react";
import { MessageSquareWarning, Plus, X, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/providers/ToastContext";
import { useRealtimeRefresh } from "@/components/shared/hooks/useRealtimeRefresh";

type ComplaintStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";

type Complaint = {
  id: string;
  title: string;
  body: string;
  status: ComplaintStatus;
  adminNotes: string | null;
  createdAt: string;
  hotel: { name: string; city: string };
};

type Booking = {
  id: string;
  status: string;
  hotel: { id: string; name: string; city: string };
  checkIn: string;
  checkOut: string;
};

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; cls: string; icon: React.ElementType }> = {
  OPEN:          { label: "Open — Under Review",  cls: "bg-red-50 text-red-700 border-red-200",      icon: AlertTriangle },
  INVESTIGATING: { label: "Investigating",         cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  RESOLVED:      { label: "Resolved",              cls: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  DISMISSED:     { label: "Dismissed",             cls: "bg-slate-100 text-slate-500 border-slate-200", icon: CheckCircle },
};

export default function CustomerComplaintsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ hotelId: "", bookingId: "", title: "", body: "" });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        fetch("/api/complaints"),
        fetch("/api/bookings?status=CONFIRMED&limit=100"),
      ]);
      const [cData, bData] = await Promise.all([cRes.json(), bRes.json()]);
      if (cData.success) setComplaints(cData.data ?? []);
      if (bData.success) setBookings(bData.data?.bookings ?? bData.data ?? []);
    } catch {
      toastError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useRealtimeRefresh(fetchAll);

  const selectedBooking = bookings.find(b => b.id === form.bookingId);

  const handleBookingChange = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    setForm(f => ({ ...f, bookingId, hotelId: booking?.hotel.id ?? "" }));
  };

  const submit = async () => {
    if (!form.hotelId || !form.title.trim() || !form.body.trim()) {
      toastError("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId:  form.hotelId,
          bookingId: form.bookingId || null,
          title: form.title.trim(),
          body:  form.body.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toastSuccess(data.message ?? "Complaint submitted");
        setShowForm(false);
        setForm({ hotelId: "", bookingId: "", title: "", body: "" });
        fetchAll();
      } else {
        toastError(data.error ?? "Failed to submit");
      }
    } catch {
      toastError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Complaints</h1>
            <p className="text-slate-500 mt-1 text-sm">Report issues with hotels to the NepalStay team</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700">
            <Plus className="w-4 h-4" />New Complaint
          </button>
        </div>

        {/* Submission form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Submit a Complaint</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Booking picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Select Your Booking <span className="text-red-500">*</span>
                </label>
                {bookings.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No bookings found yet.</p>
                ) : (
                  <select
                    value={form.bookingId}
                    onChange={e => handleBookingChange(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300">
                    <option value="">— Choose a booking —</option>
                    {bookings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.hotel.name}, {b.hotel.city} · Checked out: {new Date(b.checkOut).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedBooking && (
                <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  Complaining about: <span className="font-medium text-slate-700">{selectedBooking.hotel.name}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Room was not as described"
                  maxLength={120}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={submit} disabled={submitting || !form.hotelId}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 font-medium">
                  {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Submitting…</> : "Submit Complaint"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complaint list */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 h-24" />)}
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 text-center py-16">
            <MessageSquareWarning className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-600">No complaints submitted yet</p>
            <p className="text-sm text-slate-400 mt-1">If you have an issue with a hotel, use the button above to report it.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map(c => {
              const cfg = STATUS_CONFIG[c.status];
              const Icon = cfg.icon;
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-semibold text-slate-800 text-sm">{c.title}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.cls}`}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{c.hotel.name}, {c.hotel.city}</p>
                  <p className="text-sm text-slate-600 line-clamp-2">{c.body}</p>
                  {c.adminNotes && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-xs font-semibold text-blue-700 mb-0.5">Admin Response</p>
                      <p className="text-xs text-blue-600">{c.adminNotes}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
