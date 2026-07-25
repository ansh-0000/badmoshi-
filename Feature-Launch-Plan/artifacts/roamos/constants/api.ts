import { API_BASE_URL } from '@/lib/api';

// This file used to guess the dev host itself, including a bug where it
// hardcoded 10.0.2.2 for every Android device (not just the emulator) —
// meaning any screen importing API_BASE from here silently broke on a real
// phone even though the host was technically "detected". lib/api.ts's
// resolver reads the actual host Metro served the JS bundle from
// (NativeModules.SourceCode.scriptURL), which is correct for the emulator,
// a physical device, and web without guessing. Delegating to it here means
// there is exactly one host resolver in the app, not two that can diverge.
export const API_BASE = `${API_BASE_URL}/api`;
console.log('[SteadyNest System] API configured to hit:', API_BASE);
