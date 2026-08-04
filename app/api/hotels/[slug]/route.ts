import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRecommendations } from "@/lib/recommendation";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    const hotel = await prisma.hotel.findUnique({
      where: { slug },
      include: {
        vendor: { select: { name: true, email: true, phone: true } },
        rooms: {
          where: { isActive: true },
          orderBy: [{ type: "asc" }, { pricePerNight: "asc" }],
        },
        reviews: {
          where: { isVisible: true },
          include: { user: { select: { name: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: { select: { reviews: true, wishlist: true } },
      },
    });

    if (!hotel || hotel.status !== "APPROVED") {
      return NextResponse.json({ success: false, error: "Hotel not found" }, { status: 404 });
    }

    // Compute review stats
    const avgReview = hotel.reviews.length > 0
      ? {
          overall:     avg(hotel.reviews.map((r) => r.overallScore)),
          cleanliness: avg(hotel.reviews.map((r) => r.cleanlinessScore)),
          staff:       avg(hotel.reviews.map((r) => r.staffScore)),
          location:    avg(hotel.reviews.map((r) => r.locationScore)),
          value:       avg(hotel.reviews.map((r) => r.valueScore)),
          facilities:  avg(hotel.reviews.map((r) => r.facilitiesScore)),
        }
      : null;

    // Check if current user has wishlisted this hotel
    let isWishlisted = false;
    if (session?.user) {
      const wl = await prisma.wishlistItem.findUnique({
        where: {
          userId_hotelId: {
            userId:  (session.user as any).id,
            hotelId: hotel.id,
          },
        },
      });
      isWishlisted = !!wl;
    }

    // ── Recommendations (cosine similarity) ────────────────────────────────
    const allHotels = await prisma.hotel.findMany({
      where: { status: "APPROVED", id: { not: hotel.id } },
      include: {
        rooms: { where: { isActive: true }, select: { pricePerNight: true } },
      },
    });

    const forRec = allHotels.map((h) => ({
      id:          h.id,
      slug:        h.slug,
      name:        h.name,
      city:        h.city,
      starRating:  h.starRating,
      propertyType: h.propertyType,
      amenities:   h.amenities,
      images:      h.images,
      avgPrice:    h.rooms.length > 0
        ? h.rooms.reduce((s, r) => s + r.pricePerNight, 0) / h.rooms.length
        : 0,
    }));

    const queryHotel = {
      id:          hotel.id,
      slug:        hotel.slug,
      name:        hotel.name,
      city:        hotel.city,
      starRating:  hotel.starRating,
      propertyType: hotel.propertyType,
      amenities:   hotel.amenities,
      images:      hotel.images,
      avgPrice:    hotel.rooms.length > 0
        ? hotel.rooms.reduce((s, r) => s + r.pricePerNight, 0) / hotel.rooms.length
        : 0,
    };

    const recommendations = getRecommendations(queryHotel, forRec, 6);

    return NextResponse.json({
      success: true,
      data: {
        ...hotel,
        avgReview,
        isWishlisted,
        recommendations,
      },
    });
  } catch (error) {
    console.error("[HOTEL_GET]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch hotel" }, { status: 500 });
  }
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
}
