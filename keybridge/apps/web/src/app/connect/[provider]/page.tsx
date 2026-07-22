'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GuidancePanel from '@/components/wizard/GuidancePanel';
import { ProviderId, Intent, ValidationResult } from '@/lib/types';

interface Props {
  params: Promise<{ provider: string }>;
}

export default function ConnectPage({ params }: Props) {
  const { provider } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = (searchParams.get('intent') ?? 'chat') as Intent;

  function handleValidated(key: string, _result: ValidationResult) {
    // SECURITY: key held briefly in sessionStorage only to cross the page
    // boundary — never in the URL, never logged. Cleared immediately after use.
    sessionStorage.setItem('kb_pending_key', key);
    sessionStorage.setItem('kb_pending_provider', provider);
    router.push(`/connect/${provider}/save?intent=${intent}`);
  }

  return (
    <GuidancePanel
      providerId={provider as ProviderId}
      intent={intent}
      onValidated={handleValidated}
    />
  );
}