import { requireApiKey } from "@/lib/api-key";
import { getGroups } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireApiKey(request);
  if (unauthorized) return unauthorized;
  try {
    const groups = await getGroups();
    return Response.json({ groups }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not fetch groups." }, { status: 503 });
  }
}
