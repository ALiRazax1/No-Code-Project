'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SuccessScreen from '@/components/wizard/SuccessScreen';
import { ProviderId, StorageMode } from '@/lib/types';

interface Props {
  params: Promise<{ provider: string }>;
}

export default function DonePage({ params }: Props) {
  const { provider } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') ?? 'cloud') as StorageMode;

  return (
    <SuccessScreen
      providerId={provider as ProviderId}
      storageMode={mode}
      onGoToDashboard={() => router.push('/dashboard')}
      onConnectAnother={() => router.push('/')}
    />
  );
}