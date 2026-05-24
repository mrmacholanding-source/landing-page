import "/supabase-config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = window.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = window.PUBLIC_SUPABASE_ANON_KEY;
const storageBucket = window.PUBLIC_SUPABASE_BUCKET || "site-media";

if (!supabaseUrl || supabaseUrl.includes("YOUR_PROJECT")) {
  console.warn("Supabase URL no configurada en public/supabase-config.js");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const BUCKET_NAME = storageBucket;

export async function uploadImage(file, folder = "posts") {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("Solo se permiten archivos JPG, PNG o WEBP.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(name, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(name);
  return data.publicUrl;
}
