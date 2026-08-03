"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">🏔️</div>
        <h1 className="text-2xl font-bold text-white mb-3">You&apos;re Offline</h1>
        <p className="text-slate-400 mb-6">
          No internet connection detected. Your previously viewed hotels and
          bookings are available in cache.
        </p>
        <div className="space-y-3">
          <Link
            href="/customer/bookings"
            className="block px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
          >
            View My Bookings (Cached)
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="block w-full px-6 py-3 border border-slate-600 text-slate-300 hover:bg-slate-800 font-medium rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
        <p className="text-slate-500 text-xs mt-6">
          NepalStay works offline for trekking areas with poor signal
        </p>
      </div>
    </div>
  );
}
