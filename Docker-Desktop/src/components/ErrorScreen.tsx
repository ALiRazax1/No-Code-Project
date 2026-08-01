// import { useState } from 'react';
// import { AlertTriangle, Copy, Check, RefreshCw } from 'lucide-react';

// interface Props {
//   onRetry: () => void;
//   retrying: boolean;
// }

// const COMMAND = 'wsl -d Ubuntu -u root service docker start';

// export default function ErrorScreen({ onRetry, retrying }: Props) {
//   const [copied, setCopied] = useState(false);

//   const copyCommand = async () => {
//     try {
//       await navigator.clipboard.writeText(COMMAND);
//       setCopied(true);
//       setTimeout(() => setCopied(false), 1800);
//     } catch {
//       // Fallback for non-secure contexts
//       const ta = document.createElement('textarea');
//       ta.value = COMMAND;
//       document.body.appendChild(ta);
//       ta.select();
//       document.execCommand('copy');
//       document.body.removeChild(ta);
//       setCopied(true);
//       setTimeout(() => setCopied(false), 1800);
//     }
//   };

//   return (
//     <div className="flex h-full w-full items-center justify-center bg-mica-950 px-6">
//       <div className="w-full max-w-xl animate-fade-in rounded-2xl border border-mica-700 bg-mica-850/80 p-8 shadow-2xl backdrop-blur-md">
//         <div className="mb-6 flex items-center gap-3">
//           <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warn-soft">
//             <AlertTriangle size={26} className="text-warn" />
//           </div>
//           <h1 className="text-xl font-bold tracking-tight text-warn">
//             Please start your WSL to continue
//           </h1>
//         </div>

//         <p className="mb-6 text-sm leading-relaxed text-mica-500">
//           The Docker daemon inside your Linux distribution is currently unreachable.
//           Run the command below in a terminal to start it, then retry the connection.
//         </p>

//         <div className="mb-6 overflow-hidden rounded-lg border border-mica-700 bg-black/60">
//           <div className="flex items-center justify-between border-b border-mica-700/60 bg-mica-900/60 px-3 py-1.5">
//             <span className="text-[11px] font-medium uppercase tracking-wider text-mica-500">
//               PowerShell
//             </span>
//             <button
//               onClick={copyCommand}
//               className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-mica-500 transition-colors hover:bg-mica-700 hover:text-white"
//             >
//               {copied ? (
//                 <>
//                   <Check size={13} className="text-success" />
//                   <span className="text-success">Copied</span>
//                 </>
//               ) : (
//                 <>
//                   <Copy size={13} />
//                   <span>Copy</span>
//                 </>
//               )}
//             </button>
//           </div>
//           <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-success">
//             <code>{COMMAND}</code>
//           </pre>
//         </div>

//         <button
//           onClick={onRetry}
//           disabled={retrying}
//           className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
//         >
//           <RefreshCw size={16} className={retrying ? 'spin' : ''} />
//           {retrying ? 'Retrying…' : 'Retry Connection'}
//         </button>
//       </div>
//     </div>
//   );
// }
// =============================================
//

// import { useState } from 'react';
// import { AlertTriangle, Copy, Check, RefreshCw } from 'lucide-react';

// interface Props {
//   onRetry: () => void;
//   retrying: boolean;
// }

// const COMMANDS = [
//   {
//     label: 'Step 1 — Open WSL as root (PowerShell)',
//     command: 'wsl -d Ubuntu -u root',
//   },
//   {
//     label: 'Step 2 — Start Docker bridge (inside WSL)',
//     command: 'socat TCP-LISTEN:2375,reuseaddr,fork UNIX-CONNECT:/var/run/docker.sock &',
//   },
// ];

// function CopyBlock({ label, command }: { label: string; command: string }) {
//   const [copied, setCopied] = useState(false);

//   const copy = async () => {
//     try {
//       await navigator.clipboard.writeText(command);
//     } catch {
//       const ta = document.createElement('textarea');
//       ta.value = command;
//       document.body.appendChild(ta);
//       ta.select();
//       document.execCommand('copy');
//       document.body.removeChild(ta);
//     }
//     setCopied(true);
//     setTimeout(() => setCopied(false), 1800);
//   };

//   return (
//     <div className="mb-4 overflow-hidden rounded-lg border border-mica-700 bg-black/60">
//       <div className="flex items-center justify-between border-b border-mica-700/60 bg-mica-900/60 px-3 py-1.5">
//         <span className="text-[11px] font-medium uppercase tracking-wider text-mica-500">
//           {label}
//         </span>
//         <button
//           onClick={copy}
//           className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-mica-500 transition-colors hover:bg-mica-700 hover:text-white"
//         >
//           {copied ? (
//             <>
//               <Check size={13} className="text-success" />
//               <span className="text-success">Copied</span>
//             </>
//           ) : (
//             <>
//               <Copy size={13} />
//               <span>Copy</span>
//             </>
//           )}
//         </button>
//       </div>
//       <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-success">
//         <code>{command}</code>
//       </pre>
//     </div>
//   );
// }

// export default function ErrorScreen({ onRetry, retrying }: Props) {
//   return (
//     <div className="flex h-full w-full items-center justify-center bg-mica-950 px-6">
//       <div className="w-full max-w-xl animate-fade-in rounded-2xl border border-mica-700 bg-mica-850/80 p-8 shadow-2xl backdrop-blur-md">
//         <div className="mb-6 flex items-center gap-3">
//           <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warn-soft">
//             <AlertTriangle size={26} className="text-warn" />
//           </div>
//           <h1 className="text-xl font-bold tracking-tight text-warn">
//             Docker daemon is unreachable
//           </h1>
//         </div>

//         <p className="mb-6 text-sm leading-relaxed text-mica-500">
//           WSL or Docker is not running. Run these two commands in order, then retry.
//         </p>

//         {COMMANDS.map((c) => (
//           <CopyBlock key={c.command} label={c.label} command={c.command} />
//         ))}

//         <button
//           onClick={onRetry}
//           disabled={retrying}
//           className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
//         >
//           <RefreshCw size={16} className={retrying ? 'spin' : ''} />
//           {retrying ? 'Retrying…' : 'Retry Connection'}
//         </button>
//       </div>
//     </div>
//   );
// }
// =========================================
import { useState } from "react";
import { AlertTriangle, Copy, Check, RefreshCw } from "lucide-react";

interface Props {
  onRetry: () => void;
  retrying: boolean;
}

const SETUP_COMMAND = `sudo mkdir -p /etc/systemd/system/docker.service.d && echo '{"hosts":["unix:///var/run/docker.sock","tcp://0.0.0.0:2375"]}' | sudo tee /etc/docker/daemon.json && printf '[Service]\\nExecStart=\\nExecStart=/usr/bin/dockerd\\n' | sudo tee /etc/systemd/system/docker.service.d/override.conf && sudo systemctl daemon-reload && sudo systemctl restart docker`;

const DAILY_COMMANDS = [
  {
    label: "Step 1 — Open WSL (PowerShell)",
    command: "wsl -d Ubuntu -u root",
    hint: "Run this in PowerShell first.",
  },
  {
    label: "Step 2 — Start Docker (inside WSL)",
    command: "sudo service docker start",
    hint: "Run this inside WSL, then click Retry Connection below.",
  },
];

function CopyBlock({
  label,
  command,
  hint,
}: {
  label: string;
  command: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = command;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-mica-700 bg-black/60">
      <div className="flex items-center justify-between border-b border-mica-700/60 bg-mica-900/60 px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-mica-500">
          {label}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-mica-500 transition-colors hover:bg-mica-700 hover:text-white"
        >
          {copied ? (
            <>
              <Check size={13} className="text-success" />
              <span className="text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all px-4 py-3 font-mono text-[13px] leading-relaxed text-success">
        <code>{command}</code>
      </pre>
      {hint && (
        <p className="border-t border-mica-700/40 px-4 py-2 text-[11px] text-mica-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function ErrorScreen({ onRetry, retrying }: Props) {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center bg-mica-950 px-6">
      <div className="w-full max-w-xl animate-fade-in rounded-2xl border border-mica-700 bg-mica-850/80 p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warn-soft">
            <AlertTriangle size={26} className="text-warn" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-warn">
            Docker daemon is unreachable
          </h1>
        </div>

        {/* Daily start command */}
        <p className="mb-3 text-sm text-mica-400">
          Start WSL and Docker, then retry:
        </p>

        {DAILY_COMMANDS.map((c) => (
          <CopyBlock
            key={c.command}
            label={c.label}
            command={c.command}
            hint={c.hint}
          />
        ))}

        {/* One-time setup toggle */}
        <button
          onClick={() => setShowSetup((v) => !v)}
          className="mb-4 text-xs text-mica-500 underline underline-offset-2 hover:text-white transition-colors"
        >
          {showSetup ? "Hide" : "First time? Run one-time Docker setup ↓"}
        </button>

        {showSetup && (
          <CopyBlock
            label="WSL — one-time setup (run inside Ubuntu)"
            command={SETUP_COMMAND}
            hint="Run this once inside WSL. Never needed again after this."
          />
        )}

        {/* Retry button */}
        <button
          onClick={onRetry}
          disabled={retrying}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={retrying ? "spin" : ""} />
          {retrying ? "Retrying…" : "Retry Connection"}
        </button>
      </div>
    </div>
  );
}
