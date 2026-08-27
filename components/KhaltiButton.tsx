"use client";
import { useState, useEffect } from "react";
import { Loader2, CreditCard, CheckCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/components/providers/ToastContext";

type Step = "idle" | "initiated" | "verifying" | "done" | "error";

interface Props {
  bookingId: string;
  amount: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SK_PIDX = "khalti_pidx";
const SK_URL  = "khalti_payment_url";
const SK_BID  = "khalti_bookingId";

export default function KhaltiButton({ bookingId, amount, onSuccess, onCancel }: Props) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [step, setStep]             = useState<Step>("idle");
  const [pidx, setPidx]             = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [errMsg, setErrMsg]         = useState("");

  // Restore in-progress session after page refresh
  useEffect(() => {
    const savedPidx = sessionStorage.getItem(SK_PIDX);
    const savedUrl  = sessionStorage.getItem(SK_URL);
    const savedBid  = sessionStorage.getItem(SK_BID);
    if (savedPidx && savedUrl && savedBid === bookingId) {
      setPidx(savedPidx);
      setPaymentUrl(savedUrl);
      setStep("initiated");
    }
  }, [bookingId]);

  const handleInitiate = async () => {
    // Open blank window IMMEDIATELY on user click (synchronous = never blocked by popup blocker)
    // Then redirect it to Khalti URL after fetch — this is the standard pattern
    const khaltiWin = window.open("", "_blank");

    setStep("verifying");
    setErrMsg("");
    try {
      const res  = await fetch("/api/payment/khalti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!data.success) {
        khaltiWin?.close();
        setErrMsg(data.error || "Payment initiation failed");
        setStep("error");
        return;
      }
      const url = data.data.payment_url;
      const pid = data.data.pidx;

      // Redirect the already-opened blank window to Khalti
      if (khaltiWin) {
        khaltiWin.location.href = url;
      }

      // Persist so re-open works after accidental page refresh
      sessionStorage.setItem(SK_PIDX, pid);
      sessionStorage.setItem(SK_URL, url);
      sessionStorage.setItem(SK_BID, bookingId);

      setPidx(pid);
      setPaymentUrl(url);
      setStep("initiated");
    } catch {
      khaltiWin?.close();
      setErrMsg("Network error. Please check your connection.");
      setStep("error");
    }
  };

  const handleVerify = async () => {
    if (!pidx) return;
    setStep("verifying");
    try {
      const res  = await fetch("/api/payment/khalti/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pidx, bookingId }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.removeItem(SK_PIDX);
        sessionStorage.removeItem(SK_URL);
        sessionStorage.removeItem(SK_BID);
        setStep("done");
        toastSuccess(`Payment confirmed! Invoice ${data.data.invoiceNumber}`);
        onSuccess?.();
      } else {
        setErrMsg(data.error || "Verification failed. If you paid, please wait and try again.");
        setStep("initiated");
        toastError(data.error || "Payment verification failed");
      }
    } catch {
      setErrMsg("Network error during verification.");
      setStep("initiated");
    }
  };

  const handleCancelBooking = async () => {
    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
    } catch {}
    sessionStorage.removeItem(SK_PIDX);
    sessionStorage.removeItem(SK_URL);
    sessionStorage.removeItem(SK_BID);
    setStep("idle");
    setErrMsg("");
    onCancel?.();
  };

  if (step === "done") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium justify-center">
        <CheckCircle className="w-4 h-4" />Payment Confirmed
      </div>
    );
  }
  if (step === "verifying") {
    return (
      <div className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#5C2D8C] text-white font-semibold rounded-xl text-sm opacity-80">
        <Loader2 className="w-4 h-4 animate-spin" />Processing…
      </div>
    );
  }
  if (step === "initiated") {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <p className="font-semibold mb-1">Complete your payment in the Khalti tab</p>
          <p className="text-xs text-blue-600">Once done, click below to confirm your booking.</p>
        </div>
        <button onClick={handleVerify}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-semibold rounded-xl transition-all text-sm">
          <CheckCircle className="w-4 h-4" />I&apos;ve Completed Payment
        </button>
        {/* <a> tag — direct link, never blocked by popup blocker */}
        {paymentUrl && (
          <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50">
            <ExternalLink className="w-3 h-3" />Re-open Khalti tab
          </a>
        )}
        {errMsg && <p className="text-xs text-red-600 text-center">{errMsg}</p>}
      </div>
    );
  }
  if (step === "error") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-red-600 text-center">{errMsg}</p>
        <div className="flex gap-2">
          <button onClick={() => { setStep("idle"); setErrMsg(""); }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5" />Try Again
          </button>
          <button onClick={handleCancelBooking}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50">
            Cancel Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button onClick={handleInitiate}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#5C2D8C] hover:bg-[#4A2470] active:scale-95 text-white font-semibold rounded-xl transition-all text-sm">
        <CreditCard className="w-4 h-4" />
        Pay NPR {amount.toLocaleString()} via Khalti
        <ExternalLink className="w-3 h-3 opacity-70" />
      </button>
      <p className="text-xs text-slate-400 text-center">Secured by Khalti · Opens in a new tab</p>
    </div>
  );
}
