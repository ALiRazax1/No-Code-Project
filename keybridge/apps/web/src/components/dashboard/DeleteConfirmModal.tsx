"use client";

import { useEffect, useRef } from "react";
import { EnrichedKey } from "@/lib/dashboard/types";

interface DeleteConfirmModalProps {
  keyToDelete: EnrichedKey;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  keyToDelete,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button by default — safer UX for a destructive action
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isDeleting, onCancel]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div className="modal-panel">
        <div className="modal-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 id="modal-title" className="modal-title">
          Remove {keyToDelete.provider.name} key?
        </h2>

        <p className="modal-body">
          This permanently removes your{" "}
          <strong>{keyToDelete.provider.name}</strong> key from KeyBridge.
          {keyToDelete.storage_mode === "cloud"
            ? " It will be deleted from our servers immediately and cannot be recovered."
            : " It will be erased from this device immediately and cannot be recovered."}
        </p>

        <p className="modal-body modal-hint">
          Your API key itself remains valid on {keyToDelete.provider.name}'s
          side — you can re-add it any time, or revoke it from your{" "}
          <a
            href={keyToDelete.provider.key_page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="modal-link"
          >
            {keyToDelete.provider.name} account
          </a>
          .
        </p>

        <div className="modal-actions">
          <button
            ref={cancelRef}
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Keep it
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-busy={isDeleting}
          >
            {isDeleting ? (
              <span className="btn-loading">
                <span className="spinner" aria-hidden="true" />
                Removing…
              </span>
            ) : (
              "Yes, remove it"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
