// 'use client';

// import { Intent, IntentOption } from '@/lib/types';
// import { INTENT_OPTIONS } from '@/lib/intentMap';

// interface Props {
//   onSelect: (intent: Intent) => void;
// }

// export default function IntentPicker({ onSelect }: Props) {
//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: 'var(--bg)' }}>
//       <div className="mb-12 text-center">
//         <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
//           KeyBridge
//         </span>
//         <h1 className="mt-4 text-4xl font-semibold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
//           What do you want to build?
//         </h1>
//         <p className="mt-3 text-base max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
//           Pick a goal and we'll guide you to the right key — no technical knowledge needed.
//         </p>
//       </div>

//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
//         {INTENT_OPTIONS.map((opt: IntentOption) => (
//           <button
//             key={opt.id}
//             onClick={() => onSelect(opt.id)}
//             className="group relative text-left rounded-xl p-5 focus:outline-none transition-all duration-200"
//             style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
//             onMouseEnter={e => {
//               (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
//               (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)';
//             }}
//             onMouseLeave={e => {
//               (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
//               (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)';
//             }}
//           >
//             <div className="text-2xl mb-3">{opt.icon}</div>
//             <div className="font-medium text-base mb-1" style={{ color: 'var(--text-primary)' }}>{opt.label}</div>
//             <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{opt.description}</div>
//             <div className="mt-4 text-sm font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
//               Get started <span>→</span>
//             </div>
//           </button>
//         ))}
//       </div>

//       <p className="mt-10 text-xs text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
//         Your API key is encrypted and never shared. You can remove it any time.
//       </p>
//     </div>
//   );
// }

// ----------------------------------------------------


'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Intent, ProviderId } from '@/lib/types';
import {
  INTENT_OPTIONS,
  INTENT_TO_PROVIDERS,
  INTENT_COLORS,
  PROVIDER_META,
  QUIZ_CONFIG,
  ROLE_OPTIONS,
  ROLE_LABELS,
  QuizRole,
} from '@/lib/intentMap';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconChat({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconImage({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconSpeech({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconSearch({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconArrow({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const INTENT_ICON_MAP: Record<Intent, (color: string) => React.ReactNode> = {
  chat:       (c) => <IconChat color={c} />,
  image:      (c) => <IconImage color={c} />,
  speech:     (c) => <IconSpeech color={c} />,
  embeddings: (c) => <IconSearch color={c} />,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntentPicker() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<QuizRole | null>(null);
  const [selectedGoalIdx, setSelectedGoalIdx] = useState<number | null>(null);
  const [openIntent, setOpenIntent] = useState<Intent | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null);
  const [hoveredCard, setHoveredCard] = useState<Intent | null>(null);

  const goalConfig = selectedRole ? QUIZ_CONFIG[selectedRole] : null;
  const selectedGoal = goalConfig && selectedGoalIdx !== null ? goalConfig.opts[selectedGoalIdx] : null;
  const highlightedIntents: Intent[] = selectedGoal ? selectedGoal.intents : [];
  const recommendedProvider: ProviderId | null = selectedGoal?.rec ?? null;

  function handlePickRole(role: QuizRole) {
    setSelectedRole(role);
    setSelectedGoalIdx(null);
    setOpenIntent(null);
    setSelectedProvider(null);
  }

  function handlePickGoal(idx: number) {
    setSelectedGoalIdx(idx);
    setOpenIntent(null);
    setSelectedProvider(null);
  }

  function handleToggleCard(intent: Intent) {
    if (highlightedIntents.length > 0 && !highlightedIntents.includes(intent)) return;
    if (openIntent === intent) return;
    setOpenIntent(intent);
    // Auto-select if only one provider
    const providers = INTENT_TO_PROVIDERS[intent];
    setSelectedProvider(providers.length === 1 ? providers[0] : null);
  }

  function handleCloseCard(e: React.MouseEvent) {
    e.stopPropagation();
    setOpenIntent(null);
    setSelectedProvider(null);
  }

  function handlePickProvider(e: React.MouseEvent, provider: ProviderId) {
    e.stopPropagation();
    setSelectedProvider(provider);
  }

  function handleContinue(e: React.MouseEvent) {
    e.stopPropagation();
    if (!openIntent || !selectedProvider) return;
    router.push(`/connect/${selectedProvider}?intent=${openIntent}`);
  }

  function resetRole(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedRole(null);
    setSelectedGoalIdx(null);
    setOpenIntent(null);
    setSelectedProvider(null);
  }

  const step1Done = selectedRole !== null;
  const step2Done = selectedGoal !== null;
  const step3Active = openIntent !== null;

  const steps = [
    { num: '1', label: 'Pick your goal',      sub: 'Two quick questions to find the right fit.', done: step1Done,  active: !step1Done },
    { num: '2', label: 'Choose a provider',   sub: "We'll highlight the best option for you.",   done: step3Active, active: step1Done && !step3Active },
    { num: '3', label: 'Get and validate',    sub: 'Paste your key — we test and store it safely.', done: false,   active: step3Active },
  ];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.75rem', height: '50px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75' }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>KeyBridge</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => router.push('/how-we-protect-your-keys')}
            style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '999px', border: '0.5px solid var(--border)', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            How it works
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ fontSize: '12px', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: '999px', border: '0.5px solid var(--border-strong)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* Main */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Left panel */}
        <div style={{ width: '260px', flexShrink: 0, padding: '1.75rem', borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '19px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: '6px' }}>
              Connect your AI key in minutes
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              Answer two quick questions and we'll point you to the right provider.
            </p>
          </div>

          {/* Step tracker */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '9px 0', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontFamily: 'monospace', flexShrink: 0, marginTop: '1px', transition: 'all 0.2s',
                  background: s.done ? '#1D9E75' : 'transparent',
                  border: s.done ? 'none' : `0.5px solid ${s.active ? '#1D9E75' : 'var(--border-strong)'}`,
                  color: s.done ? '#fff' : s.active ? '#1D9E75' : 'var(--text-muted)',
                }}>
                  {s.done ? '✓' : s.num}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '1px', fontSize: '12px' }}>{s.label}</div>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: 'auto', paddingTop: '1rem', borderTop: '0.5px solid var(--border)' }}>
            {[
              { icon: '🔒', text: 'AES-256 encrypted at rest' },
              { icon: '🚫', text: 'Never logged or shared' },
              { icon: '💻', text: 'Local-only storage option' },
              { icon: '📖', text: 'Open source — audit any time' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '12px', width: '16px', textAlign: 'center' }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>

          {/* Quiz */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Progress bar */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              {[step1Done, step2Done].map((done, i) => (
                <div key={i} style={{ height: '3px', flex: 1, borderRadius: '999px', background: done ? '#1D9E75' : 'var(--border)', transition: 'background 0.3s' }} />
              ))}
            </div>

            {/* Step 1: Role */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span>Who is this for?</span>
                {selectedRole && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px', background: '#E1F5EE', color: '#085041' }}>
                    {ROLE_LABELS[selectedRole]}
                    <button onClick={resetRole} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0F6E56', fontSize: '13px', padding: 0, lineHeight: 1 }}>✕</button>
                  </span>
                )}
              </div>
              {!selectedRole && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ROLE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handlePickRole(opt.id)}
                      style={{ fontSize: '12px', padding: '6px 13px', borderRadius: '999px', border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                    >
                      <span style={{ marginRight: '5px' }}>{opt.icon}</span>{opt.label}
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{opt.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Goal (shown after role selected) */}
            {selectedRole && goalConfig && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>then</span>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {goalConfig.question}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {goalConfig.opts.map((opt, idx) => {
                    const isSelected = selectedGoalIdx === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handlePickGoal(idx)}
                        style={{
                          fontSize: '12px', padding: '6px 13px', borderRadius: '999px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                          border: isSelected ? '0.5px solid #1D9E75' : '0.5px solid var(--border)',
                          background: isSelected ? '#E1F5EE' : 'var(--surface)',
                          color: isSelected ? '#085041' : 'var(--text-secondary)',
                        }}
                      >
                        {opt.label}
                        {opt.sub && <span style={{ display: 'block', fontSize: '10px', color: isSelected ? '#0F6E56' : 'var(--text-muted)', marginTop: '1px' }}>{opt.sub}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Grid label */}
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {highlightedIntents.length > 0 ? 'Recommended for you' : 'Choose your goal'}
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
          </div>

          {/* Recommendation banner */}
          {selectedGoal?.banner && (
            <div style={{ fontSize: '11px', color: '#1D9E75', background: '#E1F5EE', borderRadius: '6px', padding: '5px 10px', marginBottom: '0.75rem' }}>
              💡 {selectedGoal.banner}
            </div>
          )}

          {/* Card grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
            {INTENT_OPTIONS.map(opt => {
              const colors = INTENT_COLORS[opt.id];
              const providers = INTENT_TO_PROVIDERS[opt.id];
              const isDimmed = highlightedIntents.length > 0 && !highlightedIntents.includes(opt.id);
              const isOpen = openIntent === opt.id;
              const isHovered = hoveredCard === opt.id;

              const borderColor = isOpen || isHovered ? colors.borderHover : 'var(--border)';

              return (
                <div
                  key={opt.id}
                  onClick={() => handleToggleCard(opt.id)}
                  onMouseEnter={() => !isDimmed && setHoveredCard(opt.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: 'var(--surface)',
                    border: `0.5px solid ${borderColor}`,
                    borderRadius: '12px',
                    cursor: isDimmed ? 'default' : isOpen ? 'default' : 'pointer',
                    opacity: isDimmed ? 0.3 : 1,
                    transform: isDimmed ? 'scale(0.97)' : 'scale(1)',
                    transition: 'opacity 0.3s, transform 0.3s, border-color 0.15s',
                    overflow: 'hidden',
                    pointerEvents: isDimmed ? 'none' : 'auto',
                  }}
                >
                  {/* Card face */}
                  <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', minHeight: '148px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: colors.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {INTENT_ICON_MAP[opt.id](colors.iconText)}
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 7px', borderRadius: '999px', background: colors.badgeBg, color: colors.badgeText }}>
                        {providers.length} provider{providers.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{opt.description}</div>
                    {!isOpen && (
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px', color: colors.cta, opacity: isHovered ? 1 : 0, transform: isHovered ? 'translateX(0)' : 'translateX(-4px)', transition: 'opacity 0.15s, transform 0.15s' }}>
                        <IconArrow color={colors.cta} /> Choose provider
                      </div>
                    )}
                  </div>

                  {/* Expanded provider picker */}
                  {isOpen && (
                    <div style={{ borderTop: '0.5px solid var(--border)', padding: '0.9rem 1.1rem 1.1rem' }}>
                      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Select a provider
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {providers.map(pid => {
                          const meta = PROVIDER_META[pid];
                          const isPicked = selectedProvider === pid;
                          const isRec = recommendedProvider === pid;
                          return (
                            <div
                              key={pid}
                              onClick={(e) => handlePickProvider(e, pid)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                                border: isPicked ? '0.5px solid #1D9E75' : '0.5px solid var(--border)',
                                background: isPicked ? '#E1F5EE' : 'var(--bg)',
                              }}
                              onMouseEnter={e => { if (!isPicked) { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)'; } }}
                              onMouseLeave={e => { if (!isPicked) { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; } }}
                            >
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', fontWeight: 500, color: isPicked ? '#085041' : 'var(--text-primary)', flex: 1 }}>{meta.label}</span>
                              {isRec && !isPicked && (
                                <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '999px', background: '#E1F5EE', color: '#085041', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                  Recommended
                                </span>
                              )}
                              <span style={{ fontSize: '11px', color: isPicked ? '#0F6E56' : 'var(--text-muted)' }}>{meta.model}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                        <button
                          onClick={handleContinue}
                          disabled={!selectedProvider}
                          style={{
                            fontSize: '12px', padding: '6px 14px', borderRadius: '8px', background: '#1D9E75', color: '#fff', border: 'none',
                            cursor: selectedProvider ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 500,
                            opacity: selectedProvider ? 1 : 0.35, transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={e => { if (selectedProvider) (e.currentTarget as HTMLButtonElement).style.background = '#0F6E56'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1D9E75'; }}
                        >
                          Continue →
                        </button>
                        <button
                          onClick={handleCloseCard}
                          style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', background: 'none', color: 'var(--text-secondary)', border: '0.5px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '0.5px solid var(--border)', padding: '0.75rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Your key is encrypted and never shared. Remove it any time from the dashboard.
        </p>
        <a href="/how-we-protect-your-keys" style={{ fontSize: '11px', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}>
          How we protect your key →
        </a>
      </div>
    </div>
  );
}