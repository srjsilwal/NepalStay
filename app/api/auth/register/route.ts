import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().optional(),
    role: z.enum(["CUSTOMER", "VENDOR"]).default("CUSTOMER"),
    nationality: z.enum(["NEPALI", "FOREIGN"]).default("NEPALI"),
    country: z.string().optional(), // Country name for foreign nationals
    passportNumber: z.string().optional(),
    purposeOfVisit: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.nationality === "FOREIGN" &&
      (!data.passportNumber || data.passportNumber.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passportNumber"],
        message: "Passport number is required for foreign nationals",
      });
    }
    if (data.nationality === "FOREIGN" && (!data.country || data.country.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["country"],
        message: "Country is required for foreign nationals",
      });
    }
  });

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, phone, role, nationality, country, passportNumber, purposeOfVisit } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user   = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        phone,
        role,
        nationality,
        country: nationality === "FOREIGN" ? country : null,
        passportNumber: nationality === "FOREIGN" ? passportNumber : null,
        purposeOfVisit: nationality === "FOREIGN" ? purposeOfVisit : null,
      },
      select: { id: true, name: true, email: true, role: true, nationality: true },
    });

    return NextResponse.json(
      { success: true, data: user, message: "Account created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
