# SteadyNest Design System — Audit + Extension

*Note on method: this session doesn't have the actual repo or Figma file connected (Figma connector isn't authorized), so this audit is built from the described screens and known stack (Expo/React Native) rather than reading component code directly. Treat scores as directional — re-run with repo access for exact hardcoded-value counts.*

## Audit

### Summary
**Screens covered:** 5 (role switcher, property map, "what's new around here," chat, Settings/SOS) | **Likely issues:** 6 | **Score: 42/100** — typical for a solo-founder, feature-first build with no formal token layer yet. Not a criticism: at this stage shipping features beats a polished system, but a few gaps will bite as the app grows past one person building it.

### Naming Consistency
| Issue | Components | Recommendation |
|-------|------------|----------------|
| No shared naming convention likely exists yet between tenant-mode and landlord-mode variants of the same screen | Dashboard, role switcher | Adopt `Dashboard.Tenant` / `Dashboard.Landlord` or a single `Dashboard` component driven by a `role` prop — pick one pattern now before the two dashboards diverge further and become two codebases pretending to be one |
| Map is likely reused ad hoc between property search and "what's new around here" | PropertyMap, LocalSpotsMap | Since both already share the same geo/radius infra, make that explicit: one `RadiusMap` component with a `mode: 'properties' \| 'local'` prop, not two near-duplicate screens |

### Token Coverage
| Category | Defined | Hardcoded Values Found (estimated) |
|----------|---------|----------------------|
| Colors | Likely none formalized | High — role switcher, map pins, chat bubbles, SOS button probably all use inline hex |
| Spacing | Likely none formalized | Medium — flexbox layouts in RN often drift into one-off padding per screen |
| Typography | Likely none formalized | Medium — font sizes probably set per-screen rather than from a scale |
| Elevation/shadow | Likely none | Low impact on RN (shadows are cheap to skip early) but worth 3 levels (card, modal, floating-action) before the component count grows |

### Component Completeness
| Component | States | Variants | Docs | Score |
|-----------|--------|----------|------|-------|
| Role Switcher (Tenant/Landlord) | ⚠️ (missing loading state during switch) | ✅ | ❌ | 5/10 |
| Radius Slider (map) | ⚠️ (no disabled/error state if GPS denied) | ✅ (2–10km) | ❌ | 5/10 |
| Chat bubble / thread | ⚠️ (per steadynest-context.md, chat itself is "still being debugged" — sending/delivered/offline states are likely incomplete) | ✅ | ❌ | 4/10 |
| SOS trigger | ❌ (no distinct pressed/confirming/dispatching/dispatched states visible) | ❌ (single variant, but this is a case where *more* states matter far more than more variants) | ❌ | 3/10 |
| Autopay status card | ⚠️ ("still being debugged" per context — status card likely doesn't yet handle a failed-payment state) | ⚠️ | ❌ | 4/10 |

### Priority Actions
1. **Give the SOS button real state machine, not just an on-tap handler.** Right now it's the single highest-stakes interactive element in the app (per the product brief: silent dual-camera capture + GPS + auto-dispatch) and the lowest-scored component. A user who taps it needs to *see* something is happening — see Extend section below.
2. **Unify PropertyMap and "what's new around here" into one `RadiusMap` component.** They already share backend geo-search; keep the UI in lockstep so a bug fix to one doesn't quietly miss the other.
3. **Pull hardcoded colors/spacing into a `theme.ts` now**, even a minimal one (5–6 semantic colors, an 8-point spacing scale). Doing this before autopay/chat/SOS get more screens is far cheaper than retrofitting later.

---

## Extend: SOS Trigger Component

### Problem
The Emergency SOS button is described as a high-visibility, high-contrast trigger pinned to the top of Settings that must, on tap, silently grab GPS, force-capture front+rear camera, compile a distress payload, dispatch it, and wipe local copies — all without interrupting the UI. Per `steadynest-context.md`, this feature "exists but is still being debugged/hardened," meaning the UI almost certainly doesn't yet expose *feedback* for each of those background steps — which is a safety problem, not just a polish one. A user in a real emergency needs to know the SOS fired, not stare at a button that looks unchanged.

### Existing Patterns
| Related Component | Similarity | Why It's Not Enough |
|-------------------|-----------|---------------------|
| Standard destructive/primary button | Same tap target, same high-contrast color logic | No support for a multi-stage async operation (GPS → capture → compile → dispatch) or for confirming irreversible/high-stakes action |
| Toast/snackbar (if one exists for autopay failures) | Same "background thing happened" pattern | Toasts are dismissible and easy to miss — wrong affordance for a life-safety confirmation |

### Proposed Design

#### API / Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `onTrigger` | `() => Promise<SOSResult>` | — | Async handler that runs the GPS→capture→compile→dispatch chain |
| `holdToConfirmMs` | `number` | `1500` | Requires a press-and-hold, not a single tap, to prevent accidental fires on a screen this prominent |
| `contactsConfigured` | `boolean` | — | If `false`, component renders a setup prompt instead of the live trigger — never let a user "fire" SOS into a void with zero emergency contacts saved |
| `lastDispatchedAt` | `Date \| null` | `null` | Shown subtly below the button so a user can confirm a past SOS actually went out |

#### Variants
| Variant | Use When | Visual |
|---------|----------|--------|
| `armed` | Contacts configured, ready | Solid high-contrast red/orange, pinned top of Settings |
| `unconfigured` | No emergency contacts saved yet | Same position, muted color + "Add emergency contacts first" label — routes to setup, doesn't attempt to fire |

#### States
| State | Behavior | Notes |
|-------|----------|-------|
| Default (armed) | Static, high-contrast | — |
| Holding | Radial fill/progress ring animates over `holdToConfirmMs` | Gives an accidental-touch escape hatch — release early, nothing fires |
| Acquiring GPS | Button locks, inline "Getting your location…" | Must not be silently invisible — the product spec says background capture is silent, but *acknowledgment that SOS is running* should not be |
| Capturing / Compiling | Progress label updates ("Capturing evidence…" → "Sending to contacts…") | Each stage should update state so a failure at any one stage is attributable, not a silent black box |
| Dispatched | Brief success confirmation + `lastDispatchedAt` timestamp updates | Also the moment local media should be wiped per the security spec — tie the wipe to this state transition, not to a timer |
| Failed (any stage) | Explicit "SOS did not send — tap to retry" plus fallback path (e.g., direct dial to emergency contact) | Given autopay/chat SOS backends are still being hardened per context, a failure state is not an edge case here — plan for it as a first-class path, and always give a manual fallback (phone call) alongside the automated one |

#### Tokens Used
- Colors: `color.danger.600` (armed default), `color.danger.300` (unconfigured/muted), `color.success.500` (dispatched confirmation)
- Spacing: top-of-screen padding consistent with other Settings section headers
- Typography: same weight/scale as other primary CTAs, no custom one-off size

### Accessibility
- **Role**: `button`, with `accessibilityLabel` describing the full consequence ("Emergency SOS. Press and hold to alert your emergency contacts with your location.") — not just "SOS"
- **Keyboard/external switch**: hold-to-confirm must have a switch-control-compatible alternative (long single press via assistive tech, not just a raw touch duration)
- **Screen reader**: announce each state transition (acquiring location, sending, sent, failed) — silent visual-only feedback fails a screen reader user in the exact moment they need the app most

### Open Questions
- Should `holdToConfirmMs` be configurable per user (some users may have motor impairments that make a 1.5s hold hard)?
- What's the fallback UX if GPS is denied entirely — dispatch contacts without location, or block and prompt for permission first?
- Given chat/autopay are still being hardened, is the dispatch channel (SMS/email/API) for SOS shared with those systems, or does SOS need its own more isolated, more reliable send path precisely *because* the rest of the backend is still shaky?
