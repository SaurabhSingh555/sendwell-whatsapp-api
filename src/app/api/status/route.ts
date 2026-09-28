import { ensureApiKey, getApiKey, requireApiKey } from "@/lib/api-key";
import { getWhatsAppStatus } from "@/lib/whatsapp";
import { isStorageConfigured } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// QR bootstrap is public until the first key exists. Afterwards status also
// requires x-api-key. Protect the console itself with network access control.
export async function GET(request: Request) {
  let existingKey: string | null;
  try {
    existingKey = await getApiKey();
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Supabase is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (existingKey) {
    const unauthorized = await requireApiKey(request);
    if (unauthorized) return unauthorized;
  }
  const connection = getWhatsAppStatus();
  let keyReady = Boolean(existingKey);
  let storageError: string | null = null;
  if (connection.status === "connected" && !existingKey) {
    try {
      keyReady = Boolean(await ensureApiKey());
    } catch (error) {
      storageError = error instanceof Error ? error.message : "Could not save the API key in Supabase.";
    }
  }
  return Response.json({ ...connection, error: storageError || connection.error, keyReady, storageConfigured: isStorageConfigured() }, { headers: { "Cache-Control": "no-store" } });
}
