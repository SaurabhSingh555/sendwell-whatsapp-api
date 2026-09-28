<<<<<<< HEAD
# sendwell. — WhatsApp API Console

A minimal single-session console for linking WhatsApp via QR, viewing a saved API key, and sending files to WhatsApp groups with one multipart request. This project runs on **Next.js (React + Node.js API routes)**. Supabase stores the API key and supports the existing optional file-upload endpoint; **sending a file does not use Supabase Storage**. No local PostgreSQL or Drizzle migration is required.

## Prerequisites

- Node.js 20.9+ (Node 22 recommended), npm, and a Supabase project for API-key storage.
- A personal WhatsApp account in the groups you want to send to.
- One **long-running Node.js process** with a persistent writable disk for your WhatsApp login. Supabase stores the API key; the WhatsApp Web credentials still live in `.wa-auth/` (or `WA_AUTH_DIR`). Stateless/serverless deployments cannot maintain the live WhatsApp connection.

## 1. Set up your Supabase project

1. Open your project in [Supabase Dashboard](https://supabase.com/dashboard) and go to **SQL Editor**.
2. Copy and run the **whole** [`supabase/setup.sql`](supabase/setup.sql) script. It creates `public.api_keys` with RLS enabled (no public policies) and the public `whatsapp-media` Storage bucket used by the optional `/api/upload` endpoint. You can rerun it safely.
3. Under **Project Settings → API**, copy your **Project URL** and **service_role** key. Use the service role key, **not** the anon/publishable key: server-only reads and writes to the protected API-key table use it. Never expose this key in browser code.

The standalone Storage bucket is public, so anyone with an object URL can download that object. The direct send endpoint does not store the file there. The `api_keys` table is not public: the service role accesses it server-side, while RLS blocks browser clients.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with values from the **same** Supabase project where you ran the SQL script:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET_SERVICE_ROLE_KEY
SUPABASE_BUCKET=whatsapp-media
# Optional (defaults to project-root .wa-auth):
# WA_AUTH_DIR=/absolute/path/to/persistent/private/whatsapp-auth
```

**No `DATABASE_URL` is needed.** Do not add `NEXT_PUBLIC_` to the service role key, commit `.env.local`, or share it.

## 3. Run and link WhatsApp

```bash
npm install
npm run dev -- --port 3001
```

Open **http://localhost:3001**. Wait a few seconds for the QR. On your phone open **WhatsApp → Settings (or ⋮) → Linked devices → Link a device** and scan it. The app generates one random API key after connection, saves it in Supabase `public.api_keys`, and shows it on the Overview page. Click **Copy key**. The saved key is reused on subsequent reconnections.

WhatsApp credentials are saved in `.wa-auth/` by default. Keep the directory private, persistent and writable, and run only one server process for the account. A restart with the same auth directory should reconnect without another QR. For production on port 3001: `npm run build` and `npm run start -- --port 3001` on a persistent host.

## 4. Send a file in one call

The **API Docs** page includes a ready-to-copy request with your saved key. Pass the file itself as multipart form data; no prior upload, Supabase media URL or WhatsApp group ID is needed. Group names are matched against the connected account after trimming and ignoring case. If multiple groups share the same name, the API rejects the ambiguous match instead of sending to the wrong one.

```bash
curl -X POST "http://localhost:3001/api/send-media-group" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "sessionId=Saurabh" \
  -F "groupName=MIS Reports" \
  -F "caption=Client Wise SLA Report - 28 Sep 2026" \
  -F "file=@./sla_report.svg"
```

Supported file extensions: PDF, XLSX, CSV, PNG, JPG/JPEG, SVG. Maximum file size: 25 MiB. PNG and JPG are sent as WhatsApp images; SVG and report files are sent as documents. Do not manually set the multipart `Content-Type` header—your HTTP client must generate the boundary.

Success (`200`): `{"success":true,"message":"Media sent successfully.","groupName":"MIS Reports","fileName":"sla_report.svg"}`.

Group not found (`404`): `{"success":false,"message":"WhatsApp group 'MIS Reports' not found in the connected account."}`.

Missing or invalid API keys return `401`; a disconnected WhatsApp session returns `503`. `sessionId` must be `Saurabh`.

### Google Apps Script example

Use a Blob as the `file` field in the `payload`. `UrlFetchApp` creates the multipart boundary automatically. For example, if `reportBlob` is a PDF, Excel, image or SVG Blob produced by your script:

```javascript
const reportBlob = DriveApp.getFileById('YOUR_DRIVE_FILE_ID').getBlob().setName('sla_report.pdf');
const response = UrlFetchApp.fetch('https://YOUR_SERVER_DOMAIN/api/send-media-group', {
  method: 'post',
  headers: { 'x-api-key': 'YOUR_API_KEY' },
  payload: {
    sessionId: 'Saurabh',
    groupName: 'MIS Reports',
    caption: 'Client Wise SLA Report',
    file: reportBlob,
  },
  muteHttpExceptions: true,
});
Logger.log(response.getResponseCode());
Logger.log(response.getContentText());
```

Use a publicly reachable **HTTPS** address for Google Apps Script (not `localhost`). Keep the API key in Apps Script properties rather than a shared script when deploying. Existing `GET /api/groups` and optional `POST /api/upload` remain available and require `x-api-key`, but neither is needed for the one-call send flow.

**Bootstrap exception:** `GET /api/status` serves the QR without a key until one is created. Once a key exists, it requires `x-api-key`. `GET /api/health` remains public for health checks. The status response never includes your key. The Overview and Docs pages display the saved key, so **protect the entire console with network-level access control or external authentication before exposing it to the internet.**

## Troubleshooting

- **“Supabase is not configured”** — set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and restart the app.
- **“Supabase API key lookup failed” / no key after connecting** — run the whole `supabase/setup.sql` in the correct project and check the service-role key.
- **Group not found** — confirm the connected account belongs to that group; spelling must match, but capitalization and outer whitespace do not matter.
- **Send fails** — confirm WhatsApp is connected, the key is valid, and the file is non-empty, supported and no larger than 25 MiB. Apps Script must send the file as a Blob, not a file URL or plain text.
- **QR appears after restart** — keep `.wa-auth/` or `WA_AUTH_DIR` on persistent storage and avoid multiple concurrent processes.

Baileys is an unofficial WhatsApp Web client; WhatsApp protocol changes or terms may affect it.
=======
# sendwell-whatsapp-api
>>>>>>> 428c32f79952881c83193be2f0be42f4316aa286
