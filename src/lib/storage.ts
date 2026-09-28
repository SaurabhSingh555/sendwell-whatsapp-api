import { createClient } from "@supabase/supabase-js";

const types: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

const maxBytes = 25 * 1024 * 1024;

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "whatsapp-media";
  if (!url || !key) throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
  return { url: url.replace(/\/$/, ""), key, bucket };
}

export function isStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function fileType(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  return types[extension] || null;
}

export async function uploadFile(file: File) {
  const { url, key, bucket } = config();
  const mime = fileType(file.name);
  if (!mime) throw new Error("Choose a PDF, XLSX, CSV, PNG, or JPG file.");
  if (!file.size || file.size > maxBytes) throw new Error("Choose a non-empty file under 25 MB.");
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  const objectPath = `media/${crypto.randomUUID()}-${cleanName}`;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.storage.from(bucket).upload(objectPath, Buffer.from(await file.arrayBuffer()), {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return { mediaUrl: data.publicUrl, fileName: file.name };
}

export async function downloadUploadedFile(mediaUrl: string) {
  const { url, bucket } = config();
  let supplied: URL;
  let base: URL;
  try {
    supplied = new URL(mediaUrl);
    base = new URL(url);
  } catch {
    throw new Error("Invalid media URL.");
  }
  const prefix = `/storage/v1/object/public/${encodeURIComponent(bucket)}/media/`;
  if (supplied.origin !== base.origin || !supplied.pathname.startsWith(prefix) || supplied.search || supplied.hash) {
    throw new Error("The media URL must be a file uploaded to your configured Supabase bucket.");
  }
  const fileName = decodeURIComponent(supplied.pathname.slice(prefix.length)).replace(/^[a-f0-9-]{36}-/, "");
  const mime = fileType(fileName);
  if (!mime) throw new Error("Unsupported file type.");
  const response = await fetch(mediaUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("Could not download the uploaded file from Supabase. Make sure the bucket is public.");
  if (Number(response.headers.get("content-length") || 0) > maxBytes) throw new Error("File exceeds the 25 MB limit.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > maxBytes) throw new Error("File must be non-empty and under 25 MB.");
  return { buffer, fileName, mime };
}
