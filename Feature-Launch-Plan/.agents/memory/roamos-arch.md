---
name: ROAM•OS Architecture
description: Key decisions and file layout for the ROAM•OS + StayNest Expo mobile app artifact.
---

## Core decisions

- **No react-native-maps** — custom SVG radar visualization in `app/(tabs)/nearby.tsx`
- **No Oswald font** — Inter_700Bold + uppercase + letterSpacing covers the condensed look
- **Dark-only** — both `colors.light` and `colors.dark` in `constants/colors.ts` use the same Ink palette. `useColors` hook picks by scheme but output is identical.
- **AsyncStorage only** — all state in `context/AppContext.tsx`, persisted under key `@roamos_v1`
- **5 tabs max** — Brief, Nearby, Stays, Chat, Me (Android limit)

**Why:** avoids extra native module installs that would require a dev build on Expo Go.

## File layout (screens)

- `app/(tabs)/index.tsx` — Arrival Brief: CompassDial hero + checklist
- `app/(tabs)/nearby.tsx` — SVG radar with Reanimated sweep + pulse + place pins
- `app/(tabs)/stays.tsx` — FlatList of StayCard with type/autopay filters
- `app/(tabs)/chat.tsx` — ChatRoom list → navigates to `/chat/[id]`
- `app/(tabs)/me.tsx` — Digital passport card + exploration ledger
- `app/chat/[id].tsx` — Inverted FlatList + KeyboardAvoidingView from react-native-keyboard-controller
- `app/eat-drink.tsx` — Day/Night toggle + FoodCard horizontal scroll + full list
- `app/translator.tsx` — Language picker + FlipCard (Reanimated opacity+scale flip)
- `app/settings.tsx` — City selector, radius grid, autopay switch

## Components

- `CompassDial.tsx` — SVG bezel + Reanimated needle; states: idle (wobble) / pointing / confirming
- `StayCard.tsx` — expo-image, autopay badge, remote work score, verified Jade badge
- `FoodCard.tsx` — horizontal scroll card, day/night openAt indicator
- `FlipCard.tsx` — Reanimated perspective flip EN↔target lang

## useColors fix

The scaffold's original `useColors.ts` cast `colors` to `Record<string, typeof colors.light>` which conflicts with the `radius` key. Fixed by direct palette selection: `scheme === 'dark' ? colors.dark : colors.light`.

**How to apply:** if you see a TS error about `colors` indexing in `useColors.ts`, use the direct key lookup.
