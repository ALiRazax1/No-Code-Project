/**
 * Brand config
 * ---------------------------------------------------------------------------
 * The single place a per-client deployment edits to reskin copy and the
 * logo mark. Colors and fonts are controlled separately in
 * tailwind.config.js — this file is for anything that's content rather
 * than a design token.
 *
 * To reskin for a new client: edit the values below and the `mc.*` colors
 * in tailwind.config.js. No component file needs to change.
 */
export const brand = {
  /** Shown in card headings and the footer line. */
  appName: "Auth",

  /** The single glyph rendered inside <BrandMark />. Keep it to one
   *  character — the mark is sized for that. */
  logoLetter: "M",

  /** Footer line under the sign-in card: "{footerPrefix} {appName}" */
  footerPrefix: "Secured by",
};
