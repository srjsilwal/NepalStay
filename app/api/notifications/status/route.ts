import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Signal = {
  count: number;
  latest: string | null;
};

const emptySignal = (): Signal => ({ count: 0, latest: null });
const iso = (value?: Date | null) => value?.toISOString() ?? null;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: true, data: {} });
    }

    const user = session.user as any;
    const role = user.role as string;
    const signals: Record<string, Signal> = {};

    if (role === "CUSTOMER") {
      const [bookings, complaints] = await Promise.all([
        prisma.booking.aggregate({
          where: { userId: user.id },
          _max: { updatedAt: true },
          _count: true,
        }),
        prisma.complaint.aggregate({
          where: { customerId: user.id },
          _max: { updatedAt: true },
          _count: true,
        }),
      ]);

      signals.bookings = { count: bookings._count, latest: iso(bookings._max.updatedAt) };
      signals.complaints = { count: complaints._count, latest: iso(complaints._max.updatedAt) };
    }

    if (role === "VENDOR") {
      const hotel = await prisma.hotel.findUnique({
        where: { vendorId: user.id },
        select: { id: true },
      });

      if (!hotel) {
        return NextResponse.json({ success: true, data: signals });
      }

      const [bookings, invoices, fnmis, reviews, complaints] = await Promise.all([
        prisma.booking.aggregate({
          where: { hotelId: hotel.id },
          _max: { updatedAt: true },
          _count: true,
        }),
        prisma.booking.aggregate({
          where: {
            hotelId: hotel.id,
            status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
            paymentStatus: "UNPAID",
            paidAt: null,
            invoiceNumber: null,
          },
          _max: { updatedAt: true },
          _count: true,
        }),
        prisma.booking.aggregate({
          where: {
            hotelId: hotel.id,
            fnmisReported: false,
            status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
            user: { nationality: "FOREIGN", passportNumber: { not: null } },
          },
          _max: { updatedAt: true },
          _count: true,
        }),
        prisma.review.aggregate({
          where: { hotelId: hotel.id },
          _max: { updatedAt: true },
          _count: true,
        }),
        prisma.complaint.aggregate({
          where: { hotelId: hotel.id, status: { in: ["OPEN", "INVESTIGATING"] } },
          _max: { updatedAt: true },
          _count: true,
        }),
      ]);

      signals.bookings = { count: bookings._count, latest: iso(bookings._max.updatedAt) };
      signals.invoices = { count: invoices._count, latest: iso(invoices._max.updatedAt) };
      signals.fnmis = { count: fnmis._count, latest: iso(fnmis._max.updatedAt) };
      signals.reviews = { count: reviews._count, latest: iso(reviews._max.updatedAt) };
      signals.complaints = { count: complaints._count, latest: iso(complaints._max.updatedAt) };
    }

    if (role === "ADMIN") {
      const [bookings, invoices, fnmis, reviews, complaints] = await Promise.all([
        prisma.booking.aggregate({
          _max: { updatedAt: true },
          _count: true,
        }),
        prisma.booking.aggregate({
          where: {
            status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
            paymentStatus: "UNPAID",
            paidAt: null,
            invoiceNumber: null,
          },
          _max: { updatedAt: true },
          _count: true,
        }),
        prisma.booking.aggregate({
          where: {
            fnmisReported: false,
            status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
            user: { nationality: "FOREIGN", passportNumber: { not: null } },
          },
          _max: { updatedAt: true },
          _count: true,
        }),
        prisma.review.aggregate({
          _max: { updatedAt: true },
          _count: true,
        }),
        prisma.complaint.aggregate({
          where: { status: { in: ["OPEN", "INVESTIGATING"] } },
          _max: { updatedAt: true },
          _count: true,
        }),
      ]);

      signals.bookings = { count: bookings._count, latest: iso(bookings._max.updatedAt) };
      signals.invoices = { count: invoices._count, latest: iso(invoices._max.updatedAt) };
      signals.fnmis = { count: fnmis._count, latest: iso(fnmis._max.updatedAt) };
      signals.reviews = { count: reviews._count, latest: iso(reviews._max.updatedAt) };
      signals.complaints = { count: complaints._count, latest: iso(complaints._max.updatedAt) };
    }

    return NextResponse.json({ success: true, data: signals });
  } catch (error) {
    console.error("[NOTIFICATIONS_STATUS]", error);
    return NextResponse.json({ success: false, error: "Failed to load notifications" }, { status: 500 });
  }
}
