// lib/pendingConfirmationStore.ts
//
// A Firebase ConfirmationResult can't be serialized through Expo Router's
// navigation params (it's a class instance, not JSON), so it has to live
// somewhere both the phone-login screen and the verify-otp screen can reach.
// A plain module-level singleton is enough here — this only ever holds one
// in-flight confirmation at a time, and it's cleared the moment it's used
// or the user backs out of the flow.

import type { ConfirmationResult } from './firebase';

let pending: ConfirmationResult | null = null;

export function setPendingConfirmation(confirmation: ConfirmationResult): void {
  pending = confirmation;
}

export function getPendingConfirmation(): ConfirmationResult | null {
  return pending;
}

export function clearPendingConfirmation(): void {
  pending = null;
}
