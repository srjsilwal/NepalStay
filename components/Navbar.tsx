"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import {
  Hotel,
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  Users,
  LogOut,
  ClipboardList,
  Globe,
  FileText,
  Menu,
  X,
  Heart,
  Search,
  Building2,
  Star,
  BarChart2,
  ShieldCheck,
  TrendingUp,
  Map,
  Sparkles,
  Store,
  MessageSquareWarning,
} from "lucide-react";

const NAV_LINKS = {
  CUSTOMER: [
    { href: "/hotels", label: "Browse", icon: Search },
    { href: "/itinerary", label: "Planner", icon: Sparkles },
    { href: "/stats", label: "Statistics", icon: BarChart2 },
    { href: "/customer/bookings", label: "My Bookings", icon: CalendarCheck },
    { href: "/customer/wishlist", label: "Wishlist", icon: Heart },
    { href: "/customer/complaints", label: "Complaints", icon: MessageSquareWarning },
    { href: "/customer/profile", label: "Profile", icon: Users },
  ],
  VENDOR: [
    { href: "/vendor", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vendor/hotel", label: "My Hotel", icon: Building2 },
    { href: "/vendor/rooms", label: "Rooms", icon: BedDouble },
    { href: "/vendor/bookings", label: "Bookings", icon: CalendarCheck },
    { href: "/vendor/analytics", label: "Analytics", icon: TrendingUp },
    { href: "/vendor/invoices", label: "Invoices", icon: FileText },
    { href: "/vendor/reviews", label: "Reviews", icon: Star },
  ],
  STAFF: [
    { href: "/staff", label: "Operations", icon: ClipboardList },
    { href: "/staff/pms", label: "PMS", icon: Map },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/hotels", label: "Hotels", icon: Building2 },
    { href: "/admin/vendors", label: "Vendors", icon: Store },
    // Invoices removed from admin navbar per request — handled separately
    { href: "/admin/complaints", label: "Complaints", icon: MessageSquareWarning },
    { href: "/admin/fnmis", label: "FNMIS", icon: Globe },
    { href: "/stats", label: "Stats", icon: BarChart2 },
  ],
};

const ROLE_BADGE: Record<string, string> = {
  CUSTOMER: "bg-green-100 text-green-700",
  VENDOR: "bg-purple-100 text-purple-700",
  STAFF: "bg-blue-100 text-blue-700",
  ADMIN: "bg-amber-100 text-amber-700",
};

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = (session?.user as any)?.role ?? "CUSTOMER";
  const links = NAV_LINKS[role as keyof typeof NAV_LINKS] ?? NAV_LINKS.CUSTOMER;

  // Determine profile link based on role
  const getProfileLink = () => {
    switch (role) {
      case "VENDOR":
        return "/vendor/profile";
      case "ADMIN":
        return "/admin/profile";
      case "STAFF":
        return "/staff/profile";
      default:
        return "/customer/profile";
    }
  };

  const isActive = (href: string) =>
    href === "/hotels"
      ? pathname === href || pathname.startsWith("/hotels/")
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* ── Left group: Logo + Desktop nav ───────────────────────────── */}
        <div className="flex items-center gap-6">
          <Link
            href={session ? "/" : "/hotels"}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm">
              <Hotel className="w-4 h-4 text-white" />
            </div>
            {/* Show simplified admin branding when role is ADMIN per request */}
            <span className="font-bold text-slate-800 text-lg tracking-tight">
              {role === "ADMIN" ? (
                <span className="text-amber-500">Admin</span>
              ) : (
                <>Nepal<span className="text-amber-500">Stay</span></>
              )}
            </span>
          </Link>

          {/* Desktop nav (logged in) */}
          {session?.user ? (
            <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                    isActive(href)
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>
          ) : (
            /* Desktop nav (guest / not logged in) */
            <nav className="hidden md:flex items-center gap-0.5">
              <Link
                href="/hotels"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive("/hotels")
                    ? "bg-amber-50 text-amber-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Search className="w-4 h-4" />
                Browse Hotels
              </Link>

              <Link
                href="/stats"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive("/stats")
                    ? "bg-amber-50 text-amber-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                Statistics 
              </Link>
            </nav>
          )}
        </div>

        {/* ── Right side ───────────────────────────────────────────────── */}
  <div className="flex items-center space-x-3 md:space-x-4 relative">

          {session?.user ? (
            /* ── Logged-in right side ──────────────────────────────────── */
            <>
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="hidden sm:flex items-center space-x-3 ml-1 hover:opacity-70 transition-opacity"
                >
                  {(session.user as any).avatar ? (
                    <Image
                      src={(session.user as any).avatar}
                      alt={session.user.name ?? ""}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover border-2 border-amber-100"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
                      {session.user.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-slate-800 leading-tight">
                      {session.user.name}
                    </p>
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded inline-block ${ROLE_BADGE[role]}`}
                    >
                      {role}
                    </span>
                  </div>
                </button>

                {/* Profile dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
                    <Link
                      href={getProfileLink()}
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-t-xl border-b border-slate-100"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={() => {
                        signOut({ callbackUrl: "/hotels" });
                        setProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-b-xl"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/hotels" })}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors md:hidden"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* ── Guest right side ──────────────────────────────────────── */
            <div className="hidden sm:flex items-center space-x-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white shadow-lg">
          <nav className="px-4 py-3 space-y-1">
            {/* Links for logged-in users */}
            {session?.user &&
              links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive(href)
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}

            {/* Links for guests */}
            {!session?.user && (
              <>
                <Link
                  href="/hotels"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive("/hotels")
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Browse Hotels
                </Link>
                <Link
                  href="/stats"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive("/stats")
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  Statistics
                </Link>
              </>
            )}

            <div className="border-t border-slate-100 pt-2 mt-2">
              {session?.user ? (
                <button
                  onClick={() => signOut({ callbackUrl: "/hotels" })}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 w-full hover:bg-red-50 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              ) : (
                <div className="flex gap-2 px-3 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2 bg-amber-500 rounded-xl text-sm font-semibold text-white"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
