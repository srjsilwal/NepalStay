import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"]),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["STAFF", "ADMIN", "VENDOR"].includes((session.user as any).role)
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const updatedRoom = await prisma.$transaction(async (tx) => {
      // Read room inside transaction
      const room = await tx.room.findUnique({
        where: { id },
        include: { hotel: true },
      });

      if (!room) {
        throw new Error("ROOM_NOT_FOUND");
      }

      // STAFF authorization inside transaction
      if (userRole === "STAFF") {
        const staffUser = await tx.user.findUnique({
          where: { id: userId },
          select: { staffHotelId: true },
        });

        if (!staffUser || staffUser.staffHotelId !== room.hotelId) {
          throw new Error("FORBIDDEN");
        }
      }

      // VENDOR authorization inside transaction
      if (userRole === "VENDOR") {
        if (room.hotel.vendorId !== userId) {
          throw new Error("FORBIDDEN");
        }
      }

      // Update + log atomically — always set updatedAt to trigger real-time sync
      const roomUpdate = await tx.room.update({
        where: { id },
        data: { status: parsed.data.status, updatedAt: new Date() },
      });

      await tx.roomStatusLog.create({
        data: {
            roomId: id,
          updatedBy: userId,
          status: parsed.data.status,
          notes: parsed.data.notes,
        },
      });

      return roomUpdate;
    });

    return NextResponse.json({
      success: true,
      data: updatedRoom,
    });
  } catch (error) {
    console.error("[ROOM_STATUS_PATCH]", error);

    if (error instanceof Error) {
      if (error.message === "ROOM_NOT_FOUND") {
        return NextResponse.json(
          { success: false, error: "Room not found" },
          { status: 404 }
        );
      }

      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Failed to update room status" },
      { status: 500 }
    );
  }
}
