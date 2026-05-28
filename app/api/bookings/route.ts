import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { calculateNights } from "@/lib/booking";
import { getDynamicPrice } from "@/lib/dynamic-pricing";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

// ────────────────────────────────
// Validation schema (NO booking guest fields)
// ────────────────────────────────
const schema = z
  .object({
    hotelId: z.string(),
    roomId: z.string(),
    checkIn: z.string().datetime(),
    checkOut: z.string().datetime(),
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
    notes: z.string().nullish(),
    guestNationality: z.string().nullish(), // actual country name (e.g. "Indian")
    passportNumber: z.string().nullish(),    // required for FNMIS
    purposeOfVisit: z.string().nullish(),    // for FNMIS
  })
  .refine((d) => new Date(d.checkOut) > new Date(d.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

// ────────────────────────────────
// GET BOOKINGS
// ────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const user = session.user as any;
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const hotelId = searchParams.get("hotelId");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const page = parseInt(searchParams.get("page") ?? "1");

    const where: any = {};

    if (user.role === "CUSTOMER") {
      where.userId = user.id;
    }

    if (user.role === "VENDOR") {
      const hotel = await prisma.hotel.findUnique({
        where: { vendorId: user.id },
      });
      if (hotel) where.hotelId = hotel.id;
    }

    if (user.role === "STAFF") {
      const staffUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (staffUser?.staffHotelId) {
        where.hotelId = staffUser.staffHotelId;
      }
    }

    if (status) where.status = status;

    if (hotelId && user.role === "ADMIN") {
      where.hotelId = hotelId;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              nationality: true,
            },
          },
          hotel: { select: { id: true, name: true, slug: true, city: true } },
          room: { select: { id: true, name: true, type: true, floor: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: bookings,
      total,
    });
  } catch (error) {
    console.error("[BOOKINGS_GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}

// ────────────────────────────────
// CREATE BOOKING
// ────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Login required" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0].message,
        },
        { status: 400 },
      );
    }

    const { hotelId, roomId, checkIn, checkOut, adults, children, notes } = parsed.data;

    const userId = (session.user as any).id;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Compare at day granularity to avoid timezone / clock-time issues.
    // new Date("2025-05-19") resolves to midnight UTC; comparing it against
    // the live server clock would wrongly reject same-day bookings.
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const checkInDay = new Date(checkIn);
    checkInDay.setUTCHours(0, 0, 0, 0);

    if (checkInDay < todayStart) {
      return NextResponse.json(
        { success: false, error: "Check-in cannot be in the past" },
        { status: 400 },
      );
    }

    // ────────────────────────────────
    // Validate hotel
    // ────────────────────────────────
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, status: "APPROVED" },
    });

    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "Hotel not available" },
        { status: 404 },
      );
    }

    // ────────────────────────────────
    // Validate room
    // ────────────────────────────────
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        hotelId,
        isActive: true,
        status: "AVAILABLE",
      },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not available" },
        { status: 409 },
      );
    }

    if (adults + children > room.capacity) {
      return NextResponse.json(
        {
          success: false,
          error: `Max capacity is ${room.capacity}`,
        },
        { status: 400 },
      );
    }

    const nights = calculateNights(checkInDate, checkOutDate);
    // Apply dynamic (seasonal) pricing — same logic as client-side UI display
    const priceInfo = getDynamicPrice(room.pricePerNight, checkInDate);
    const totalPrice = priceInfo.price * nights;

    // ────────────────────────────────
    // FNMIS logic (READ FROM USER ONLY)
    // ────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nationality: true },
    });

    const isForeign = user?.nationality === "FOREIGN";
    const fnmisDeadline = isForeign ? addDays(new Date(), 1) : undefined;

    // ────────────────────────────────
    // Transaction (safe booking)
    // ────────────────────────────────
    // Note: isolationLevel "Serializable" is intentionally omitted —
    // PgBouncer (Supabase pooled connection) does not support it.
    // The count-then-create pattern inside a single transaction is sufficient.
    const booking = await prisma.$transaction(async (tx) => {
      const overlappingCount = await tx.booking.count({
        where: {
          roomId,
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
          AND: [
            { checkIn: { lt: checkOutDate } },
            { checkOut: { gt: checkInDate } },
          ],
        },
      });

      if (overlappingCount >= room.totalRooms) {
        throw new Error("CONFLICT: Room not available for selected dates");
      }

      return tx.booking.create({
        data: {
          userId,
          hotelId,
          roomId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights,
          adults,
          children,
          notes: notes ?? undefined,
          totalPrice,
          status: "PENDING",
          paymentStatus: "UNPAID",
          fnmisDeadline,
        },
        include: {
          room: { select: { name: true, type: true, floor: true } },
          hotel: { select: { name: true, city: true } },
          user: { select: { name: true, email: true } },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: booking,
        message: "Booking created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[BOOKINGS_POST]", error);

    if (error.message?.startsWith("CONFLICT:")) {
      return NextResponse.json(
        { success: false, error: error.message.replace("CONFLICT:", "").trim() },
        { status: 409 },
      );
    }

    // Prisma unique constraint (e.g. duplicate bookingId edge case)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A booking for this room already exists. Please try again." },
        { status: 409 },
      );
    }

    // Prisma record not found inside transaction
    if (error?.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Room or hotel no longer available." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create booking. Please refresh and try again.",
        detail: process.env.NODE_ENV !== "production" ? String(error) : undefined,
      },
      { status: 500 },
    );
  }
}
