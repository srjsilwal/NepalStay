"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CalendarCheck, Heart } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import AvatarUploader from "@/components/AvatarUploader";
import { useToast } from "@/components/providers/ToastContext";
import LoyaltyCard from "@/components/features/LoyaltyCard";

const schema = z.object({
  name:    z.string().min(2, "Name must be at least 2 characters"),
  phone:   z.string().nullish(),
  address: z.string().nullish(),
});
type Form = z.infer<typeof schema>;

const ROLE_BADGE: Record<string, string> = {
  CUSTOMER: "bg-green-100 text-green-700",
  VENDOR:   "bg-purple-100 text-purple-700",
  STAFF:    "bg-blue-100 text-blue-700",
  ADMIN:    "bg-amber-100 text-amber-700",
};

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { success: toastSuccess, error: toastError } = useToast();
  const user = session?.user as any;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", address: "" } });

  // Fetch full profile from API — phone/address are NOT stored in the JWT,
  // so we must fetch them separately to populate the form correctly.
  const fetchProfile = useCallback(() => {
    fetch("/api/user/profile")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          reset({
            name:    d.data.name    ?? "",
            phone:   d.data.phone   ?? "",
            address: d.data.address ?? "",
          });
        }
      })
      .catch((err) => {
        // Fallback: reset with defaults from session and show error
        reset({
          name:    session?.user?.name ?? "",
          phone:   "",
          address: "",
        });
        toastError("Failed to load profile. Please refresh.");
      });
  }, [reset, session?.user?.name, toastError]);

  useEffect(() => {
    if (session) fetchProfile();
  }, [session, fetchProfile]);

  const onSubmit = async (data: Form) => {
    const res  = await fetch("/api/user/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) { toastError(json.error); return; }
    // Update session with new data and trigger revalidation
    await update({ 
      name: data.name,
      phone: data.phone,
      address: data.address,
    });
    toastSuccess("Profile updated successfully");
  };

  const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">My Profile</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {/* Avatar section */}
          <div className="flex flex-col items-center mb-8 pb-6 border-b border-slate-100">
            <AvatarUploader
              currentAvatar={user?.avatar}
              name={user?.name}
              size="lg"
            />
            <p className="mt-3 text-lg font-semibold text-slate-800">
              {user?.name}
            </p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            {user?.role && (
              <span
                className={`mt-2 px-3 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[user.role] ?? ""}`}
              >
                {user.role}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {[
              {
                label: "Full Name",
                name: "name",
                type: "text",
                placeholder: "Your full name",
              },
              {
                label: "Phone Number",
                name: "phone",
                type: "tel",
                placeholder: "+977-XXXXXXXXXX",
              },
              {
                label: "Address",
                name: "address",
                type: "text",
                placeholder: "Your address",
              },
            ].map(({ label, name, type, placeholder }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {label}
                </label>
                <input
                  {...register(name as any)}
                  type={type}
                  placeholder={placeholder}
                  className={inputCls}
                />
                {(errors as any)[name] && (
                  <p className="mt-1 text-xs text-red-600">
                    {(errors as any)[name]?.message}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-400">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nationality
              </label>
              <input
                type="text"
                value={
                  user?.nationality === "NEPALI" 
                    ? "Nepali Citizen" 
                    : user?.country 
                      ? `${user.country} (Foreign Tourist)`
                      : "AMERICAN"
                }
                disabled
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-600"
              />
              <p className="mt-1 text-xs text-slate-400">
                Nationality is set during registration
              </p>
            </div>

            {/* Passport Number - Only show for Foreign tourists */}
            {user?.nationality === "FOREIGN" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Passport Number
                </label>
                <input
                  type="text"
                  value={user?.passportNumber ?? ""}
                  disabled
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-600"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Passport information is set during registration
                </p>
              </div>
            )}

            {/* Purpose of Visit - Only show for Foreign tourists */}
            {user?.nationality === "FOREIGN" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Purpose of Visit
                </label>
                <input
                  type="text"
                  value={user?.purposeOfVisit ?? "Tourism"}
                  disabled
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-600"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Purpose is set during registration
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </form>
        </div>

        {/* Quick links */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href="/customer/bookings"
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group"
          >
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                My Bookings
              </p>
              <p className="text-xs text-slate-400">View reservations</p>
            </div>
          </Link>
          <Link
            href="/customer/wishlist"
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group"
          >
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Wishlist</p>
              <p className="text-xs text-slate-400">Saved hotels</p>
            </div>
          </Link>
        </div>
        {/* Loyalty Points Card */}
        <div className="mt-4">
          <LoyaltyCard />
        </div>
      </main>
    </div>
  );
}
