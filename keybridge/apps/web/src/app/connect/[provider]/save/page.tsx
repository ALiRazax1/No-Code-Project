'use client';

import { use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StorageChoice from '@/components/wizard/StorageChoice';
import { ProviderId, StorageMode } from '@/lib/types';

interface Props {
  params: Promise<{ provider: string }>;
}

export default function SavePage({ params }: Props) {
  const { provider } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent') ?? 'chat';

  // Guard: if there is no pending key (e.g. user navigated here directly),
  // send them back to the start rather than showing a broken state.
  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('kb_pending_key')) {
      router.replace('/');
    }
  }, [router]);

  async function handleConfirm(mode: StorageMode) {
    const key = sessionStorage.getItem('kb_pending_key');
    if (!key) { router.replace('/'); return; }

    if (mode === 'cloud') {
      await fetch('/api/keys/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, providerId: provider }),
      });
    } else {
      // Local-only: encrypt in browser, store in IndexedDB, never sent to server
      const { storeKeyLocally } = await import('@/lib/localVault');
      await storeKeyLocally({
        userId: 'usr_mock',
        providerId: provider as ProviderId,
        plaintextKey: key,
      });
    }

    // SECURITY: clear the plaintext key from sessionStorage immediately
    sessionStorage.removeItem('kb_pending_key');
    sessionStorage.removeItem('kb_pending_provider');

    router.push(`/connect/${provider}/done?mode=${mode}&intent=${intent}`);
  }

  return (
    <StorageChoice
      providerId={provider as ProviderId}
      onConfirm={handleConfirm}
    />
  );
}