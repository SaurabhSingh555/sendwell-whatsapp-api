import { requireApiKey } from "@/lib/api-key";
import { uploadFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = await requireApiKey(request);
  if (unauthorized) return unauthorized;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Select a file to upload." }, { status: 400 });
    return Response.json(await uploadFile(file));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
