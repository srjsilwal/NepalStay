"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Hotel, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";

const schema = z.object({
  name:            z.string().min(2, "Name must be at least 2 characters"),
  email:           z.string().email("Invalid email"),
  phone:           z.string().optional(),
  password:        z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  role:            z.enum(["CUSTOMER", "VENDOR"]),
  nationality:     z.enum(["NEPALI", "FOREIGN"]).optional(),
  country:         z.string().optional(), // Country name for foreign nationals
  passportNumber:  z.string().optional(),
  purposeOfVisit:  z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((d) => {
  // For CUSTOMER: nationality is required
  if (d.role === "CUSTOMER" && !d.nationality) {
    return false;
  }
  // Only CUSTOMER (traveller) can be FOREIGN
  if (d.role === "VENDOR" && d.nationality === "FOREIGN") {
    return false;
  }
  // If FOREIGN, country, passport and purpose are required
  if (d.nationality === "FOREIGN") {
    return d.country && d.passportNumber && d.passportNumber.length >= 6 && d.purposeOfVisit;
  }
  return true;
}, {
  message: "Customers must specify their nationality. Hotel owners must be Nepali citizens.",
  path: ["nationality"],
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<Form>({ 
      resolver: zodResolver(schema), 
      defaultValues: { role: "CUSTOMER", nationality: undefined } 
    });

  const selectedRole = watch("role");
  const selectedNationality = watch("nationality");

  // When role changes to VENDOR, set nationality to NEPALI
  useEffect(() => {
    if (selectedRole === "VENDOR") {
      setValue("nationality", "NEPALI");
    }
  }, [selectedRole, setValue]);

  const onSubmit = async (data: Form) => {
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: data.role,
        nationality: data.nationality,
        passportNumber: data.passportNumber,
        purposeOfVisit: data.purposeOfVisit,
      }),
    });
    const json = await res.json();
    if (!json.success) { setError(json.error); return; }
    setSuccess(true);
    setTimeout(() => router.push("/login"), 3000);
  };

  const inputCls = "w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl mb-4 shadow-lg">
            <Hotel className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Nepal<span className="text-amber-400">Stay</span></h1>
          <p className="text-slate-400 mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-800">Account created!</h3>
              <p className="text-slate-500 text-sm mt-1">Redirecting to sign in…</p>
              <Link href="/login" className="mt-4 inline-block text-amber-600 text-sm font-medium hover:underline">
                Sign in now →
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-800 mb-6">Create your account</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              {/* Role selector */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {(["CUSTOMER", "VENDOR"] as const).map((r) => (
                  <label key={r}
                    className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                      selectedRole === r
                        ? "border-amber-500 bg-amber-50"
                        : "border-slate-200 hover:border-amber-300"
                    }`}>
                    <input {...register("role")} type="radio" value={r} className="sr-only" />
                    <span className="text-2xl mb-1">{r === "CUSTOMER" ? "🏨" : "🏢"}</span>
                    <span className="text-sm font-semibold text-slate-700">{r === "CUSTOMER" ? "Traveller" : "Hotel Owner"}</span>
                    <span className="text-xs text-slate-400 text-center mt-0.5">
                      {r === "CUSTOMER" ? "Book hotels" : "List your hotel"}
                    </span>
                  </label>
                ))}
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {[
                  { label: "Full Name", name: "name", type: "text", placeholder: "Your full name" },
                  { label: "Email",     name: "email", type: "email", placeholder: "you@example.com" },
                  { label: "Phone (optional)", name: "phone", type: "tel", placeholder: "+977-XXXXXXXXXX" },
                ].map(({ label, name, type, placeholder }) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                    <input {...register(name as any)} type={type} placeholder={placeholder} className={inputCls} />
                    {(errors as any)[name] && (
                      <p className="mt-1 text-xs text-red-600">{(errors as any)[name]?.message}</p>
                    )}
                  </div>
                ))}

                {/* Nationality Selection - Only for CUSTOMER (Travellers) */}
                {selectedRole === "CUSTOMER" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Your Nationality</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["NEPALI", "FOREIGN"] as const).map((nat) => (
                          <label key={nat}
                            className={`relative flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                              selectedNationality === nat
                                ? "border-amber-500 bg-amber-50"
                                : "border-slate-200 hover:border-amber-300"
                            }`}>
                            <input {...register("nationality")} type="radio" value={nat} className="sr-only" />
                            <span className="text-lg mb-1">{nat === "NEPALI" ? "🇳🇵" : "🌍"}</span>
                            <span className="text-xs font-semibold text-slate-700">{nat === "NEPALI" ? "Nepali Citizen" : "Foreign Tourist"}</span>
                          </label>
                        ))}
                      </div>
                      {errors.nationality && <p className="mt-2 text-xs text-red-600">{errors.nationality.message}</p>}
                    </div>

                    {/* Passport Number for Foreign Travellers */}
                    {selectedNationality === "FOREIGN" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Country of Residence *</label>
                          <input {...register("country")} type="text" placeholder="e.g., United States, India, Australia" className={inputCls} />
                          {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country.message}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Passport Number *</label>
                          <input {...register("passportNumber")} type="text" placeholder="e.g., AB123456" className={inputCls} />
                          {errors.passportNumber && <p className="mt-1 text-xs text-red-600">{errors.passportNumber.message}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Purpose of Visit *</label>
                          <select {...register("purposeOfVisit")} className={inputCls}>
                            <option value="">Select purpose...</option>
                            <option value="LEISURE">Leisure/Tourism</option>
                            <option value="BUSINESS">Business</option>
                            <option value="EDUCATION">Education</option>
                            <option value="MEDICAL">Medical Treatment</option>
                            <option value="TRANSIT">Transit</option>
                            <option value="OTHER">Other</option>
                          </select>
                          {errors.purposeOfVisit && <p className="mt-1 text-xs text-red-600">{errors.purposeOfVisit.message}</p>}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* For Hotel Owners - Nationality automatically set to NEPALI */}
                {selectedRole === "VENDOR" && selectedNationality === "NEPALI" && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                    ✓ Your nationality is set to Nepali as required for hotel owners
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input {...register("password")} type={showPw ? "text" : "password"}
                      placeholder="Min 8 characters" className={`${inputCls} pr-10`} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <input {...register("confirmPassword")} type="password"
                    placeholder="Repeat your password" className={inputCls} />
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Account
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link href="/login" className="text-amber-600 font-medium hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
