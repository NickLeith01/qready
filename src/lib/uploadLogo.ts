import { supabase } from "@/lib/supabase";

const BUCKET = "merchant-logos";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/** Upload a logo file to Supabase Storage. Returns public URL or null. Max 2MB. Requires signed-in user (auth.uid() used as path). */
export async function uploadLogo(file: File): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error("You must be signed in to upload a logo.");
  }

  if (file.size > MAX_BYTES) {
    console.error("Logo must be 2MB or smaller");
    return null;
  }
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  let contentType = file.type;
  if (!contentType || !validTypes.includes(contentType)) {
    contentType = EXT_TO_MIME[ext] || "image/png";
  }
  if (!validTypes.includes(contentType)) {
    console.error("Logo must be JPEG, PNG, GIF, WebP or SVG");
    return null;
  }
  const safeExt = ext && EXT_TO_MIME[ext] ? ext : "png";
  const path = `${user.id}/logo.${safeExt}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType,
  });
  if (error) {
    console.error("Logo upload failed:", error.message);
    throw new Error(error.message);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const BANNER_EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

/** Upload a banner ad image to Supabase Storage. Returns public URL or null. Max 2MB. JPEG, PNG, WebP, GIF. Requires signed-in user. */
export async function uploadBanner(file: File): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error("You must be signed in to upload a banner.");
  }

  if (file.size > MAX_BYTES) {
    console.error("Banner must be 2MB or smaller");
    return null;
  }
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  let contentType = file.type;
  if (!contentType || !validTypes.includes(contentType)) {
    contentType = BANNER_EXT_TO_MIME[ext] || "image/png";
  }
  if (!validTypes.includes(contentType)) {
    console.error("Banner must be JPEG, PNG, GIF or WebP");
    return null;
  }
  const safeExt = ext && BANNER_EXT_TO_MIME[ext] ? ext : "png";
  const path = `${user.id}/banner.${safeExt}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType,
  });
  if (error) {
    console.error("Banner upload failed:", error.message);
    throw new Error(error.message);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
