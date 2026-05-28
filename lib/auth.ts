import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
            role: true,
            avatar: true,
            isActive: true,
            nationality: true,
            passportNumber: true,
            purposeOfVisit: true,
            staffHotelId: true,
            staffHotel: { select: { staffEnabled: true, id: true } },
          },
        });
        if (!user || !user.isActive) {
          throw new Error("No account found with this email");
        }
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) throw new Error("Incorrect password");

        return {
          id:                 user.id,
          email:              user.email,
          name:               user.name,
          role:               user.role,
          avatar:             user.avatar,
          nationality:        user.nationality,
          passportNumber:     user.passportNumber,
          purposeOfVisit:     user.purposeOfVisit,
          staffHotelId:       user.staffHotelId,
          // Only for STAFF: whether their hotel has staff management enabled
          staffHotelEnabled:  user.role === "STAFF" ? (user.staffHotel?.staffEnabled ?? false) : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id                = user.id;
        token.role              = (user as any).role;
        token.avatar            = (user as any).avatar;
        token.name              = user.name;
        token.nationality       = (user as any).nationality;
        token.passportNumber    = (user as any).passportNumber;
        token.purposeOfVisit    = (user as any).purposeOfVisit;
        token.staffHotelId      = (user as any).staffHotelId;
        token.staffHotelEnabled = (user as any).staffHotelEnabled;
      }
      
      // Refresh staffHotelEnabled on every invocation for STAFF users
      if (token.role === "STAFF" && token.id) {
        const staffUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { staffHotelId: true, staffHotel: { select: { staffEnabled: true } }, isActive: true },
        });
        if (staffUser) {
          token.staffHotelId = staffUser.staffHotelId;
          token.staffHotelEnabled = staffUser.staffHotel?.staffEnabled ?? false;
          // Also check if staff account itself is disabled
          if (!staffUser.isActive) {
            token.staffHotelEnabled = false;
          }
        }
      }
      
      // Handle update() calls from the client (e.g profile save)
      if (trigger === "update" && session) {
        if (session.name  !== undefined) token.name   = session.name;
        if (session.avatar !== undefined) token.avatar = session.avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id                = token.id;
        (session.user as any).role              = token.role;
        (session.user as any).avatar            = token.avatar;
        (session.user as any).nationality       = token.nationality;
        (session.user as any).passportNumber    = token.passportNumber;
        (session.user as any).purposeOfVisit    = token.purposeOfVisit;
        (session.user as any).staffHotelId      = token.staffHotelId;
        (session.user as any).staffHotelEnabled = token.staffHotelEnabled;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to home after sign out
      if (url === baseUrl || url === baseUrl + "/") {
        return baseUrl + "/hotels";
      }
      
      // Strict origin validation to prevent open redirects
      try {
        const parsedUrl = new URL(url, baseUrl);
        const parsedBase = new URL(baseUrl);
        
        // Only allow same-origin redirects. NextAuth's client parses this with
        // new URL(...), so return an absolute URL instead of a relative path.
        if (parsedUrl.origin === parsedBase.origin) {
          return parsedUrl.toString();
        }
      } catch {
        // Invalid URL, fall through to default
      }
      
      return baseUrl + "/hotels";
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
