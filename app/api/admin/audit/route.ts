import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { adToBS, formatBSShort, getNepalisFiscalYear } from "@/lib/nepali-date";

// Mark this route as dynamic since it requires runtime data
export const dynamic = "force-dynamic";

async function generateReportSummaryWithGroq(data: any): Promise<string> {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY not configured");

    const reportData = `
Audit Report Summary:
- Period: ${data.period.fromBS} to ${data.period.toBS}
- Fiscal Year: ${data.period.fiscalYear}
- Total Invoices: ${data.summary.invoiceCount}
- Total Refunds: ${data.summary.refundCount}
- Gross Revenue: NPR ${data.summary.grossRevenue.toLocaleString()}
- Total Refunds: NPR ${data.summary.totalRefunds.toLocaleString()}
- Net Revenue: NPR ${data.summary.netRevenue.toLocaleString()}
- Average Transaction Value: NPR ${Math.round(data.summary.grossRevenue / Math.max(data.summary.invoiceCount, 1)).toLocaleString()}

Top Hotels (by transactions):
${data.invoices
  .reduce((acc: any, inv: any) => {
    const existing = acc.find((h: any) => h.name === inv.hotel.name);
    if (existing) existing.count++;
    else acc.push({ name: inv.hotel.name, count: 1 });
    return acc;
  }, [])
  .sort((a: any, b: any) => b.count - a.count)
  .slice(0, 5)
  .map((h: any) => `- ${h.name}: ${h.count} bookings`)
  .join("\n")}

Please generate a concise executive summary (2-3 sentences) highlighting key insights and recommendations for this audit period.
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "groq/compound-mini",
        messages: [
          {
            role: "system",
            content: "You are a financial auditor for hotels in Nepal. Provide concise, professional insights.",
          },
          {
            role: "user",
            content: reportData,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || "Report generated successfully.";
  } catch (error) {
    console.error("[GROQ_SUMMARY_ERROR]", error);
    // Return a default summary if Groq fails
    return "Audit report generated. Review the detailed transactions below for complete analysis.";
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    const fromDate = from ? new Date(from) : new Date(new Date().setDate(1)); // start of month
    const toDate   = to   ? new Date(to)   : new Date();
    toDate.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        invoiceIssuedAt: { gte: fromDate, lte: toDate },
        invoiceNumber:   { not: null },
      },
      orderBy: { invoiceIssuedAt: "asc" },
      include: {
        user:  { select: { name: true, email: true } },
        hotel: { select: { name: true, city: true } },
        room:  { select: { name: true, type: true } },
      },
    });

    const creditNotes = await prisma.creditNote.findMany({
      where: { issuedAt: { gte: fromDate, lte: toDate } },
      orderBy: { issuedAt: "asc" },
    });

    const grossRevenue = bookings.reduce((s, b) => s + b.totalPrice, 0);
    const totalRefunds = creditNotes.reduce((s, c) => s + c.refundAmount, 0);
    const netRevenue   = grossRevenue - totalRefunds;

    const invoicesWithBS = bookings.map(b => ({
      ...b,
      invoiceDateBS: b.invoiceIssuedAt ? formatBSShort(adToBS(b.invoiceIssuedAt)) : null,
      checkInBS:     formatBSShort(adToBS(b.checkIn)),
      checkOutBS:    formatBSShort(adToBS(b.checkOut)),
    }));

    const periodData = {
      period: {
        from:    fromDate.toISOString(),
        to:      toDate.toISOString(),
        fromBS:  formatBSShort(adToBS(fromDate)),
        toBS:    formatBSShort(adToBS(toDate)),
        fiscalYear: getNepalisFiscalYear(fromDate),
      },
      summary: {
        grossRevenue, totalRefunds, netRevenue,
        invoiceCount:  bookings.length,
        refundCount:   creditNotes.length,
      },
      invoices:    invoicesWithBS,
      creditNotes,
    };

    // Generate AI summary using Groq
    const aiSummary = await generateReportSummaryWithGroq(periodData);

    return NextResponse.json({
      success: true,
      ...periodData,
      aiSummary,
    });
  } catch (error) {
    console.error("[AUDIT_GET]", error);
    return NextResponse.json({ success: false, error: "Failed to generate audit report" }, { status: 500 });
  }
}
