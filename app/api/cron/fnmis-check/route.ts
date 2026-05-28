import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FNMIS_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/cron/fnmis-check
 * Run hourly via cron (Vercel cron, uptime robot, etc.)
 * Marks foreign-guest bookings as overdue when 24h deadline passes.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const deadlineCutoff = new Date(now.getTime() - FNMIS_WINDOW_MS);

    const overdueResult = await prisma.booking.updateMany({
      where: {
        user: { nationality: "FOREIGN", passportNumber: { not: null } },
        fnmisReported: false,
        fnmisOverdue: false,
        OR: [
          { fnmisDeadline: { lt: now } },
          { createdAt: { lt: deadlineCutoff } },
        ],
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
      },
      data: { fnmisOverdue: true },
    });

    return NextResponse.json({
      success: true,
      overdueMarked: overdueResult.count,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[CRON_FNMIS]", error);
    return NextResponse.json({ success: false, error: "Cron failed" }, { status: 500 });
  }
}
