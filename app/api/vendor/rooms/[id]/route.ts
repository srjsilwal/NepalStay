import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name:          z.string().min(2).optional(),
  type:          z.enum(["SINGLE","DOUBLE","TWIN","DELUXE","SUITE","PENTHOUSE","DORMITORY"]).optional(),
  pricePerNight: z.number().positive().optional(),
  capacity:      z.number().int().min(1).optional(),
  floor:         z.number().int().min(0).optional(),
  totalRooms:    z.number().int().min(1).optional(),
  description:   z.string().optional(),
  amenities:     z.array(z.string()).optional(),
  images:        z.array(z.string()).optional(),
  isActive:      z.boolean().optional(),
});

async function ownsRoom(vendorId: string, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { hotel: { select: { vendorId: true } } },
  });
  return room?.hotel.vendorId === vendorId ? room : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !["VENDOR","ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    const room = await ownsRoom((session.user as any).id, id);
    if (!room && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Room not found or unauthorized" }, { status: 404 });
    }
    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }
    const updated = await prisma.room.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[VENDOR_ROOM_PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !["VENDOR","ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    const room = await ownsRoom((session.user as any).id, id);
    if (!room && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Room not found or unauthorized" }, { status: 404 });
    }
    // Guard: no active bookings
    const active = await prisma.booking.findFirst({
      where: { roomId: id, status: { in: ["CONFIRMED","CHECKED_IN"] } },
    });
    if (active) {
      return NextResponse.json({ success: false, error: "Cannot delete a room with active bookings" }, { status: 409 });
    }
    await prisma.room.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Room deleted" });
  } catch (error) {
    console.error("[VENDOR_ROOM_DELETE]", error);
    return NextResponse.json({ success: false, error: "Failed to delete room" }, { status: 500 });
  }
}
