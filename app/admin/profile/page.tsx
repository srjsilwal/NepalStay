"use client";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import AvatarUploader from "@/components/AvatarUploader";
import { Mail, MapPin, Phone, Shield } from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  CUSTOMER: "bg-green-100 text-green-700",
  VENDOR:   "bg-purple-100 text-purple-700",
  STAFF:    "bg-blue-100 text-blue-700",
  ADMIN:    "bg-amber-100 text-amber-700",
};

export default function AdminProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const role = user?.role ?? "ADMIN";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Profile</h1>

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
            <span className={`text-xs font-medium px-2 py-1 rounded mt-2 ${ROLE_BADGE[role]}`}>
              {role}
            </span>
          </div>

          {/* Profile info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Mail className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                <p className="text-sm font-medium text-slate-800">{user?.email}</p>
              </div>
            </div>

            {user?.phone && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Phone className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Phone</p>
                  <p className="text-sm font-medium text-slate-800">{user.phone}</p>
                </div>
              </div>
            )}

            {user?.address && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Address</p>
                  <p className="text-sm font-medium text-slate-800">{user.address}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">Account Type</p>
                <p className="text-sm font-medium text-amber-800">Administrator</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center mt-8 pt-6 border-t border-slate-100">
            To update your profile information, please contact support.
          </p>
        </div>
      </main>
    </div>
  );
}
