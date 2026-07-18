'use client';

import { useState } from 'react';
import { Intent, ProviderId, StorageMode, ValidationResult, WizardStep } from '@/lib/types';
import { INTENT_TO_PROVIDER } from '@/lib/intentMap';
import IntentPicker from './IntentPicker';
import GuidancePanel from './GuidancePanel';
import StorageChoice from './StorageChoice';
import SuccessScreen from './SuccessScreen';

/**
 * WizardOrchestrator
 *
 * Manages the full onboarding flow for Track 3:
 *   intent → guidance/paste → storage choice → done
 *
 * Keeps all wizard state here so child components are stateless
 * and individually testable. State is never lost — no page
 * navigations happen during the flow. (spec §4)
 */
export default function WizardOrchestrator() {
  const [step, setStep] = useState<WizardStep>('intent');
  const [intent, setIntent] = useState<Intent | null>(null);
  const [providerId, setProviderId] = useState<ProviderId | null>(null);
  const [validatedKey, setValidatedKey] = useState<string>('');
  const [storageMode, setStorageMode] = useState<StorageMode>('cloud');

  function handleIntentSelect(chosen: Intent) {
    const provider = INTENT_TO_PROVIDER[chosen];
    setIntent(chosen);
    setProviderId(provider);
    setStep('guidance');
  }

  function handleValidated(key: string, _result: ValidationResult) {
    // SECURITY: we hold the key in memory briefly to hand it to Track 1
    // for encryption. We never log it. (spec §2)
    setValidatedKey(key);
    setStep('storage');
  }

  async function handleStorageConfirm(mode: StorageMode) {
  setStorageMode(mode);

  if (mode === 'cloud') {
    await fetch('/api/keys/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: validatedKey, providerId }),
    });
  } else {
    // Local-only: encrypt in browser, store in IndexedDB, never sent to server
   const { storeKeyLocally } = await import('@/lib/localVault');
  await storeKeyLocally({
    userId: 'usr_mock',
    providerId: providerId!,
    plaintextKey: validatedKey,
  });
  }

  setStep('done');
}

  function handleGoToDashboard() {
  window.location.href = '/dashboard';
}

  function handleReset() {
    setStep('intent');
    setIntent(null);
    setProviderId(null);
    setValidatedKey('');
    setStorageMode('cloud');
  }

  // Guard: if somehow we reach guidance/storage/done without a provider,
  // fall back to intent screen. This should not happen in normal flow.
  if ((step === 'guidance' || step === 'storage' || step === 'done') && !providerId) {
    return <IntentPicker onSelect={handleIntentSelect} />;
  }

  switch (step) {
    case 'intent':
      return <IntentPicker onSelect={handleIntentSelect} />;

    case 'guidance':
      return (
        <GuidancePanel
          providerId={providerId!}
          intent={intent!}
          onValidated={handleValidated}
        />
      );

    case 'storage':
      return (
        <StorageChoice
          providerId={providerId!}
          onConfirm={handleStorageConfirm}
        />
      );

    case 'done':
      return (
        <SuccessScreen
          providerId={providerId!}
          storageMode={storageMode}
          onGoToDashboard={handleGoToDashboard}
          onConnectAnother={handleReset}
        />
      );
  }
}
