"use client";
import { useEffect, useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import BsDateDisplay from "@/components/BsDateDisplay";
import { useToast } from "@/components/providers/ToastContext";
import { useRealtimeRefresh } from "@/components/shared/hooks/useRealtimeRefresh";

type Review = {
  id: string; overallScore: number; cleanlinessScore: number;
  staffScore: number; locationScore: number; valueScore: number;
  facilitiesScore: number; title: string | null; body: string;
  createdAt: string; isVisible: boolean;
  user: { name: string; avatar: string | null };
};

const SCORE_LABELS = [
  { key: "cleanlinessScore", label: "Cleanliness" },
  { key: "staffScore",       label: "Staff" },
  { key: "locationScore",    label: "Location" },
  { key: "valueScore",       label: "Value" },
  { key: "facilitiesScore",  label: "Facilities" },
] as const;

export default function VendorReviewsPage() {
  const { error: toastError } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [hotelName, setHotelName] = useState("");

  const fetchReviews = () => {
    setLoading(true);
    // Get vendor's hotel first, then its reviews
    fetch("/api/vendor/hotel").then(r => r.json()).then(d => {
      if (!d.success || !d.data) return;
      setHotelName(d.data.name);
      // Reviews come included with the hotel
      setReviews(d.data.reviews ?? []);
    }).catch(() => toastError("Failed to load reviews"))
    .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReviews(); }, []);
  useRealtimeRefresh(fetchReviews);

  const avg = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.overallScore, 0) / reviews.length).toFixed(1)
    : null;

  // Compute per-dimension averages
  const dimAvg = (key: typeof SCORE_LABELS[number]["key"]) =>
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r[key], 0) / reviews.length).toFixed(1)
      : "—";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Guest Reviews</h1>
          <p className="text-slate-500 mt-1 text-sm">{hotelName}</p>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-32 border border-slate-100"/>)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-600">No reviews yet</p>
            <p className="text-slate-400 text-sm mt-1">Reviews appear here after guests check out and submit feedback</p>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
              <div className="flex items-center gap-6 flex-wrap">
                {avg && (
                  <div className="text-center">
                    <p className="text-5xl font-bold text-slate-800">{avg}</p>
                    <div className="flex justify-center mt-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(avg)) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
                  </div>
                )}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-0">
                  {SCORE_LABELS.map(({ key, label }) => (
                    <div key={key} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 mb-1">{label}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${(Number(dimAvg(key)) / 5) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 w-6 flex-shrink-0">{dimAvg(key)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Review cards */}
            <div className="space-y-4">
              {reviews.filter(r => r.isVisible).map(review => (
                <div key={review.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {review.user.avatar ? (
                        <Image src={review.user.avatar} alt={review.user.name} width={40} height={40}
                          className="rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
                          {review.user.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{review.user.name}</p>
                        <BsDateDisplay date={review.createdAt} className="text-xs text-slate-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl">
                      <Star className="w-4 h-4 fill-green-500 text-green-500" />
                      <span className="font-bold text-sm">{review.overallScore.toFixed(1)}</span>
                    </div>
                  </div>
                  {review.title && <p className="font-semibold text-slate-700 mb-1">{review.title}</p>}
                  <p className="text-sm text-slate-600 leading-relaxed">{review.body}</p>

                  {/* Score pills */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {SCORE_LABELS.map(({ key, label }) => (
                      <span key={key} className="text-xs bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                        {label}: {review[key]}★
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
