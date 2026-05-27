"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, FileText, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import BsDateDisplay from "@/components/BsDateDisplay";
import { useToast } from "@/components/providers/ToastContext";

type CashBooking = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  paidAt: string | null;
  user: { name: string; email: string };
  room: { name: string; type: string };
};

function RowSkeleton() {
  return (
    <tr className="border-b border-slate-50 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20" /></td>
      ))}
    </tr>
  );
}

export default function VendorInvoicesPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [bookings, setBookings] = useState<CashBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings?limit=1000");
      const data = await res.json();
      if (data.success) {
        // Filter for cash bookings without invoices
        const cashBookings = data.data.filter(
          (b: any) => !b.paidAt && ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status)
        );
        setBookings(cashBookings);
      } else {
        toastError("Failed to load bookings");
      }
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const issueInvoice = async (id: string) => {
    setWorking(id + "_inv");
    try {
      const res = await fetch("/api/vendor/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      const data = await res.json();
      if (data.success) {
        toastSuccess(`Invoice ${data.data.invoiceNumber} issued`);
        await fetchBookings();
      } else {
        toastError(data.error || "Failed to issue invoice");
      }
    } catch {
      toastError("Network error");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cash Payment Invoices</h1>
            <p className="text-slate-500 mt-1 text-sm">Issue invoices for cash-paid bookings</p>
          </div>
          <button
            onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {bookings.length === 0 && !loading && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-slate-600">All invoices processed!</p>
            <p className="text-sm text-slate-400 mt-1">No pending cash payment invoices</p>
          </div>
        )}

        {bookings.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Guest", "Room", "Check-in", "Check-out", "Amount", "Action"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading
                    ? [1, 2, 3, 4, 5].map(i => <RowSkeleton key={i} />)
                    : bookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{b.user?.name}</p>
                          <p className="text-xs text-slate-400">{b.user?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {b.room?.name}<br /><span className="text-slate-400">{b.room?.type}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs"><BsDateDisplay date={b.checkIn} /></td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs"><BsDateDisplay date={b.checkOut} /></td>
                        <td className="px-4 py-3 font-semibold text-slate-800">NPR {b.totalPrice?.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => issueInvoice(b.id)}
                            disabled={working === b.id + "_inv"}
                            className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50"
                          >
                            {working === b.id + "_inv" ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <FileText className="w-3 h-3" />
                            )}
                            {working === b.id + "_inv" ? "Issuing..." : "Issue"}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
