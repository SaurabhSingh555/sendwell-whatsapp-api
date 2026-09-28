import { randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// This app manages one WhatsApp Web session. The secret stays on the server.
export const SESSION_ID = "Saurabh";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function checkError(error: { message: string } | null) {
  if (error) throw new Error(`Supabase API key lookup failed: ${error.message}. Run supabase/setup.sql in your Supabase SQL Editor and check your service-role key.`);
}

export async function getApiKey(): Promise<string | null> {
  const { data, error } = await supabaseAdmin().from("api_keys").select("api_key").eq("session_id", SESSION_ID).maybeSingle();
  checkError(error);
  return data?.api_key ?? null;
}

export async function ensureApiKey(): Promise<string | null> {
  const { error } = await supabaseAdmin().from("api_keys").upsert(
    { session_id: SESSION_ID, api_key: randomBytes(24).toString("hex") },
    { onConflict: "session_id", ignoreDuplicates: true },
  );
  checkError(error);
  return getApiKey();
}

export async function requireApiKey(request: Request): Promise<Response | null> {
  const supplied = request.headers.get("x-api-key");
  if (!supplied || !/^[a-f0-9]{48}$/.test(supplied)) {
    return Response.json({ success: false, error: "Missing or invalid x-api-key." }, { status: 401 });
  }
  try {
    const actual = await getApiKey();
    if (!actual || !timingSafeEqual(Buffer.from(supplied), Buffer.from(actual))) {
      return Response.json({ success: false, error: "Missing or invalid x-api-key." }, { status: 401 });
    }
    return null;
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Supabase is unavailable." }, { status: 503 });
  }
}
