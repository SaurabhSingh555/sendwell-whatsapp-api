"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, KeyRound, LoaderCircle, MessageCircle, ShieldCheck, Smartphone, Terminal } from "lucide-react";
import CopyButton from "./CopyButton";

type Status = { status: "connecting" | "qr" | "connected" | "disconnected"; qr: string | null; error: string | null; keyReady: boolean; storageConfigured: boolean };

export default function Console({ apiKey, keyError }: { apiKey: string | null; keyError?: string }) {
  const [status, setStatus] = useState<Status>({ status: "connecting", qr: null, error: null, keyReady: false, storageConfigured: false });
  const reloading = useRef(false);
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const response = await fetch("/api/status", { cache: "no-store", headers: apiKey ? { "x-api-key": apiKey } : {} });
        if (response.status === 401 && !apiKey && !reloading.current) {
          reloading.current = true;
          window.location.reload();
          return;
        }
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || "Server unavailable");
        }
        const data: Status = await response.json();
        if (!active) return;
        setStatus(data);
        if (data.status === "connected" && data.keyReady && !apiKey && !reloading.current) {
          reloading.current = true;
          window.location.reload();
        }
      } catch (error) {
        if (active) setStatus(previous => ({ ...previous, status: "disconnected", qr: null, error: error instanceof Error ? error.message : "Cannot reach the server. Retrying…" }));
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 3000);
    return () => { active = false; clearInterval(timer); };
  }, [apiKey]);

  const connected = status.status === "connected";
  return <div className="console-app">
    <header className="console-header"><div className="header-inner"><Link href="/" className="logo"><span className="logo-icon"><MessageCircle size={19} /></span> sendwell<span className="logo-period">.</span></Link><nav className="header-nav" aria-label="Main navigation"><Link href="/" className="nav-current">Overview</Link><Link href="/docs">API Docs</Link></nav><div className={`header-indicator ${connected ? "is-online" : ""}`}><span className="indicator-dot" />{connected ? "Connected" : "Not connected"}</div></div></header>
    <main className="console-main"><div className="page-top"><div className="overline">WHATSAPP API CONSOLE</div><h1>Overview</h1><p>Connect your WhatsApp account and use your API key to send media to groups.</p></div>
      <div className="console-grid"><section className="simple-card status-card"><div className="card-title-row"><div className="card-heading"><span className="card-icon"><Smartphone size={20} /></span><div><h2>WhatsApp Status</h2><p>Your linked WhatsApp Web session</p></div></div><span className={`state-pill ${connected ? "pill-connected" : status.status === "qr" ? "pill-pending" : ""}`}><span className="indicator-dot" />{connected ? "Connected" : status.status === "qr" ? "Scan QR code" : "Connecting"}</span></div>
      {connected ? <div className="connected-body"><div className="success-symbol"><CheckCircle2 size={32} /></div><h3>You’re connected</h3><p>Your WhatsApp session is active. You won’t need to scan again unless the session is logged out.</p><div className="session-line"><span>Session ID</span><strong>Saurabh</strong></div></div> : <div className="connect-body"><div className="qr-box">{status.qr ? <img src={status.qr} alt="WhatsApp Web login QR code" /> : <div className="qr-loading"><LoaderCircle size={31} className="spin" /><span>Preparing QR code…</span></div>}</div><h3>Scan with WhatsApp</h3><p>On your phone, go to <strong>Settings → Linked devices → Link a device</strong>, then scan this QR code.</p>{status.error && <div className="alert-line"><CircleAlert size={16} />{status.error}</div>}</div>}</section>
      <section className="simple-card key-card"><div className="card-title-row"><div className="card-heading"><span className="card-icon"><KeyRound size={20} /></span><div><h2>API Key</h2><p>Use this key in the x-api-key header</p></div></div></div><div className="key-content"><label htmlFor="api-key-value">YOUR API KEY</label><div className="key-field"><input id="api-key-value" readOnly value={connected ? apiKey ?? "" : ""} placeholder={connected ? "Preparing your key…" : "Available once WhatsApp is connected"} /><CopyButton text={connected ? apiKey ?? "" : ""} label="Copy key" /></div><p className="key-hint"><ShieldCheck size={16} />Generated once and saved in Supabase. Keep this key secret.</p>{(keyError || (connected && status.error)) && <div className="alert-line"><CircleAlert size={16} />{keyError || status.error}</div>}{connected && !status.storageConfigured && !keyError && <div className="alert-line"><CircleAlert size={16} />Set up Supabase using supabase/setup.sql and .env.local. See README.md.</div>}</div><div className="card-footer"><span><Terminal size={17} /> Ready to make a request?</span><Link href="/docs">View API docs <ArrowRight size={16} /></Link></div></section></div>
      <div className="bottom-note">A minimal API console for one WhatsApp session. Keep this portal on a private network.</div>
    </main>
  </div>;
}
