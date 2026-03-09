import { supabase } from "@/lib/supabase";

const BUCKET = "merchant-logos";
const LOGO_PATH = "default/logo";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

/** Upload a logo file to Supabase Storage. Returns public URL or null. Max 2MB. */
export async function uploadLogo(file: File): Promise<string | null> {
  if (file.size > MAX_BYTES) {
    console.error("Logo must be 2MB or smaller");
    return null;
  }
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
  if (!validTypes.includes(file.type)) {
    console.error("Logo must be JPEG, PNG, GIF, WebP or SVG");
    return null;
  }
  const ext = file.name.split(".").pop() || "png";
  const path = `${LOGO_PATH}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) {
    console.error("Logo upload failed:", error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
