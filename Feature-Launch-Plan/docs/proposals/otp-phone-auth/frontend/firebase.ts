// lib/firebase.ts
// Uses @react-native-firebase/auth — requires a custom Expo dev client build.
// This will NOT work inside plain Expo Go. Run:
//   npx expo prebuild
//   npx expo run:android   (or run:ios)
// See steadynest-otp-auth-system-design.md, Trade-off Analysis, for why this
// path was chosen over the Firebase Web SDK's signInWithPhoneNumber
// (which needs a visible reCAPTCHA and is a poor fit for a native app).

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type ConfirmationResult = FirebaseAuthTypes.ConfirmationResult;

/**
 * Kicks off phone auth. Firebase handles OTP generation/delivery/rate-limiting
 * on its side. Returns a confirmation object whose .confirm(code) call
 * verifies the OTP client-side and yields a Firebase ID token.
 */
export async function requestPhoneOtp(e164Phone: string): Promise<ConfirmationResult> {
  if (!/^\+91\d{10}$/.test(e164Phone)) {
    throw new Error('Enter a valid Indian mobile number in +91XXXXXXXXXX format.');
  }
  return auth().signInWithPhoneNumber(e164Phone);
}

/**
 * Confirms the OTP against the pending confirmation result.
 * On success, Firebase Auth on the RN side has an active user session,
 * and we grab a fresh ID token to hand to our own backend so it can
 * issue app-level access/refresh tokens (see otp-auth-backend-routes.js).
 */
export async function confirmPhoneOtp(
  confirmation: ConfirmationResult,
  code: string
): Promise<string> {
  const credential = await confirmation.confirm(code);
  if (!credential?.user) {
    throw new Error('OTP verification did not return a user.');
  }
  const idToken = await credential.user.getIdToken();
  return idToken;
}

export async function signOutFirebase(): Promise<void> {
  await auth().signOut();
}
