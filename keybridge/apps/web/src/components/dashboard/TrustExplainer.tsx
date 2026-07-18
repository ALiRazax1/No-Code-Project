/**
 * TrustExplainer — plain-language security explainer block.
 *
 * SPEC REQUIREMENT (Track 4): "Plain-language 'how we protect your key'
 * explainer block on the same screen."
 *
 * Copy is intentionally non-technical. It describes what we do and what we
 * don't, matching the non-negotiable rules from spec section 2.
 */
export function TrustExplainer() {
  return (
    <section className="trust-block" aria-labelledby="trust-heading">
      <div className="trust-header">
        <LockIcon />
        <h2 id="trust-heading" className="trust-title">
          How your keys are protected
        </h2>
      </div>

      <div className="trust-grid">
        <TrustItem
          icon={<ShieldIcon />}
          heading="Encrypted before they leave your browser"
          body="Cloud-stored keys are encrypted with AES-256-GCM — the same standard banks use — before being sent to our servers. We hold the ciphertext; only you can decrypt it."
        />
        <TrustItem
          icon={<SplitIcon />}
          heading="Your encryption key is never stored with your API key"
          body="We derive a separate encryption key from your account. It lives in a different place from the encrypted data, so even a database leak can't expose your API keys."
        />
        <TrustItem
          icon={<DeviceOnlyIcon />}
          heading="Local-only mode sends nothing to us"
          body={`If you chose "Keep on this device," your key is encrypted locally in your browser's storage and never transmitted to KeyBridge's servers — not even once.`}
        />
        <TrustItem
          icon={<NoProxyIcon />}
          heading="We never use your key on your behalf"
          body="KeyBridge makes exactly one call to the provider when you validate a key. After that, only the tool you connected can retrieve it — and only when you trigger it."
        />
      </div>

      <p className="trust-footer">
        KeyBridge is open source.{" "}
        <a
          href="https://github.com/keybridge"
          className="trust-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read the security module source code
        </a>{" "}
        or our{" "}
        <a href="/security" className="trust-link">
          full security writeup
        </a>
        .
      </p>
    </section>
  );
}

function TrustItem({
  icon,
  heading,
  body,
}: {
  icon: React.ReactNode;
  heading: string;
  body: string;
}) {
  return (
    <div className="trust-item">
      <div className="trust-item-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <h3 className="trust-item-heading">{heading}</h3>
        <p className="trust-item-body">{body}</p>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 3h5v5M8 3H3v5M3 21h5M16 21h5v-5M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeviceOnlyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function NoProxyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M4.93 4.93l14.14 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
