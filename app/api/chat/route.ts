import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat
 * AI chatbot powered by Groq (llama-3.1-8b-instant — free tier).
 * Body: { message: string, history: Array<{role, content}> }
 * Returns: { reply: string, hotels?: Hotel[], hasHotels: boolean }
 */

const SEARCH_KEYWORDS = [
  "hotel", "stay", "book", "room", "night", "accommodation",
  "guesthouse", "resort", "lodge", "hostel", "sleep",
  "kathmandu", "pokhara", "chitwan", "nagarkot", "lumbini",
  "cheap", "budget", "luxury", "affordable", "expensive",
  "trek", "trekking", "everest", "annapurna",
  "family", "honeymoon", "couple", "solo", "backpacker",
];

function extractSearchParams(message: string): {
  city?: string;
  maxPrice?: number;
  minStars?: number;
  propertyType?: string;
  keywords: string;
} {
  const lower = message.toLowerCase();

  const cities = ["kathmandu", "pokhara", "chitwan", "nagarkot", "lumbini", "namche", "bandipur"];
  const city = cities.find((c) => lower.includes(c));

  const priceMatch = lower.match(/(?:under|below|less than|max|upto|up to)\s*(?:npr\s*)?(\d+)/);
  const maxPrice = priceMatch ? parseInt(priceMatch[1]) : undefined;

  const starMatch = lower.match(/(\d)\s*star/);
  const minStars = starMatch
    ? parseInt(starMatch[1])
    : lower.includes("luxury")
      ? 4
      : lower.includes("budget")
        ? 1
        : undefined;

  const propertyType = lower.includes("resort")
    ? "Resort"
    : lower.includes("guesthouse")
      ? "Guesthouse"
      : lower.includes("hostel")
        ? "Hostel"
        : lower.includes("lodge")
          ? "Lodge"
          : lower.includes("boutique")
            ? "Boutique Hotel"
            : undefined;

  return { city: city ? city.charAt(0).toUpperCase() + city.slice(1) : undefined, maxPrice, minStars, propertyType, keywords: message };
}

async function searchHotels(params: ReturnType<typeof extractSearchParams>) {
  const where: any = { status: "APPROVED" };

  if (params.city) where.city = { contains: params.city, mode: "insensitive" };
  if (params.minStars) where.starRating = { gte: params.minStars };
  if (params.propertyType) where.propertyType = { contains: params.propertyType, mode: "insensitive" };
  if (params.maxPrice) {
    where.rooms = { some: { isActive: true, pricePerNight: { lte: params.maxPrice } } };
  }

  const hotels = await prisma.hotel.findMany({
    where,
    take: 4,
    orderBy: [{ starRating: "desc" }],
    include: {
      rooms: { where: { isActive: true }, orderBy: { pricePerNight: "asc" }, take: 1 },
      reviews: { select: { overallScore: true } },
    },
  });

  return hotels.map((h) => ({
    id: h.id,
    slug: h.slug,
    name: h.name,
    city: h.city,
    starRating: h.starRating,
    propertyType: h.propertyType,
    images: h.images,
    minPrice: h.rooms[0]?.pricePerNight ?? 0,
    avgReview:
      h.reviews.length > 0
        ? Math.round((h.reviews.reduce((s, r) => s + r.overallScore, 0) / h.reviews.length) * 10) / 10
        : null,
    amenities: h.amenities.slice(0, 4),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
    }

    // Check Groq API key
    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (!groqKey || groqKey.includes("your_free_api_key")) {
      console.error("[CHAT_API] GROQ_API_KEY not configured. Get a free key at https://console.groq.com");
      // In development, provide a helpful message
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json(
          { 
            success: false, 
            error: "AI service needs setup. Get your FREE Groq API key at https://console.groq.com and add it to .env as GROQ_API_KEY.",
            setupUrl: "https://console.groq.com"
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { success: false, error: "AI service not configured. Please contact support." },
        { status: 500 },
      );
    }

    // Fetch relevant hotels if query is hotel-related
    const isHotelQuery = SEARCH_KEYWORDS.some((kw) => message.toLowerCase().includes(kw));
    let hotels: any[] = [];
    let hotelContext = "";

    if (isHotelQuery) {
      const params = extractSearchParams(message);
      hotels = await searchHotels(params);

      if (hotels.length > 0) {
        hotelContext = `\n\nRelevant hotels found in our database:\n${hotels
          .map(
            (h) =>
              `- ${h.name} (${h.city}, ${h.starRating}★ ${h.propertyType}) — from NPR ${h.minPrice.toLocaleString()}/night${h.avgReview ? `, rated ${h.avgReview}/5` : ""}`,
          )
          .join("\n")}`;
      }
    }

    const systemPrompt = `You are NepalStay's friendly AI travel assistant. You help travellers find and book hotels across Nepal.

Your personality:
- Warm, knowledgeable, and enthusiastic about Nepal's tourism
- You know Nepal well — its cities, trekking routes, festivals, best times to visit
- You always respond in English (or match the user's language if they write in Nepali)
- Keep responses concise and helpful — 2-4 sentences max unless explaining something complex

What you can help with:
- Hotel recommendations based on budget, city, type, purpose of trip
- Nepal travel tips (best time to visit, trekking seasons, festivals like Dashain/Tihar)
- Booking guidance (how Khalti payment works, BS calendar, FNMIS for foreign tourists)
- Price information and comparisons

What you cannot do:
- Make actual bookings (users must book through the website)
- Access real-time prices (show the database prices as approximate)

Nepal context you know:
- Peak trekking seasons: March-May (spring) and October-November (autumn)
- Dashain and Tihar festivals are in October — hotels fill up fast
- Khalti is Nepal's main digital payment — international tourists can use Stripe/card
- Nepal uses Bikram Sambat (BS) calendar which is ~57 years ahead of AD
- FNMIS: Hotels must report foreign guests within 24 hours to Tourist Police
${hotelContext}

If you found hotels above, mention them naturally in your response. Be specific about prices.
If no hotels were found, suggest the user refine their search or try different filters.`;

    // Call Groq API (OpenAI-compatible endpoint)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "groq/compound-mini",
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          // Include last 6 messages of conversation history
          ...history.slice(-6).map((h: any) => ({ role: h.role, content: h.content })),
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[CHAT_API] Groq error", response.status, err);
      
      // Provide helpful error messages
      let errorMsg = "AI backend returned an error. Please try again later.";
      if (response.status === 401) {
        errorMsg = "Invalid Groq API key. Please check your .env GROQ_API_KEY setting.";
      } else if (response.status === 429) {
        errorMsg = "Rate limited. Please wait a moment and try again.";
      }
      
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 502 },
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? null;

    if (!reply) {
      console.error("[CHAT_API] No reply in Groq response", data);
      return NextResponse.json({ success: false, error: "AI did not return a valid reply." }, { status: 502 });
    }

    return NextResponse.json({ success: true, reply, hotels, hasHotels: hotels.length > 0 });
  } catch (error) {
    console.error("[CHAT]", error);
    return NextResponse.json({ success: true, reply: "Something went wrong. Please try again.", hotels: [] });
  }
}
