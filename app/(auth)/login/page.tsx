"use client";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Hotel, Eye, EyeOff, Loader2 } from "lucide-react";

const schema = z.object({
  email:    z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
type Form = z.infer<typeof schema>;

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password. Please try again.",
  AccessDenied:      "Your account has been disabled.",
};

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = (session.user as any).role;
      // Redirect to appropriate dashboard based on role
      switch (role) {
        case "ADMIN":
          router.push("/admin");
          break;
        case "VENDOR":
          router.push("/vendor");
          break;
        case "STAFF":
          router.push("/staff");
          break;
        default:
          router.push("/customer/profile");
      }
    }
  }, [status, session, router]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError("");
    const result = await signIn("credentials", {
      email: data.email, password: data.password, redirect: false,
    });
    if (result?.error) {
      setError(ERROR_MESSAGES[result.error] ?? "Sign in failed. Please try again.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  const inputCls = "w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl mb-4 shadow-lg">
            <Hotel className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Nepal<span className="text-amber-400">Stay</span></h1>
          <p className="text-slate-400 mt-1">Book hotels across Nepal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input {...register("email")} type="email" autoComplete="email"
                placeholder="you@example.com" className={inputCls} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input {...register("password")} type={showPw ? "text" : "password"}
                  autoComplete="current-password" placeholder="••••••••"
                  className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-amber-600 font-medium hover:underline">Create one</Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-0.5">
            <p className="font-semibold text-slate-600 mb-1">Demo credentials:</p>
            <p>Admin:    admin@nepalstay.com / admin123</p>
            <p>Vendor:   rajesh@urbanboutique.com / password123</p>
            <p>Staff:    ramesh@urbanboutique.com / password123</p>
            <p>Customer (Nepali): traveler@example.com / password123</p>
            <p>Customer (Foreign): foreign@example.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
