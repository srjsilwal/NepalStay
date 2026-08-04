import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  role:     z.enum(["CUSTOMER","VENDOR","STAFF","ADMIN"]).optional(),
  isActive: z.boolean().optional(),
  staffHotelId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    if (id === (session.user as any).id) {
      return NextResponse.json({ success: false, error: "Cannot modify your own account" }, { status: 400 });
    }
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
    }
    const user = await prisma.user.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[ADMIN_USER_PATCH]", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
