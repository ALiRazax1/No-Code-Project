"use client";

import { useState, useCallback, useEffect } from "react";
import { EnrichedKey } from "@/lib/dashboard/types";
import { deleteKey } from "@/lib/dashboard/clientActions";
import { KeyCard } from "./KeyCard";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { TrustExplainer } from "./TrustExplainer";

type LoadState = "ready" | "error";

interface Props {
  initialKeys: EnrichedKey[];
}

export function SecurityDashboard({ initialKeys }: Props) {
  const [keys, setKeys] = useState<EnrichedKey[]>(initialKeys);
  const [loadState, setLoadState] = useState<LoadState>("ready");
  const [pendingDelete, setPendingDelete] = useState<EnrichedKey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRemoveRequest = useCallback((key: EnrichedKey) => {
    setPendingDelete(key);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      if (pendingDelete.storage_mode === 'local') {
  const { deleteLocalKey }: any = await import('@/lib/localVault');
  await deleteLocalKey(pendingDelete.id);
} else {
  await deleteKey(pendingDelete.id);
}
      setKeys((prev) => prev.filter((k) => k.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch {
      setLoadState("error");
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDelete]);

  const handleDeleteCancel = useCallback(() => {
    if (!isDeleting) setPendingDelete(null);
  }, [isDeleting]);

  useEffect(() => {
  async function mergeLocalKeys() {
    const { listLocalKeys } = await import('@/lib/localVault');
    const localKeys = await listLocalKeys();
    const { getProvider } = await import('@keybridge/validation');

    const enriched = localKeys.map((k) => {
      const provider = getProvider(k.provider_id);
      return {
        id: k.id,
        user_id: k.user_id,
        provider_id: k.provider_id,
        storage_mode: 'local' as const,
        encrypted_key: null,
        last_validated_at: null,
        last_used_at: null,
        status: 'active' as const,
        created_at: new Date(k.created_at),
        provider: provider
          ? { name: provider.name, key_page_url: provider.key_page_url }
          : { name: k.provider_id, key_page_url: '#' },
      };
    });

    if (enriched.length > 0) {
      // @ts-ignore
      setKeys((prev) => {
        const existingIds = new Set(prev.map((k) => k.id));
        const newKeys = enriched.filter((k) => !existingIds.has(k.id));
        return [...prev, ...newKeys];
      });
    }
  }
  mergeLocalKeys();
}, []);
  

  return (
    <>
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="dashboard-header-inner">
            <div>
              <h1 className="dashboard-title">Connected keys</h1>
              <p className="dashboard-subtitle">
                {loadState === "ready"
                  ? keys.length === 0
                    ? "No keys connected yet."
                    : `${keys.length} key${keys.length === 1 ? "" : "s"} connected`
                  : "\u00A0"}
              </p>
            </div>
            <a href="/" className="btn btn-primary">
              Add a key
            </a>
          </div>
        </header>

        <main className="dashboard-main">
          {loadState === "error" && (
            <div className="state-error" role="alert">
              <p>Couldn't delete key — please try again.</p>
            </div>
          )}

          {loadState === "ready" && keys.length === 0 && (
            <div className="state-empty">
              <EmptyIllustration />
              <p className="empty-heading">No keys connected yet</p>
              <p className="empty-body">
                Add your first API key and it'll appear here.
              </p>
              <a href="/" className="btn btn-primary">
                Add a key
              </a>
            </div>
          )}

          {loadState === "ready" && keys.length > 0 && (
            <ul className="key-list" aria-label="Connected API keys">
              {keys.map((key) => (
                <li key={key.id}>
                  <KeyCard connectedKey={key} onRemove={handleRemoveRequest} />
                </li>
              ))}
            </ul>
          )}

          {loadState === "ready" && <TrustExplainer />}
        </main>
      </div>

      {pendingDelete && (
        <DeleteConfirmModal
          keyToDelete={pendingDelete}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </>
  );
}

function EmptyIllustration() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      aria-hidden="true"
      className="empty-icon"
    >
      <rect x="12" y="28" width="48" height="32" rx="6" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M24 28V22a12 12 0 0124 0v6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="36" cy="44" r="4" fill="currentColor" opacity="0.4" />
      <path d="M36 48v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

