import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import pino from "pino";
import makeWASocket, { DisconnectReason, useMultiFileAuthState, type WASocket } from "@whiskeysockets/baileys";

type ConnectionStatus = "connecting" | "qr" | "connected" | "disconnected";
type State = {
  socket: WASocket | null;
  status: ConnectionStatus;
  qr: string | null;
  error: string | null;
  starting: Promise<void> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
  generation: number;
};

declare global {
  // A single socket is shared by Next.js route modules in the same process.
  var whatsappMediaState: State | undefined;
}

const state: State = globalThis.whatsappMediaState ??= {
  socket: null,
  status: "connecting",
  qr: null,
  error: null,
  starting: null,
  retryTimer: null,
  generation: 0,
};

const authDir = process.env.WA_AUTH_DIR || path.join(process.cwd(), ".wa-auth");

async function connect() {
  const generation = ++state.generation;
  state.status = "connecting";
  state.qr = null;
  state.error = null;
  try {
    await mkdir(authDir, { recursive: true });
    const { state: auth, saveCreds } = await useMultiFileAuthState(authDir);
    const socket = makeWASocket({
      auth,
      logger: pino({ level: "silent" }),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 60_000,
    });
    state.socket = socket;
    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
      if (generation !== state.generation) return;
      if (qr) {
        try {
          state.qr = await QRCode.toDataURL(qr, { width: 320, margin: 2, color: { dark: "#183d32", light: "#ffffff" } });
          state.status = "qr";
          state.error = null;
        } catch {
          state.error = "Could not generate the QR code. Please try again.";
        }
      }
      if (connection === "open") {
        state.status = "connected";
        state.qr = null;
        state.error = null;
      }
      if (connection === "close") {
        state.socket = null;
        state.qr = null;
        state.status = "disconnected";
        const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          state.error = "Session logged out. Scan the new QR code to reconnect.";
          await rm(authDir, { recursive: true, force: true }).catch(() => {});
        } else {
          state.error = "Connection interrupted. Reconnecting…";
        }
        if (!state.retryTimer) {
          state.retryTimer = setTimeout(() => {
            state.retryTimer = null;
            void ensureWhatsApp();
          }, 3000);
          state.retryTimer.unref?.();
        }
      }
    });
  } catch (error) {
    state.socket = null;
    state.status = "disconnected";
    state.error = error instanceof Error ? error.message : "Unable to start WhatsApp connection.";
  }
}

export function ensureWhatsApp() {
  if (state.socket || state.starting || state.retryTimer) return;
  state.starting = connect().finally(() => { state.starting = null; });
}

export function getWhatsAppStatus() {
  ensureWhatsApp();
  return { status: state.status, qr: state.qr, error: state.error };
}

function connectedSocket() {
  if (state.status !== "connected" || !state.socket) throw new Error("WhatsApp is not connected. Scan the QR code and try again.");
  return state.socket;
}

export async function getGroups() {
  const metadata = await connectedSocket().groupFetchAllParticipating();
  return Object.values(metadata)
    .map(group => ({ id: group.id, name: group.subject || "Unnamed group", participants: group.participants?.length ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function sendMedia(groupId: string, media: Buffer, fileName: string, mimeType: string, caption: string) {
  const socket = connectedSocket();
  const group = await socket.groupMetadata(groupId);
  if (!group?.id || group.id !== groupId) throw new Error("The selected group could not be found.");
  const isImage = mimeType === "image/png" || mimeType === "image/jpeg";
  const message = isImage
    ? { image: media, mimetype: mimeType, caption }
    : { document: media, mimetype: mimeType, fileName, caption };
  const result = await socket.sendMessage(groupId, message);
  if (!result?.key?.id) throw new Error("WhatsApp did not confirm the message.");
  return result.key.id;
}
