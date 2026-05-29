import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCancellationPolicy, generateCreditNoteNumber } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        user:  { select: { name: true, email: true, phone: true, avatar: true } },
        hotel: { select: { id: true, name: true, slug: true, city: true, address: true, images: true, contactPhone: true, contactEmail: true, vendorId: true } },
        room:  { select: { name: true, type: true, floor: true, pricePerNight: true } },
      },
    });

    if (!booking) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const user = session.user as any;
    
    // Customers can only view their own bookings
    if (user.role === "CUSTOMER" && booking.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Vendors can only view bookings for their own hotel
    if (user.role === "VENDOR" && booking.hotel.vendorId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Staff can only view bookings for their assigned hotel
    if (user.role === "STAFF") {
      const staffUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { staffHotelId: true, isActive: true },
      });
      if (!staffUser?.isActive || staffUser.staffHotelId !== booking.hotelId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    console.error("[BOOKING_GET]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { status } = await req.json();
    const user       = session.user as any;

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { room: true, hotel: true, user: true },
    });
    if (!booking) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // Admin cannot manage booking status — this is handled by hotel staff/vendors only
    if (user.role === "ADMIN") {
      return NextResponse.json({ success: false, error: "Admins cannot manage booking status. Contact the hotel directly." }, { status: 403 });
    }

    // Vendor: can only update bookings that belong to their hotel
    if (user.role === "VENDOR") {
      if (booking.hotel.vendorId !== user.id) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    // Staff: can only update bookings for their assigned hotel
    if (user.role === "STAFF") {
      const staffUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { staffHotelId: true, isActive: true },
      });
      if (!staffUser?.staffHotelId || staffUser.staffHotelId !== booking.hotelId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      // Verify staff account is enabled
      if (!staffUser.isActive) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      // Verify hotel is enabled
      const hotel = await prisma.hotel.findUnique({
        where: { id: booking.hotelId },
        select: { status: true },
      });
      if (!hotel || hotel.status !== "APPROVED") {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    // Customers can only cancel their own unpaid bookings
    if (user.role === "CUSTOMER") {
      if (booking.userId !== user.id) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      if (status !== "CANCELLED") {
        return NextResponse.json({ success: false, error: "Customers can only cancel bookings" }, { status: 403 });
      }
      if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
        return NextResponse.json({ success: false, error: "Cannot cancel this booking" }, { status: 400 });
      }
      // Paid booking must go through /refund route
      if (booking.paidAt && booking.invoiceNumber) {
        return NextResponse.json({
          success: false,
          error: "This booking was paid. Use the Cancel & Refund button to process your refund.",
          redirectTo: `/api/bookings/${params.id}/refund`,
        }, { status: 400 });
      }
      // Unpaid — cancel directly
      await prisma.booking.update({
        where: { id: params.id },
        data:  { status: "CANCELLED", refundStatus: "NOT_ELIGIBLE" },
      });
      return NextResponse.json({ success: true, data: { id: params.id, status: "CANCELLED" } });
    }

    // Staff/Vendor/Admin status transitions
    const allowed: Record<string, string[]> = {
      PENDING:     ["CONFIRMED", "CANCELLED"],
      CONFIRMED:   ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
      CHECKED_IN:  ["CHECKED_OUT"],
      CHECKED_OUT: [],
    };
    if (!allowed[booking.status]?.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Cannot transition from ${booking.status} to ${status}` },
        { status: 400 }
      );
    }

    const updateData: any = { status };

    // When vendor confirms a PENDING booking, mark payment as PAID
    // (This handles the "pay at hotel" flow where vendor receives payment in person)
    if (booking.status === "PENDING" && status === "CONFIRMED" && booking.paymentStatus === "UNPAID") {
      updateData.paymentStatus = "PAID";
      updateData.paidAt = new Date();
      // Generate invoice for cash booking if not already done
      if (!booking.invoiceNumber) {
        const { generateInvoiceNumber } = await import("@/lib/booking");
        updateData.invoiceNumber = generateInvoiceNumber(booking.id, booking.totalPrice);
        updateData.invoiceIssuedAt = new Date();
      }
    }

    // When checking out, room goes to CLEANING status for housekeeping
    if (status === "CHECKED_OUT") {
      await prisma.room.update({ 
        where: { id: booking.roomId }, 
        data: { status: "CLEANING", updatedAt: new Date() }
      });
    }
    // When checking in, mark room as occupied
    if (status === "CHECKED_IN") {
      await prisma.room.update({ 
        where: { id: booking.roomId }, 
        data: { status: "OCCUPIED", updatedAt: new Date() }
      });
    }

    const updated = await prisma.booking.update({ where: { id: params.id }, data: updateData });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[BOOKING_PATCH]", error);
    return NextResponse.json({ success: false, error: "Failed to update booking" }, { status: 500 });
  }
}
