import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  status:          z.enum(["APPROVED","REJECTED","SUSPENDED"]),
  rejectionReason: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }
    const hotel = await prisma.hotel.update({
      where: { id },
      data: {
        status:          parsed.data.status,
        rejectionReason: parsed.data.rejectionReason,
        approvedAt:      parsed.data.status === "APPROVED" ? new Date() : undefined,
        approvedBy:      parsed.data.status === "APPROVED" ? (session.user as any).id : undefined,
      },
    });
    return NextResponse.json({ success: true, data: hotel });
  } catch (error) {
    console.error("[ADMIN_HOTEL_PATCH]", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
