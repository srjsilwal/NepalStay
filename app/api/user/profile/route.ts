import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  name:    z.string().min(2).optional(),
  phone:   z.string().nullish(),
  address: z.string().nullish(),
  avatar:  z.string().url().nullish(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { id: true, name: true, email: true, phone: true, address: true, avatar: true, role: true, createdAt: true, nationality: true, country: true },
    });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[PROFILE_GET]", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: (session.user as any).id },
      data:  parsed.data,
      select: { id: true, name: true, email: true, phone: true, address: true, avatar: true, role: true },
    });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[PROFILE_PATCH]", error);
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}
