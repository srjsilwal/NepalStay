import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/booking";

export const dynamic = "force-dynamic";

// POST /api/vendor/invoice — issue invoice for cash payment bookings (vendor-only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "VENDOR") {
      return NextResponse.json(
        { success: false, error: "Unauthorized — vendors only" },
        { status: 403 },
      );
    }

    const vendorId = (session.user as any).id;
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId required" },
        { status: 400 },
      );
    }

    // Fetch booking and verify vendor ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hotel: { include: { vendor: true } } },
    });
    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }

    // Verify vendor owns this hotel
    if (booking.hotel.vendor.id !== vendorId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — not your booking" },
        { status: 403 },
      );
    }

    // Already has invoice — return existing
    if (booking.invoiceNumber) {
      return NextResponse.json({
        success: true,
        data: { invoiceNumber: booking.invoiceNumber },
        message: "Invoice already exists",
      });
    }

    // Only issue for confirmed/checked-in/checked-out bookings
    if (!["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(booking.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot issue invoice for a booking with status ${booking.status}`,
        },
        { status: 400 },
      );
    }

    // Defensive check: ensure booking is unpaid before issuing invoice
    if (booking.paymentStatus === "PAID" || booking.paidAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot issue invoice for a booking that is already paid",
        },
        { status: 400 },
      );
    }

    const invoiceNumber = generateInvoiceNumber(bookingId, booking.totalPrice);

    const isOnlinePayment =
      !!booking.khaltiPidx ||
      !!booking.stripeSessionId ||
      booking.paymentMethod !== "CASH";
    if (isOnlinePayment) {
      return NextResponse.json(
        {
          success: false,
          error: "Use the provider-specific invoice recovery flow for online payments",
        },
        { status: 400 },
      );
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        invoiceNumber,
        invoiceIssuedAt: new Date(),
        paymentStatus: "PAID",
        paymentMethod: booking.paymentMethod,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { invoiceNumber, bookingId },
      message: `Invoice ${invoiceNumber} issued for cash payment`,
    });
  } catch (error) {
    console.error("[VENDOR_INVOICE]", error);
    return NextResponse.json(
      { success: false, error: "Failed to issue invoice" },
      { status: 500 },
    );
  }
}
