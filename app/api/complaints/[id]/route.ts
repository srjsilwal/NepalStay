import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/complaints/[id] — admin updates status and notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 });
    }

    const { status, adminNotes } = await req.json();
    const validStatuses = ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) return NextResponse.json({ success: false, error: "Complaint not found" }, { status: 404 });

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(adminNotes !== undefined && { adminNotes }),
        ...(status === "RESOLVED" || status === "DISMISSED" ? { resolvedAt: new Date() } : {}),
      },
      include: {
        customer: { select: { name: true, email: true } },
        hotel:    { select: { name: true, city: true, status: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[COMPLAINTS_PATCH]", error);
    return NextResponse.json({ success: false, error: "Failed to update complaint" }, { status: 500 });
  }
}

// GET /api/complaints/[id] — get single complaint (admin or owner)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const actor = session.user as any;
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, email: true } },
        hotel:    { select: { name: true, city: true, status: true, id: true } },
      },
    });

    if (!complaint) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // Only admin or the complaint owner can view
    if (actor.role !== "ADMIN" && complaint.customerId !== actor.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: complaint });
  } catch (error) {
    console.error("[COMPLAINTS_GET_ID]", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
