import prisma from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import { differenceInCalendarDays, startOfDay } from "date-fns";

/**
 * Booking Conflict Detection Algorithm
 *
 * Two bookings overlap when:
 *   requestedCheckIn  < existingCheckOut
 *   AND
 *   requestedCheckOut > existingCheckIn
 *
 * Wrapped in a SERIALIZABLE transaction in the booking route to prevent
 * race conditions under concurrent requests.
 */
export async function checkBookingConflict(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const conflict = await prisma.booking.findFirst({
    where: {
      roomId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      AND: [
        { checkIn:  { lt: checkOut } },
        { checkOut: { gt: checkIn } },
      ],
      ...(excludeBookingId && { id: { not: excludeBookingId } }),
    },
  });
  return !!conflict;
}

export function calculateNights(checkIn: Date, checkOut: Date): number {
  return Math.max(1, differenceInCalendarDays(checkOut, checkIn));
}

export function calculateTotalPrice(
  pricePerNight: number,
  checkIn: Date,
  checkOut: Date
): number {
  return calculateNights(checkIn, checkOut) * pricePerNight;
}

/**
 * Cancellation policy:
 *   > 7 days before check-in  → 100% refund
 *   3–7 days                  → 50% refund
 *   < 3 days                  → 0% refund
 */
export function getCancellationPolicy(checkIn: Date): {
  percent: number;
  description: string;
  daysToCheckIn: number;
} {
  const today = new Date(Date.now());
  const days = differenceInCalendarDays(startOfDay(checkIn), startOfDay(today));
  if (days > 7)  return { percent: 100, daysToCheckIn: days, description: "Full refund — cancelled more than 7 days before check-in" };
  if (days >= 3) return { percent: 50,  daysToCheckIn: days, description: "50% refund — cancelled 3–7 days before check-in" };
  return           { percent: 0,   daysToCheckIn: days, description: "No refund - cancelled less than 3 days before check-in" };
}

export function generateInvoiceNumber(bookingId: string, amount: number): string {
  return `INV-${bookingId.slice(-8).toUpperCase()}-${String(Math.floor(amount)).padStart(6, "0")}`;
}

export function generateCreditNoteNumber(invoiceNumber: string): string {
  return `CN-${invoiceNumber}`;
}
