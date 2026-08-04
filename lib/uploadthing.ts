import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  // Hotel images — vendor only, up to 10 images
  hotelImage: f({ image: { maxFileSize: "4MB", maxFileCount: 10 } })
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session || !["VENDOR", "ADMIN"].includes((session.user as any).role)) {
        throw new UploadThingError("Only vendors can upload hotel images");
      }
      return { userId: (session.user as any).id };
    })
    .onUploadComplete(async ({ file }) => ({ url: file.url })),

  // User avatar — any authenticated user
  userAvatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session) throw new UploadThingError("Login required");
      return { userId: (session.user as any).id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const { default: prisma } = await import("@/lib/prisma");
      await prisma.user.update({
        where: { id: metadata.userId },
        data: { avatar: file.url },
      });
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
