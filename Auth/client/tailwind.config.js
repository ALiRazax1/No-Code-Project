/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Auth design tokens — deep indigo/near-black base with a
        // violet identity accent and a teal "live session" accent.
        mc: {
          bg: "#0B0B12",
          surface: "#12121C",
          border: "rgba(255,255,255,0.08)",
          text: "#F3F1FA",
          muted: "#8B8797",
          violet: "#7C6CFF",
          "violet-dim": "#5B4FCC",
          teal: "#38E1C6",
          // Error/destructive-action accent — matches the previous raw
          // red-500 / red-300 Tailwind utilities exactly (no visual change),
          // just centralized so a client's palette can override it too.
          error: "#EF4444",
          "error-dim": "#FCA5A5",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      keyframes: {
        "mc-pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(56, 225, 198, 0.45)" },
          "70%": { boxShadow: "0 0 0 8px rgba(56, 225, 198, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(56, 225, 198, 0)" },
        },
        "mc-fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "mc-pulse-ring": "mc-pulse-ring 2.4s ease-out infinite",
        "mc-fade-in": "mc-fade-in 0.16s ease-out",
      },
    },
  },
  plugins: [],
};
