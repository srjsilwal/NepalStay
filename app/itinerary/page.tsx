"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, Moon, Wallet, Compass, Calendar, ChevronRight, ArrowLeft,
  Navigation, Star, Loader2, CheckSquare, Square, Sparkles, ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/providers/ToastContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Budget   = "budget" | "mid" | "luxury";
type Purpose  = "trekking" | "tourism" | "honeymoon" | "family";

type HotelSuggestion = {
  id: string; slug: string; name: string; city: string;
  starRating: number; images: string[]; minPrice: number;
  avgReview: number | null; amenities: string[];
};
type ItineraryStop = {
  city: string; nights: number; checkIn: string; checkOut: string;
  suggestedHotels: HotelSuggestion[];
  highlights: string[];
  travelFromPrevious: string | null;
  estimatedCostPerNight: number;
  estimatedStopTotal: number;
};
type ItineraryResult = {
  stops: ItineraryStop[];
  totalNights: number; totalCities: number;
  budget: Budget; purpose: Purpose;
  startDate: string; endDate: string;
  totalEstimatedCost: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES = ["Kathmandu", "Pokhara", "Chitwan", "Nagarkot", "Lumbini"] as const;

const BUDGET_OPTIONS: { value: Budget; label: string; desc: string; icon: string }[] = [
  { value: "budget",  label: "Budget",    desc: "NPR 0–3,000/night",  icon: "💰" },
  { value: "mid",     label: "Mid-Range", desc: "NPR 3,000–8,000/night", icon: "✨" },
  { value: "luxury",  label: "Luxury",    desc: "NPR 8,000+/night",   icon: "👑" },
];

const PURPOSE_OPTIONS: { value: Purpose; label: string; icon: string }[] = [
  { value: "trekking",  label: "Trekking",  icon: "🥾" },
  { value: "tourism",   label: "Tourism",   icon: "🏛️" },
  { value: "honeymoon", label: "Honeymoon", icon: "💑" },
  { value: "family",    label: "Family",    icon: "👨‍👩‍👧‍👦" },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Hotel Card ───────────────────────────────────────────────────────────────

function HotelCard({ hotel }: { hotel: HotelSuggestion }) {
  const img = hotel.images[0];
  return (
    <div className="flex-shrink-0 w-56 bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-amber-200 hover:shadow-md transition-all">
      {img ? (
        <Image src={img} alt={hotel.name} width={224} height={128} className="w-full h-32 object-cover" />
      ) : (
        <div className="w-full h-32 bg-slate-100 flex items-center justify-center">
          <Star className="w-8 h-8 text-slate-300" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{hotel.name}</p>
          {hotel.avgReview && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600 flex-shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {hotel.avgReview}
            </span>
          )}
        </div>
        <p className="text-xs text-amber-600 font-medium mb-2">
          {"★".repeat(hotel.starRating)} · NPR {hotel.minPrice.toLocaleString()}/night
        </p>
        <Link
          href={`/hotels/${hotel.slug}`}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Book this hotel <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Timeline Stop ────────────────────────────────────────────────────────────

function TimelineStop({ stop, index, isLast }: { stop: ItineraryStop; index: number; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      {/* ── Connector column ── */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-amber-200">
          {index + 1}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-amber-200 my-2 min-h-[2rem]" />}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 pb-8">
        {/* Travel info from previous city */}
        {stop.travelFromPrevious && (
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
            <Navigation className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>From previous city: <strong>{stop.travelFromPrevious}</strong></span>
          </div>
        )}

        {/* City header card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <MapPin className="w-4 h-4 text-amber-500" />
                <h3 className="text-xl font-bold text-slate-800">{stop.city}</h3>
              </div>
              <p className="text-sm text-slate-500 ml-6">
                {formatDate(stop.checkIn)} → {formatDate(stop.checkOut)} &middot;{" "}
                <span className="font-medium text-slate-700">{stop.nights} night{stop.nights !== 1 ? "s" : ""}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Estimated cost</p>
              <p className="text-lg font-bold text-amber-600">
                NPR {stop.estimatedStopTotal.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">NPR {stop.estimatedCostPerNight.toLocaleString()}/night</p>
            </div>
          </div>

          {/* Highlights */}
          {stop.highlights.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Highlights</p>
              <div className="flex flex-wrap gap-2">
                {stop.highlights.map((h) => (
                  <span key={h} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-1 font-medium">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daily Todos */}
        {(stop as any).dailyTodos?.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-25 border border-blue-100 rounded-2xl p-5 mb-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">📋 Daily Itinerary</p>
            <div className="space-y-2.5">
              {(stop as any).dailyTodos.map((todo: any, idx: number) => (
                <div key={idx} className="flex gap-3 bg-white rounded-xl p-3 border border-blue-50">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                      {todo.day}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{todo.activity}</p>
                    {todo.specialty && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-tight">✨ {todo.specialty}</p>
                    )}
                    {todo.eats && (
                      <p className="text-xs text-orange-600 mt-0.5">🍲 Try: {todo.eats}</p>
                    )}
                    <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {todo.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotel suggestions */}
        {stop.suggestedHotels.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Suggested Hotels
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {stop.suggestedHotels.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3">
            No hotels in our system for this city yet. Try browsing our full hotel list.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ItineraryPage() {
  const { error: toastError } = useToast();

  // Form state
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [totalNights, setTotalNights]       = useState(7);
  const [budget, setBudget]                 = useState<Budget>("mid");
  const [purpose, setPurpose]               = useState<Purpose>("tourism");
  const [startDate, setStartDate]           = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  // Result state
  const [step, setStep]         = useState<1 | 2>(1);
  const [result, setResult]     = useState<ItineraryResult | null>(null);
  const [loading, setLoading]   = useState(false);

  // Toggle city selection
  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  // Submit form
  const handleGenerate = async () => {
    if (selectedCities.length === 0) {
      toastError("Please select at least one city");
      return;
    }
    if (totalNights < 1 || totalNights > 60) {
      toastError("Total nights must be between 1 and 60");
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, totalNights, cities: selectedCities, budget, purpose }),
      });

       if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toastError(json.error || "Failed to generate itinerary");
      }
    } catch {
      toastError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">

        {step === 1 ? (
          /* ─────────── STEP 1: FORM ─────────── */
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 rounded-2xl mb-4">
                <Sparkles className="w-7 h-7 text-amber-500" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800">Build Your Nepal Itinerary</h1>
              <p className="text-slate-500 mt-2">Tell us your travel plans and we&apos;ll suggest the perfect route with hotels.</p>
            </div>

            <div className="space-y-6">

              {/* Cities */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  Select Cities to Visit
                  <span className="text-amber-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CITIES.map((city) => {
                    const selected = selectedCities.includes(city);
                    return (
                      <button
                        key={city}
                        onClick={() => toggleCity(city)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                          selected
                            ? "bg-amber-50 border-amber-400 text-amber-800"
                            : "border-slate-200 text-slate-600 hover:border-amber-200 hover:bg-amber-50/50"
                        }`}
                      >
                        {selected
                          ? <CheckSquare className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          : <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        }
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nights + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <Moon className="w-4 h-4 text-amber-500" />
                    Total Nights
                  </label>
                  <input
                    type="number"
                    min={1} max={60}
                    value={totalNights}
                    onChange={e => setTotalNights(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-semibold text-lg focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>

              {/* Budget */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  Budget Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {BUDGET_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setBudget(opt.value)}
                      className={`flex flex-col items-center gap-1 p-4 rounded-xl border text-center transition-all ${
                        budget === opt.value
                          ? "bg-amber-50 border-amber-400 text-amber-800"
                          : "border-slate-200 text-slate-600 hover:border-amber-200"
                      }`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className="text-xs text-slate-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Purpose */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
                  <Compass className="w-4 h-4 text-amber-500" />
                  Trip Purpose
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PURPOSE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPurpose(opt.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        purpose === opt.value
                          ? "bg-amber-50 border-amber-400 text-amber-800"
                          : "border-slate-200 text-slate-600 hover:border-amber-200"
                      }`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleGenerate}
                disabled={loading || selectedCities.length === 0}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold text-base rounded-2xl transition-colors flex items-center justify-center gap-3 shadow-md shadow-amber-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating your itinerary…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Itinerary
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ─────────── STEP 2: RESULT ─────────── */
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Edit
              </button>
            </div>

            {result && (
              <>
                {/* Summary banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
                  <h2 className="text-xl font-bold text-slate-800 mb-1">Your Itinerary</h2>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Moon className="w-4 h-4 text-amber-500" />
                      <strong>{result.totalNights} nights</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-amber-500" />
                      <strong>{result.totalCities} cities</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      {formatDate(result.startDate)} → {formatDate(result.endDate)}
                    </span>
                    <span className="ml-auto text-amber-700 font-bold">
                      Est. NPR {result.totalEstimatedCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  {result.stops.map((stop, i) => (
                    <TimelineStop
                      key={stop.city + i}
                      stop={stop}
                      index={i}
                      isLast={i === result.stops.length - 1}
                    />
                  ))}
                </div>

                {/* Footer CTA */}
                <div className="mt-4 bg-white border border-slate-100 rounded-2xl p-5 text-center">
                  <p className="text-slate-600 text-sm mb-3">
                    Happy with your itinerary? Browse all hotels to book your stays.
                  </p>
                  <Link
                    href="/hotels"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Browse All Hotels <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
