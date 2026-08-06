/**
 * SteadyNest Design Tokens — Moss / Alabaster Edition
 *
 * Ground truth: steadynest-mobile-ui-design/project/SteadyNest.dc.html
 * (styles.css in the same bundle is a mismatched generic scaffold and is
 * NOT used as a source for any value here — see the handoff investigation).
 */

const palette = {
  // ── Core Identity ───────────────────────────────────────────────────────
  ink: '#14201A',              // Deep Ink (Primary text)
  parchment: '#F9F8F4',        // Alabaster (Base Background)
  deepOcean: '#F9F8F4',        // Legacy compat (Base Background)
  horizonTeal: '#3A5245',      // Moss (Primary actions)
  sunsetCoral: '#3A5245',      // Moss (Secondary/CTAs)
  signalGreen: '#3A5245',      // Success / Verified / Match — Moss, not a separate green

  // ── Tira AI Identity ────────────────────────────────────────────────────
  tiraViolet: '#E2A73E',       // Gold (Tira's distinct identity color, per design frame 7)
  tiraPink: '#B5842C',         // Deeper gold (gradient second stop)

  // ── Legacy compat aliases ───────────────────────────────────────────────
  vermillion: '#A85232',       // SOS / destructive
  jade: '#3A5245',             // Moss
  marigold: '#E2A73E',         // Gold

  // ── UI Layers ──────────────────────────────────────────────────────────
  glass: 'rgba(249, 248, 244, 0.7)',        // Alabaster with opacity
  glassDark: 'rgba(249, 248, 244, 0.94)',   // Tab bar blur background (from source)

  // ── Semantic Roles ─────────────────────────────────────────────────────
  background: '#F9F8F4',       // Alabaster
  foreground: '#14201A',       // Deep Ink
  card: '#FFFFFF',             // Pure White for cards to stand out on Alabaster
  cardForeground: '#14201A',

  primary: '#3A5245',          // Moss — as a FILL (button backgrounds, chips)
  // Moss as a FOREGROUND (active tab icons/labels, links, accents drawn
  // directly on the page background). Identical to `primary` in light mode;
  // the dark palette overrides it. See the note on darkPalette.primaryTint.
  primaryTint: '#3A5245',
  primaryForeground: '#F9F8F4',
  secondary: '#F1EFE8',        // Soft alabaster-adjacent neutral for secondary buttons
  secondaryForeground: '#14201A',

  muted: 'rgba(58, 82, 69, 0.06)',   // Moss wash — segment tracks, icon circles
  mutedForeground: 'rgba(20, 32, 26, 0.5)',
  // Unselected label in the Stays segmented control. The design file uses
  // rgba(20,32,26,0.55), which measures ~3.5:1 on the segment's tinted track
  // — below WCAG AA (4.5:1) for normal text, and the reason the control was
  // hard to find. Deliberately one step darker than the design so the
  // inactive option stays legible; the selected pill still reads far
  // stronger (7.99:1), so the selected/unselected hierarchy is preserved.
  segmentInactive: 'rgba(20, 32, 26, 0.72)',

  accent: '#E2A73E',           // Gold
  accentForeground: '#14201A', // Ink text/icons on gold (badges, ratings)
  destructive: '#A85232',      // SOS / danger
  destructiveForeground: '#F9F8F4',

  border: 'rgba(20, 32, 26, 0.08)',
  input: '#FFFFFF',

  // Legacy mappings
  text: '#14201A',
  tint: '#3A5245',
};

const darkPalette = {
  // NOTE: the design brief doesn't specify a toggled dark mode for
  // Stays/Connect/Chat/Profile — only Onboarding and Tira AI are
  // deliberately dark screens (kept that way regardless of this toggle).
  // These values extend the same literal tokens the brief does provide
  // (Ink/Alabaster/Moss/Gold, and the exact translucent overlays used on
  // the dark Onboarding frame) to the rest of the app's dark-mode roles,
  // rather than inventing new colors — flagged as inferred, not
  // pixel-sourced from an explicit dark frame.
  ink: '#F9F8F4',
  parchment: '#14201A',
  deepOcean: '#14201A',
  horizonTeal: '#3A5245',
  sunsetCoral: '#3A5245',
  signalGreen: '#3A5245',
  tiraViolet: '#E2A73E',
  tiraPink: '#B5842C',
  vermillion: '#A85232',
  jade: '#3A5245',
  marigold: '#E2A73E',
  glass: 'rgba(20, 32, 26, 0.7)',
  glassDark: 'rgba(15, 24, 19, 0.85)',
  background: '#14201A',
  foreground: '#F9F8F4',
  card: '#1B2A22',
  cardForeground: '#F9F8F4',
  // Kept as-is: still correct as a FILL, because primaryForeground (#F9F8F4)
  // sits on top of it.
  primary: '#3A5245',
  // Moss is unusable as a foreground on a dark background — measured 1.98:1
  // against #14201A, below the 3:1 WCAG AA floor for UI components, and far
  // dimmer than the 8.71:1 of the *inactive* tab colour. The result was a tab
  // bar where the selected tab was the hardest one to see. This is a lightened
  // Moss of the same hue at 7.61:1. Use primaryTint for anything drawn
  // directly on the background; keep primary for fills.
  primaryTint: '#8FB89E',
  primaryForeground: '#F9F8F4',
  secondary: 'rgba(249, 248, 244, 0.06)',
  secondaryForeground: '#F9F8F4',
  muted: 'rgba(249, 248, 244, 0.08)',
  // 0.5 alpha measured 4.39:1 for the unselected segment label on the dark
  // ground — just under WCAG AA (4.5:1) for normal text. 0.62 clears it
  // without washing the muted/primary hierarchy out.
  mutedForeground: 'rgba(249, 248, 244, 0.62)',
  segmentInactive: 'rgba(249, 248, 244, 0.72)',
  accent: '#E2A73E',
  accentForeground: '#14201A',
  destructive: '#A85232',
  destructiveForeground: '#F9F8F4',
  border: 'rgba(249, 248, 244, 0.14)',
  input: '#1B2A22',
  text: '#F9F8F4',
  tint: '#3A5245',
};

/**
 * Surfaces that are deliberately dark in BOTH themes, with the text colors
 * that belong on them.
 *
 * The design uses a fixed Ink panel in a few places regardless of the user's
 * light/dark setting — the whole Tira screen (frame 7) and the Profile
 * money card (frame 8). Those must NOT be built from `colors.ink`:
 * `ink` inverts between palettes (`#14201A` in light, `#F9F8F4` in dark), so
 * a card painted with `colors.ink` and filled with hardcoded `#F9F8F4` text
 * renders white-on-white in dark mode — which is exactly how the Profile
 * rent figures became invisible. Use these instead; they never flip.
 */
export const fixedInk = {
  surface: '#14201A',
  onSurface: '#F9F8F4',
  onSurfaceMuted: 'rgba(249,248,244,0.6)',
  onSurfaceFaint: 'rgba(249,248,244,0.5)',
  hairline: 'rgba(249,248,244,0.14)',
};

// Support both Light and Dark editions of the Moss / Alabaster system
const colors = {
  light: palette,
  dark: darkPalette,
  radius: 28, // Card radius, per design (buttons/chips are explicit 9999 pill inline)
};

export default colors;
