"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  X, Calendar, Users, BedDouble, Loader2, CheckCircle,
  AlertCircle, Globe, CreditCard,
} from "lucide-react";
import { addDays, format, differenceInCalendarDays } from "date-fns";
import { adToBS, formatBS } from "@/lib/nepali-date";
import { useCalendar } from "@/components/providers/CalendarContext";
import { useToast } from "@/components/providers/ToastContext";
import NepaliDatePicker from "@/components/NepaliDatePicker";
import KhaltiButton from "@/components/KhaltiButton";
import StripeButton from "./StripeButton";
import { getDynamicPrice } from "@/lib/dynamic-pricing";



type Room = {
  id: string; name: string; type: string; pricePerNight: number;
  floor: number; capacity: number; amenities: string[];
};

interface Props {
  room: Room;
  hotel: { id: string; name: string; slug: string; policies?: any };
  onClose: () => void;
  onSuccess: () => void;
}

const PURPOSE_OPTIONS = ["Tourism", "Business", "Trekking", "Medical", "Education", "Transit"];

export default function BookingModal({ room, hotel, onClose, onSuccess }: Props) {
   const { data: session } = useSession();
  const router = useRouter();
  const { isBS, toggleCalendar } = useCalendar();
  const { error: toastError } = useToast();

  // Session-derived defaults
  const userNationality =
    (session?.user as any)?.nationality || "NEPALI";

  const userPassport =
    (session?.user as any)?.passportNumber || "";

  const userPurpose =
    (session?.user as any)?.purposeOfVisit || "Tourism";

  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const [notes, setNotes] = useState("");

  const [nationality, setNationality] =
    useState(userNationality);

  // Nationality (NEPALI / FOREIGN) is fixed at registration — read from profile only.

  const [passportNumber, setPassportNumber] =
    useState(userPassport);

  const [purposeOfVisit, setPurposeOfVisit] =
    useState(userPurpose);

  // ✅ Sync state when session resolves later
  // Avoid overwriting user edits
  useEffect(() => {
    if (!session?.user) return;

    const sessionNationality =
      (session.user as any)?.nationality || "NEPALI";

    const sessionPassport =
      (session.user as any)?.passportNumber || "";

    const sessionPurpose =
      (session.user as any)?.purposeOfVisit || "Tourism";

    setNationality((prev: string) => {
      if (!prev || prev === "NEPALI") {
        return sessionNationality;
      }
      return prev;
    });

    setPassportNumber((prev: string) => {
      if (!prev || prev === "") {
        return sessionPassport;
      }
      return prev;
    });

    setPurposeOfVisit((prev: string) => {
      if (!prev || prev === "Tourism") {
        return sessionPurpose;
      }
      return prev;
    });
  }, [session]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nights =
    checkInDate && checkOutDate
      ? differenceInCalendarDays(checkOutDate, checkInDate)
      : 0;

  const totalPrice =
    nights > 0 ? nights * room.pricePerNight : 0;

  // Dynamic (seasonal) price — matches server-side calculation
  const finalPrice = (() => {
    if (!checkInDate || nights <= 0) return totalPrice;
    const pi = getDynamicPrice(room.pricePerNight, checkInDate);
    return pi.price * nights;
  })();

  const isForeigner = nationality === "FOREIGN";

  const toInputVal = (d: Date | null) =>
    d ? format(d, "yyyy-MM-dd") : "";

  const handleSubmit = async () => {
    setError("");
    if (!session) { router.push("/login"); return; }
    if (!checkInDate || !checkOutDate) { setError("Please select check-in and check-out dates."); return; }
    if (nights <= 0) { setError("Check-out must be after check-in."); return; }
    if (adults + children > room.capacity) {
      setError(`Max capacity is ${room.capacity} guests.`); return;
    }
    if (isForeigner && !passportNumber.trim()) {
      setError("Passport number is required for foreign guests (FNMIS)."); return;
    }

    setLoading(true);
    const res  = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: hotel.id, roomId: room.id,
        checkIn:  checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        adults, children, notes,
        // guestNationality mirrors the user's profile nationality
        guestNationality: isForeigner ? "Foreign" : "Nepali",
        passportNumber:   passportNumber || null,
        purposeOfVisit,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) { setError(data.error); toastError(data.error); return; }
    setBookingId(data.data.id);
    setSuccess(true);
  };

  const handleClose = async () => {
    // If a draft booking was created in this modal but user closes without completing payment or selecting cash-on-arrival
    if (success && bookingId) {
      try {
        await fetch(`/api/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        });
      } catch (err) {
        console.error("Failed to cancel abandoned draft booking", err);
      }
    }
    onClose();
  };

  const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-6 border-b border-slate-100">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0 bg-amber-50 rounded-xl flex items-center justify-center">
              <BedDouble className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800">{room.name}</p>
              <p className="truncate text-xs text-slate-500">
                {hotel.name} · {room.type} · Floor {room.floor}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleCalendar}
              className="group inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold text-slate-500 shadow-sm transition-colors hover:border-amber-300"
              title="Switch AD/BS calendar"
            >
              <span
                className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 transition-colors ${
                  !isBS ? "bg-white text-amber-700 shadow-sm" : "text-slate-400 group-hover:text-slate-600"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>AD</span>
                <span className="hidden text-[10px] font-medium text-slate-400 sm:inline">Gregorian</span>
              </span>
              <span
                className={`inline-flex h-7 items-center rounded-full px-2.5 transition-colors ${
                  isBS ? "bg-white text-amber-700 shadow-sm" : "text-slate-400 group-hover:text-slate-600"
                }`}
              >
                BS
              </span>
            </button>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {success ? (
            <div className="text-center py-4 space-y-4">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Booking Submitted!
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Your reservation is pending confirmation.
                </p>
              </div>
                <div className="border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-600 mb-3 font-medium">
                  Pay now to confirm instantly:
                </p>
                {/* Nepali guests → Khalti */}
                {nationality === "NEPALI" && (
                  <KhaltiButton
                    bookingId={bookingId}
                    amount={finalPrice}
                    onSuccess={onSuccess}
                    onCancel={onClose}
                  />
                )}

                {/* Foreign guests → Stripe card payment */}
                {nationality === "FOREIGN" && (
                  <StripeButton bookingId={bookingId} amount={finalPrice} />
                )}

                {/* Cash on arrival — available to everyone */}
                <button
                  onClick={onSuccess}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Pay later at hotel (cash on arrival) →
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Dates */}
              {isBS ? (
                <div className="space-y-4">
                  <NepaliDatePicker
                    label="Check-in (BS)"
                    required
                    value={checkInDate}
                    minDate={today}
                    onChange={(d) => {
                      setCheckInDate(d);
                      if (checkOutDate && d >= checkOutDate)
                        setCheckOutDate(null);
                    }}
                  />
                  <NepaliDatePicker
                    label="Check-out (BS)"
                    required
                    value={checkOutDate}
                    minDate={
                      checkInDate ? addDays(checkInDate, 1) : addDays(today, 1)
                    }
                    onChange={setCheckOutDate}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Check-in
                      </label>
                      <input
                        type="date"
                        min={format(today, "yyyy-MM-dd")}
                        value={toInputVal(checkInDate)}
                        onChange={(e) => {
                          const d = e.target.value
                            ? new Date(e.target.value)
                            : null;
                          setCheckInDate(d);
                          if (checkOutDate && d && d >= checkOutDate)
                            setCheckOutDate(null);
                        }}
                        className={inputCls}
                      />
                      {checkInDate && (
                        <p className="text-xs text-slate-400 mt-1">
                          BS: {formatBS(adToBS(checkInDate))}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Check-out
                      </label>
                      <input
                        type="date"
                        min={
                          checkInDate
                            ? format(addDays(checkInDate, 1), "yyyy-MM-dd")
                            : format(addDays(today, 1), "yyyy-MM-dd")
                        }
                        value={toInputVal(checkOutDate)}
                        onChange={(e) =>
                          setCheckOutDate(
                            e.target.value ? new Date(e.target.value) : null,
                          )
                        }
                        className={inputCls}
                      />
                      {checkOutDate && (
                        <p className="text-xs text-slate-400 mt-1">
                          BS: {formatBS(adToBS(checkOutDate))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Guests */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    <Users className="w-3 h-3 inline mr-1" />
                    Adults
                  </label>
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className={inputCls}
                  >
                    {Array.from({ length: room.capacity }, (_, i) => i + 1).map(
                      (n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Children
                  </label>
                  <select
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className={inputCls}
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>



              {/* FNMIS */}
              {isForeigner && (
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold uppercase tracking-wide">
                    <Globe className="w-3.5 h-3.5" />
                    Foreign Guest — FNMIS Required
                  </div>
                  <p className="text-xs text-blue-600">
                    Nepal law requires hotels to report foreign guest details to
                    Tourist Police within 24 hours.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1.5">
                      Passport / Citizenship Number *
                    </label>
                    <input
                      type="text"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      placeholder="e.g. A1234567"
                      className="w-full border border-blue-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1.5">
                      Purpose of Visit
                    </label>
                    <select
                      value={purposeOfVisit}
                      onChange={(e) => setPurposeOfVisit(e.target.value)}
                      className="w-full border border-blue-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {PURPOSE_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Special requests */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Special Requests (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Early check-in, extra pillow, ground floor…"
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Price summary */}
              {nights > 0 &&
                (() => {
                  const priceInfo = checkInDate
                    ? getDynamicPrice(room.pricePerNight, checkInDate)
                    : null;
                  const finalPrice = priceInfo
                    ? priceInfo.price * nights
                    : totalPrice;
                  const isSurge = priceInfo?.isSurge;
                  const isDiscount = priceInfo?.isDiscount;

                  return (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 space-y-1.5">
                      {/* Base price */}
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>
                          NPR {room.pricePerNight.toLocaleString()} × {nights}{" "}
                          night{nights > 1 ? "s" : ""}
                        </span>
                        <span>
                          NPR {(room.pricePerNight * nights).toLocaleString()}
                        </span>
                      </div>

                      {/* Season adjustment */}
                      {priceInfo &&
                        (priceInfo.isSurge || priceInfo.isDiscount) && (
                          <div className="flex justify-between text-sm">
                            <span
                              className={
                                isSurge ? "text-orange-600" : "text-green-600"
                              }
                            >
                              {isSurge ? "🔥" : "💚"}{" "}
                              {priceInfo.seasonInfo.label}
                            </span>
                            <span
                              className={
                                isSurge
                                  ? "text-orange-600 font-medium"
                                  : "text-green-600 font-medium"
                              }
                            >
                              {isSurge ? "+" : ""}
                              {Math.round(
                                (priceInfo.seasonInfo.multiplier - 1) * 100,
                              )}
                              %
                            </span>
                          </div>
                        )}

                      {/* Total */}
                      <div className="border-t border-amber-200 pt-1.5 flex justify-between font-bold text-slate-800">
                        <span>Total</span>
                        <span>NPR {finalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {session ? "Reserve Room" : "Sign in to Book"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
