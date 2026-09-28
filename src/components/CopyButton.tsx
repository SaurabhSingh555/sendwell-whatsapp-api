"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyButton({ text, label = "Copy", className = "copy-button" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return <button type="button" className={className} onClick={() => void copy()} disabled={!text} aria-label={`Copy ${label.toLowerCase()}`}>
    {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : label}
  </button>;
}
