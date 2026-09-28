"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleAlert, FileUp, KeyRound, List, MessageCircle, Send, Terminal } from "lucide-react";
import CopyButton from "./CopyButton";

function CodeBlock({ title, code }: { title: string; code: string }) {
  return <div className="code-section"><div className="code-header"><span>{title}</span><CopyButton text={code} label="Copy" className="code-copy" /></div><pre><code>{code}</code></pre></div>;
}

export default function ApiDocs({ apiKey }: { apiKey: string | null }) {
  const [origin, setOrigin] = useState("http://localhost:3001");
  useEffect(() => setOrigin(window.location.origin), []);
  const key = apiKey || "YOUR_API_KEY";
  const slash = String.fromCharCode(92);
  const sendCurl = [
    `curl -X POST "${origin}/api/send-media-group" ${slash}`,
    `  -H "x-api-key: ${key}" ${slash}`,
    `  -F "sessionId=Saurabh" ${slash}`,
    `  -F "groupName=MIS Reports" ${slash}`,
    `  -F "caption=Client Wise SLA Report - 28 Sep 2026" ${slash}`,
    `  -F "file=@./sla_report.svg"`,
  ].join("\n");
  const groupsCurl = [`curl -X GET "${origin}/api/groups" ${slash}`, `  -H "x-api-key: ${key}"`].join("\n");
  const uploadCurl = [`curl -X POST "${origin}/api/upload" ${slash}`, `  -H "x-api-key: ${key}" ${slash}`, `  -F "file=@./report.xlsx"`].join("\n");
  return <div className="console-app"><header className="console-header"><div className="header-inner"><Link href="/" className="logo"><span className="logo-icon"><MessageCircle size={19} /></span> sendwell<span className="logo-period">.</span></Link><nav className="header-nav" aria-label="Main navigation"><Link href="/">Overview</Link><Link href="/docs" className="nav-current">API Docs</Link></nav><div className="header-indicator docs-indicator"><Terminal size={15} /> API Reference</div></div></header>
    <main className="console-main docs-main"><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to overview</Link><div className="page-top"><div className="overline">DEVELOPER REFERENCE</div><h1>API Documentation</h1><p>Everything you need to send media through your linked WhatsApp session.</p></div>
      <div className="docs-callout"><KeyRound size={19} /><div><strong>Authentication</strong><p>Include your API key in the <code>x-api-key</code> header for groups, upload, and send requests. {apiKey ? "Your saved key is prefilled in the examples below." : "Connect WhatsApp on the overview page first to generate your key."} Keep your key private.</p></div><Link href="/">View key <ArrowRight size={15} /></Link></div>
      <section className="doc-card" id="send"><div className="doc-heading"><span className="doc-icon"><Send size={20} /></span><div><div className="endpoint-line"><span className="method post">POST</span><h2>/api/send-media-group</h2></div><p>Send a file directly to a WhatsApp group by name in a single request. Supabase upload is not needed.</p></div></div><div className="doc-body"><h3>Request headers</h3><div className="param-table"><div><code>x-api-key</code><span>Required · Your saved API key</span></div><div><code>Content-Type</code><span>multipart/form-data · Automatically set by cURL or UrlFetchApp</span></div></div><h3>Multipart form fields</h3><div className="param-table"><div><code>sessionId</code><span>Required · Saurabh</span></div><div><code>groupName</code><span>Required · WhatsApp group name (case-insensitive)</span></div><div><code>caption</code><span>Optional · Text up to 1024 characters</span></div><div><code>file</code><span>Required · PDF, XLSX, CSV, PNG, JPG or SVG · Max 25 MB</span></div></div><CodeBlock title="cURL example" code={sendCurl} /><CodeBlock title="Success response · 200 OK" code={JSON.stringify({ success: true, message: "Media sent successfully.", groupName: "MIS Reports", fileName: "sla_report.svg" }, null, 2)} /><CodeBlock title="Group not found · 404" code={JSON.stringify({ success: false, message: "WhatsApp group 'MIS Reports' not found in the connected account." }, null, 2)} /></div></section>
      <div className="docs-secondary"><section className="doc-card"><div className="doc-heading"><span className="doc-icon"><List size={20} /></span><div><div className="endpoint-line"><span className="method get">GET</span><h2>/api/groups</h2></div><p>List groups from the connected account.</p></div></div><div className="doc-body"><CodeBlock title="cURL example" code={groupsCurl} /><p className="doc-footnote">Returns group names such as <code>MIS Reports</code>. The send endpoint finds the internal group ID for you.</p></div></section><section className="doc-card"><div className="doc-heading"><span className="doc-icon"><FileUp size={20} /></span><div><div className="endpoint-line"><span className="method post">POST</span><h2>/api/upload</h2></div><p>Optional standalone upload to Supabase Storage; not needed for sending.</p></div></div><div className="doc-body"><CodeBlock title="cURL example" code={uploadCurl} /><p className="doc-footnote">Multipart field: <code>file</code>. PDF, XLSX, CSV, PNG, JPG, up to 25 MB. For sending, pass the file directly to <code>/api/send-media-group</code> instead.</p></div></section></div>
      <div className="docs-bottom"><CircleAlert size={16} /> Before the first link, <code>GET /api/status</code> serves the QR without a key. Once a key exists, status also requires <code>x-api-key</code>. Protect this console with network access control.</div>
    </main></div>;
}
