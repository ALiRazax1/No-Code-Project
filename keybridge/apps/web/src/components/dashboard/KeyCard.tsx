"use client";

import { EnrichedKey } from "@/lib/dashboard/types";

interface KeyCardProps {
  connectedKey: EnrichedKey;
  onRemove: (key: EnrichedKey) => void;
}

/** Provider accent colors — used only for the left-edge indicator bar */
const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10A37F",
  anthropic: "#D97757",
  google_gemini: "#4285F4",
  elevenlabs: "#9B59B6",
  openrouter: "#FF6B35",
};

function formatLastUsed(iso: string | null): string {
  if (!iso) return "Never used";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatValidated(iso: string | null): string {
  if (!iso) return "Not yet validated";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KeyCard({ connectedKey: ck, onRemove }: KeyCardProps) {
  const accentColor = PROVIDER_COLORS[ck.provider_id] ?? "#3B5BDB";

  return (
    <article className="key-card" aria-label={`${ck.provider.name} API key`}>
      {/* Left accent bar — the signature visual element */}
      <div
        className="key-card-accent"
        style={{ "--accent": accentColor } as React.CSSProperties}
        aria-hidden="true"
      />

      <div className="key-card-body">
        {/* Header row */}
        <div className="key-card-header">
          <div className="key-card-provider">
            <span className="provider-name">{ck.provider.name}</span>
            <span
              className={`storage-badge storage-badge--${ck.storage_mode}`}
              title={
                ck.storage_mode === "cloud"
                  ? "Stored encrypted on KeyBridge servers"
                  : "Stored only on this device"
              }
            >
              {ck.storage_mode === "cloud" ? (
                <>
                  <CloudIcon />
                  Cloud
                </>
              ) : (
                <>
                  <DeviceIcon />
                  This device
                </>
              )}
            </span>
          </div>

          <button
            className="btn btn-remove"
            onClick={() => onRemove(ck)}
            aria-label={`Remove ${ck.provider.name} key`}
          >
            Remove
          </button>
        </div>

        {/* Meta row */}
        <div className="key-card-meta">
          <span className="meta-item">
            <span className="meta-label">Last used</span>
            <span className="meta-value mono">{formatLastUsed(ck.last_used_at)}</span>
          </span>
          <span className="meta-divider" aria-hidden="true" />
          <span className="meta-item">
            <span className="meta-label">Validated</span>
            <span className="meta-value mono">{formatValidated(ck.last_validated_at)}</span>
          </span>
          <span className="meta-divider" aria-hidden="true" />
          <span className="meta-item">
            <span className="meta-label">Status</span>
            <span className={`status-dot status-dot--${ck.status}`} aria-hidden="true" />
            <span className="meta-value">{ck.status}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

function CloudIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
