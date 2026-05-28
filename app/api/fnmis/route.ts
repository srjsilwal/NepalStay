import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FNMIS_WINDOW_MS = 24 * 60 * 60 * 1000;

function getEffectiveFnmisDeadline(booking: { createdAt: Date; fnmisDeadline: Date | null }) {
  const createdDeadline = new Date(booking.createdAt.getTime() + FNMIS_WINDOW_MS);
  if (!booking.fnmisDeadline) return createdDeadline;

  const storedWindowMs = booking.fnmisDeadline.getTime() - booking.createdAt.getTime();

  return storedWindowMs > FNMIS_WINDOW_MS ? createdDeadline : booking.fnmisDeadline;
}

// GET /api/fnmis — list foreign guest bookings (all for admin, hotel-scoped for vendor/staff)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "STAFF", "VENDOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const user = session.user as any;
    let hotelFilter: any = {};

    if (user.role === "VENDOR") {
      const hotel = await prisma.hotel.findUnique({ where: { vendorId: user.id } });
      if (!hotel) return NextResponse.json({ success: false, error: "Hotel not found" }, { status: 404 });
      hotelFilter = { hotelId: hotel.id };
    } else if (user.role === "STAFF") {
      const staffUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!staffUser?.staffHotelId) return NextResponse.json({ success: false, error: "No hotel assigned" }, { status: 403 });
      hotelFilter = { hotelId: staffUser.staffHotelId };
    }

    const now = new Date();
    const bookings = await prisma.booking.findMany({
      where: {
        user: { nationality: "FOREIGN", passportNumber: { not: null } },
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
        ...hotelFilter,
      },
      orderBy: [{ fnmisReported: "asc" }, { fnmisDeadline: "asc" }],
      include: {
        user: {
          select: { name: true, email: true, passportNumber: true, nationality: true, purposeOfVisit: true },
        },
        hotel: { select: { name: true, city: true } },
        room:  { select: { name: true } },
      },
    });

    const enriched = bookings.map(b => {
      const fnmisDeadline = getEffectiveFnmisDeadline(b);

      return {
        ...b,
        fnmisDeadline,
        isOverdue: !b.fnmisReported && fnmisDeadline != null && fnmisDeadline < now,
        hoursLeft: fnmisDeadline
          ? Math.max(0, Math.ceil((fnmisDeadline.getTime() - now.getTime()) / 3600000))
          : null,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("[FNMIS_GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load FNMIS data" }, { status: 500 });
  }
}

// POST /api/fnmis — mark a foreign guest booking as FNMIS-reported
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "STAFF", "VENDOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ success: false, error: "bookingId required" }, { status: 400 });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, hotel: true },
    });

    if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    if (!booking.user?.passportNumber?.trim()) {
      return NextResponse.json({ success: false, error: "No passport number on record for this guest" }, { status: 400 });
    }

    const actor = session.user as any;

    if (actor.role === "VENDOR") {
      const hotel = await prisma.hotel.findUnique({ where: { vendorId: actor.id } });
      if (!hotel || hotel.id !== booking.hotelId) {
        return NextResponse.json({ success: false, error: "Not authorized to report this booking" }, { status: 403 });
      }
    } else if (actor.role === "STAFF") {
      const staffUser = await prisma.user.findUnique({ where: { id: actor.id } });
      if (!staffUser?.staffHotelId || staffUser.staffHotelId !== booking.hotelId) {
        return NextResponse.json({ success: false, error: "Not authorized to report this booking" }, { status: 403 });
      }
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        fnmisReported: true,
        fnmisReportedAt: new Date(),
        fnmisOverdue: false,
        fnmisAutoReported: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `FNMIS record marked for ${booking.user.name} (Passport: ${booking.user.passportNumber}).`,
    });
  } catch (error) {
    console.error("[FNMIS_POST]", error);
    return NextResponse.json({ success: false, error: "Failed to submit report" }, { status: 500 });
  }
}
