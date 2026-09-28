import { requireApiKey, SESSION_ID } from "@/lib/api-key";
import { getGroups, getWhatsAppStatus, sendMedia } from "@/lib/whatsapp";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
};

function failure(message: string, status = 400) {
  return Response.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  // Validate before parsing/reading the uploaded file.
  const unauthorized = await requireApiKey(request);
  if (unauthorized) return unauthorized;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    return failure("Use multipart/form-data with sessionId, groupName, caption, and file.", 415);
  }
  // Allow a little multipart envelope overhead; the file itself is checked below.
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_FILE_BYTES + 1024 * 1024) return failure("File must be 25 MB or smaller.", 413);

  try {
    const form = await request.formData();
    const sessionId = form.get("sessionId");
    const groupName = form.get("groupName");
    const caption = form.get("caption");
    const file = form.get("file");

    if (sessionId !== SESSION_ID) return failure(`Invalid sessionId. Use ${SESSION_ID}.`);
    if (typeof groupName !== "string" || !groupName.trim()) return failure("groupName is required.");
    if (caption !== null && typeof caption !== "string") return failure("caption must be text.");
    if (typeof caption === "string" && caption.length > 1024) return failure("caption must be 1024 characters or fewer.");
    if (!(file instanceof File)) return failure("A file is required.");
    if (!file.size || file.size > MAX_FILE_BYTES) return failure("File must be non-empty and 25 MB or smaller.", 413);

    const fileName = file.name.replace(/\\/g, "/").split("/").pop() || "";
    const mime = MIME_BY_EXTENSION[fileName.split(".").pop()?.toLowerCase() || ""];
    if (!mime) return failure("Unsupported file type. Use PDF, XLSX, CSV, PNG, JPG, or SVG.");
    if (getWhatsAppStatus().status !== "connected") return failure("WhatsApp session is not connected.", 503);

    // Fetch the live group list rather than accepting an internal WhatsApp ID.
    const requestedName = groupName.trim();
    const matches = (await getGroups()).filter(group => group.name.trim().toLocaleLowerCase() === requestedName.toLocaleLowerCase());
    if (matches.length === 0) return failure(`WhatsApp group '${requestedName}' not found in the connected account.`, 404);
    if (matches.length > 1) return failure(`More than one WhatsApp group is named '${requestedName}'. Please use a unique group name.`, 409);

    await sendMedia(matches[0].id, Buffer.from(await file.arrayBuffer()), fileName, mime, typeof caption === "string" ? caption.trim() : "");
    return Response.json({ success: true, message: "Media sent successfully.", groupName: matches[0].name, fileName });
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not send media.", 400);
  }
}
