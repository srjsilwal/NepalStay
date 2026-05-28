"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquareWarning, ChevronDown, ChevronUp, Building2,
  AlertTriangle, CheckCircle, Clock, Loader2, RefreshCw, User,
} from "lucide-react";
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
  bookingId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  customer: { name: string; email: string };
  hotel: { name: string; city: string };
};

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; cls: string; icon: React.ElementType }> = {
  OPEN:          { label: "Open",          cls: "bg-red-50 text-red-700 border-red-200",    icon: AlertTriangle },
  INVESTIGATING: { label: "Investigating", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  RESOLVED:      { label: "Resolved",      cls: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  DISMISSED:     { label: "Dismissed",     cls: "bg-slate-100 text-slate-500 border-slate-200", icon: CheckCircle },
};

export default function AdminComplaintsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"ALL" | ComplaintStatus>("ALL");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [saving, setSaving]         = useState<string | null>(null);
  const [notes, setNotes]           = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = filter === "ALL" ? "/api/complaints" : `/api/complaints?status=${filter}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.success) setComplaints(data.data ?? []);
      else toastError(data.error ?? "Failed to load complaints");
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);
  useRealtimeRefresh(fetchData);

  const updateComplaint = async (id: string, status: ComplaintStatus) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes[id] }),
      });
      const data = await res.json();
      if (data.success) {
        toastSuccess("Complaint updated");
        fetchData();
        setExpanded(null);
      } else {
        toastError(data.error ?? "Failed to update");
      }
    } catch {
      toastError("Network error");
    } finally {
      setSaving(null);
    }
  };

  const suspendHotel = async (complaintId: string, hotelName: string) => {
    if (!confirm(`Suspend "${hotelName}"? This will remove them from the platform.`)) return;
    setSaving(complaintId + "-suspend");
    try {
      // Find the complaint to get hotelId - we'll need to get it from the complaints list
      // Navigate to hotels page for now, or use a direct API call
      const res = await fetch(`/api/complaints/${complaintId}`);
      const data = await res.json();
      if (!data.success) { toastError("Cannot find hotel info"); return; }

      const hotelId = data.data.hotel?.id;
      if (!hotelId) { toastError("Hotel ID not found"); return; }

      const suspendRes = await fetch(`/api/admin/hotels/${hotelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUSPENDED" }),
      });
      const suspendData = await suspendRes.json();
      if (suspendData.success) {
        toastSuccess(`${hotelName} has been suspended`);
        await updateComplaint(complaintId, "RESOLVED");
      } else {
        toastError(suspendData.error ?? "Failed to suspend hotel");
      }
    } catch {
      toastError("Network error");
    } finally {
      setSaving(null);
    }
  };

  const counts: Record<string, number> = {
    ALL: complaints.length,
  };

  const filtered = filter === "ALL" ? complaints : complaints.filter(c => c.status === filter);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Customer Complaints</h1>
            <p className="text-slate-500 mt-1 text-sm">Review and resolve disputes between customers and hotels</p>
          </div>
          <button onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(["ALL", "OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"] as const).map(s => {
            const cfg = s !== "ALL" ? STATUS_CONFIG[s] : null;
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                  filter === s
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}>
                {s === "ALL" ? "All" : cfg?.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 h-24" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 text-center py-16">
            <MessageSquareWarning className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-600">No complaints in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const cfg = STATUS_CONFIG[c.status];
              const Icon = cfg.icon;
              const isExpanded = expanded === c.id;
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  {/* Header row */}
                  <button
                    onClick={() => {
                      setExpanded(isExpanded ? null : c.id);
                      if (!notes[c.id]) setNotes(n => ({ ...n, [c.id]: c.adminNotes ?? "" }));
                    }}
                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                            <Icon className="w-3 h-3" />{cfg.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">{c.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />{c.customer.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{c.hotel.name}, {c.hotel.city}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Customer Complaint</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{c.body}</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Admin Notes (Internal)</label>
                        <textarea
                          value={notes[c.id] ?? ""}
                          onChange={e => setNotes(n => ({ ...n, [c.id]: e.target.value }))}
                          placeholder="Add investigation notes, warnings issued, actions taken..."
                          rows={3}
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {c.status !== "INVESTIGATING" && (
                          <button
                            onClick={() => updateComplaint(c.id, "INVESTIGATING")}
                            disabled={!!saving}
                            className="text-xs px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50 font-medium">
                            {saving === c.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Mark Investigating"}
                          </button>
                        )}
                        {c.status !== "RESOLVED" && (
                          <button
                            onClick={() => updateComplaint(c.id, "RESOLVED")}
                            disabled={!!saving}
                            className="text-xs px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 font-medium">
                            {saving === c.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Mark Resolved"}
                          </button>
                        )}
                        {c.status !== "DISMISSED" && (
                          <button
                            onClick={() => updateComplaint(c.id, "DISMISSED")}
                            disabled={!!saving}
                            className="text-xs px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-medium">
                            Dismiss
                          </button>
                        )}
                        <button
                          onClick={() => suspendHotel(c.id, c.hotel.name)}
                          disabled={saving === c.id + "-suspend"}
                          className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium ml-auto">
                          {saving === c.id + "-suspend"
                            ? <Loader2 className="w-3 h-3 animate-spin inline" />
                            : "Suspend Hotel"
                          }
                        </button>
                      </div>
                    </div>
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
