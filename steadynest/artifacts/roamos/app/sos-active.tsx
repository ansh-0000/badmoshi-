import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { CameraView, useCameraPermissions } from '@/components/CameraWrapper';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { API_BASE } from '@/constants/api';
import { fixedInk } from '@/constants/colors';

const EMERGENCY_NUMBER = '112'; // India's unified emergency number
const CANCEL_HOLD_MS = 2000;

// The server call is best-effort and must never be the thing standing between
// the user and their SMS composer. `fetch` has no default timeout in React
// Native — on a weak or captive-portal connection it inherits the platform
// socket timeout (~60s on Android), so a user in trouble could stare at
// "ACTIVATING" for a minute with nothing sent. Six seconds is already longer
// than a healthy round trip; past that we stop waiting and fall back.
const SERVER_TIMEOUT_MS = 6000;

type DispatchState = 'activating' | 'active' | 'error';

// These states describe WHAT WE ACTUALLY KNOW, not what we hope happened.
//
// The previous version had a 'notified' state that was set the instant the SMS
// composer was opened. Opening a composer is not delivery: the user still has
// to press Send, and they may never see the draft at all if the OS puts it
// behind the lock screen. Telling someone in an emergency that their sister
// has been notified when no message has left the phone is the worst possible
// failure mode this screen has — they stop trying other things.
//
//   pending       nothing attempted yet
//   dispatched    the SERVER reported the SMS was accepted by the carrier API.
//                 This is the only state that means a message actually went out.
//   draft_opened  the on-device composer was opened. The user must press Send.
//   failed        we tried and it did not work
type ContactStatus = 'pending' | 'dispatched' | 'draft_opened' | 'failed';

// Cross-platform SMS URI. Android separates the body with `?`, iOS with `&`;
// both accept a comma-separated recipient list.
function smsUrl(numbers: string[], body: string): string {
  const separator = Platform.OS === 'ios' ? '&' : '?';
  return `sms:${numbers.join(',')}${separator}body=${encodeURIComponent(body)}`;
}

// ── Colour on this screen ────────────────────────────────────────────────────
// SOS is a fixed-dark surface in BOTH themes — an emergency screen that changed
// appearance with the user's light/dark setting would be a different screen
// under stress, and the vermillion/gold accents are only legible on ink. So
// this file deliberately does not call useColors() for its chrome. Per the
// CLAUDE.md hardcoded-hex rule, the literals it used are replaced by the
// `fixedInk` tokens plus the two palette accents, which are identical in both
// palettes (see constants/colors.ts) — a named exception, not a stray literal.
const SOS_RED = '#A85232';    // palette.vermillion — same in light and dark
const SOS_GOLD = '#E2A73E';   // palette.marigold  — same in light and dark
const SOS_GREEN = '#8FB89E';  // darkPalette.primaryTint — 7.61:1 on ink

const CONTACT_STATUS_VIEW: Record<
  ContactStatus,
  { icon: React.ComponentProps<typeof Feather>['name']; label: string; color: string }
> = {
  pending: { icon: 'clock', label: 'Pending', color: fixedInk.onSurfaceFaint },
  dispatched: { icon: 'check-circle', label: 'Sent', color: SOS_GREEN },
  // Deliberately NOT a tick and NOT green. The user has an action left to do.
  draft_opened: { icon: 'edit-3', label: 'Press Send', color: SOS_GOLD },
  failed: { icon: 'alert-triangle', label: 'Failed', color: SOS_RED },
};

export default function SosActiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trustedContacts } = useApp();
  const [permission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [dispatchState, setDispatchState] = useState<DispatchState>('activating');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [contactStatuses, setContactStatuses] = useState<Record<string, ContactStatus>>(
    () => Object.fromEntries(trustedContacts.map((c) => [c, 'pending']))
  );
  const [serverDispatched, setServerDispatched] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const activatedAt = useRef(new Date());
  // Frozen at mount. The alarm must act on the contact list as it was when the
  // user triggered it; re-reading a list that changes mid-dispatch would make
  // the statuses below describe a different set of people than the one shown.
  const contactsRef = useRef<string[]>(trustedContacts);
  const smsBodyRef = useRef<string>('EMERGENCY SOS: I need help.');

  const pulse = useRef(new Animated.Value(1)).current;
  const [holding, setHolding] = useState(false);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Opens the OS SMS composer, pre-addressed and pre-filled.
  //
  // This is a DRAFT, not a send. Sending SMS silently requires the Android
  // SEND_SMS permission and a native module; it is unavailable in Expo Go,
  // and Google Play restricts SEND_SMS to apps whose core function is SMS —
  // a rental app would be rejected for requesting it. iOS has no equivalent
  // at all. So the composer is the ceiling of what the app can do on-device,
  // and the UI must say so rather than implying the message was sent.
  const openDraft = useCallback(async (numbers: string[], body: string): Promise<boolean> => {
    if (numbers.length === 0) return false;
    const url = smsUrl(numbers, body);
    try {
      await Linking.openURL(url);
      setDraftError(null);
      return true;
    } catch (err) {
      // Devices with no SMS app (tablets, some emulators) reject the intent.
      setDraftError('This device could not open a messaging app. Use Call 112 below.');
      return false;
    }
  }, []);

  // Capture + keep updating live coordinates for the duration this screen
  // is active, and best-effort dispatch to the backend / trusted contacts.
  useEffect(() => {
    let watchSub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      let lat = 0, lon = 0;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
          if (!cancelled) setCoords({ lat, lon });

          watchSub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 5 },
            (update) => {
              if (!cancelled) setCoords({ lat: update.coords.latitude, lon: update.coords.longitude });
            }
          );
        } else if (!cancelled) {
          setLocationError('Location permission denied — contacts will be notified without your live position.');
        }
      } catch (err) {
        if (!cancelled) setLocationError('Could not get your location.');
      }

      let photoBase64: string | null = null;
      try {
        if (permission?.granted && cameraRef.current && Platform.OS !== 'web') {
          const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1 });
          photoBase64 = photo?.base64 ?? null;
        }
      } catch (err) {
        // best-effort only
      }

      const contacts = contactsRef.current;
      const mapsLink = lat && lon ? `https://maps.google.com/?q=${lat},${lon}` : 'location unavailable';
      const smsBody = `EMERGENCY SOS: I need help. My live location: ${mapsLink}`;
      smsBodyRef.current = smsBody;

      let dispatched = false;
      try {
        const res = await fetch(`${API_BASE}/sos/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: lat,
            longitude: lon,
            photos: photoBase64 ? [photoBase64] : [],
            contacts,
          }),
          // Hard ceiling — see SERVER_TIMEOUT_MS.
          signal: AbortSignal.timeout(SERVER_TIMEOUT_MS),
        });
        if (res.ok) {
          const data = await res.json();
          dispatched = !!data.dispatched;
        }
      } catch (err) {
        // Timed out, offline, or server error. Either way the on-device
        // fallback below is what matters now.
      }

      if (cancelled) return;
      setServerDispatched(dispatched);

      if (dispatched) {
        // The only path that may claim a message actually went out.
        setContactStatuses(Object.fromEntries(contacts.map((c) => [c, 'dispatched' as const])));
      } else if (contacts.length > 0) {
        // Fallback: open ONE composer addressed to EVERY trusted contact, not
        // just contacts[0]. The old code messaged the first contact and left
        // the rest silently 'pending' — if the primary contact was asleep or
        // out of coverage, nobody else was ever contacted.
        const opened = await openDraft(contacts, smsBody);
        setContactStatuses(
          Object.fromEntries(contacts.map((c) => [c, opened ? ('draft_opened' as const) : ('failed' as const)]))
        );
      }

      setDispatchState('active');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    })();

    return () => {
      cancelled = true;
      watchSub?.remove();
    };
  }, []);

  const callEmergency = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
  };

  const startCancelHold = () => {
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(holdProgress, { toValue: 1, duration: CANCEL_HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start();
    holdTimer.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }, CANCEL_HOLD_MS);
  };

  const cancelCancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
    holdProgress.stopAnimation();
    holdProgress.setValue(0);
  };

  const elapsedLabel = () => {
    const secs = Math.max(0, Math.floor((Date.now() - activatedAt.current.getTime()) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: fixedInk.surface }]}>
      {permission?.granted && Platform.OS !== 'web' && (
        <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
        </View>
      )}

      <View style={[styles.content, { paddingTop: topInset + 24 }]}>
        <Text style={styles.eyebrow}>{dispatchState === 'activating' ? 'ACTIVATING' : 'SOS ACTIVE'}</Text>
        <Text style={styles.timer}>{elapsedLabel()}</Text>

        <View style={styles.pulseWrap}>
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulse }], opacity: pulse.interpolate({ inputRange: [1, 1.5], outputRange: [0.5, 0] }) },
            ]}
          />
          <View style={styles.pulseCore}>
            <Feather name="alert-octagon" size={40} color={fixedInk.onSurface} />
          </View>
        </View>

        <View style={styles.coordsCard}>
          <Feather name="map-pin" size={14} color={SOS_GOLD} />
          {coords ? (
            <Text style={styles.coordsText}>{coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}</Text>
          ) : (
            <Text style={styles.coordsText}>{locationError ?? 'Getting your location…'}</Text>
          )}
        </View>

        <View style={styles.contactsCard}>
          <Text style={styles.contactsTitle}>Trusted contacts</Text>

          {trustedContacts.length === 0 && (
            <Text style={styles.fallbackNote}>
              You have no trusted contacts saved, so no one can be messaged automatically.
              Use Call {EMERGENCY_NUMBER} below.
            </Text>
          )}

          {trustedContacts.map((c) => {
            const status = contactStatuses[c] ?? 'pending';
            const view = CONTACT_STATUS_VIEW[status];
            return (
              <View key={c} style={styles.contactRow}>
                <Text style={styles.contactPhone}>{c}</Text>
                <View style={styles.contactStatusRow}>
                  <Feather name={view.icon} size={14} color={view.color} />
                  <Text style={[styles.contactStatusText, { color: view.color }]}>{view.label}</Text>
                </View>
              </View>
            );
          })}

          {/* The honest version of what used to read "an SMS draft was opened
              for your primary contact" next to a green "Notified" tick. */}
          {!serverDispatched && dispatchState === 'active' && trustedContacts.length > 0 && (
            <>
              <Text style={styles.fallbackWarning}>
                Nothing has been sent yet. A message to all {trustedContacts.length} contact
                {trustedContacts.length === 1 ? '' : 's'} is open in your messaging app —
                you must press Send there.
              </Text>
              <TouchableOpacity
                style={styles.reopenBtn}
                onPress={() => openDraft(contactsRef.current, smsBodyRef.current)}
                activeOpacity={0.8}
              >
                <Feather name="message-square" size={14} color={fixedInk.onSurface} />
                <Text style={styles.reopenBtnText}>Reopen message</Text>
              </TouchableOpacity>
            </>
          )}

          {draftError && <Text style={styles.fallbackWarning}>{draftError}</Text>}
        </View>

        <TouchableOpacity style={styles.callBtn} onPress={callEmergency} activeOpacity={0.85}>
          <Feather name="phone-call" size={20} color={fixedInk.surface} />
          <Text style={styles.callBtnText}>Call {EMERGENCY_NUMBER}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.cancelArea, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPressIn={startCancelHold}
          onPressOut={cancelCancelHold}
          style={styles.cancelWrapper}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(249,248,244,0.16)',
                borderRadius: 9999,
                width: holdProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
          <Text style={styles.cancelText}>{holding ? 'Keep holding to cancel…' : 'Hold to cancel'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  content: { alignItems: 'center', paddingHorizontal: 28 },
  eyebrow: { color: SOS_RED, fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 2 },
  timer: { color: fixedInk.onSurface, fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 15, marginTop: 6, opacity: 0.6 },
  pulseWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginTop: 32, marginBottom: 28 },
  pulseRing: { position: 'absolute', width: 160, height: 160, borderRadius: 9999, backgroundColor: SOS_RED },
  pulseCore: {
    width: 112, height: 112, borderRadius: 9999, backgroundColor: SOS_RED,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: SOS_RED, shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 10 },
  },
  coordsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(249,248,244,0.07)', borderRadius: 9999,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20,
  },
  coordsText: { color: fixedInk.onSurface, fontFamily: 'JetBrainsMono_500Medium', fontSize: 13 },
  contactsCard: {
    width: '100%', backgroundColor: 'rgba(249,248,244,0.06)', borderRadius: 20,
    padding: 18, marginBottom: 22,
  },
  contactsTitle: { color: fixedInk.onSurfaceMuted, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  contactPhone: { color: fixedInk.onSurface, fontFamily: 'JetBrainsMono_500Medium', fontSize: 14 },
  contactStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactStatusText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  fallbackNote: { color: fixedInk.onSurfaceFaint, fontSize: 11.5, lineHeight: 16, marginTop: 10 },
  fallbackWarning: {
    color: SOS_GOLD, fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 17, marginTop: 12,
  },
  reopenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 12, borderRadius: 9999,
    borderWidth: 1, borderColor: fixedInk.hairline,
  },
  reopenBtnText: { color: fixedInk.onSurface, fontFamily: 'Inter_600SemiBold', fontSize: 13.5 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SOS_GOLD,
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: 9999, width: '100%', justifyContent: 'center',
  },
  callBtnText: { color: fixedInk.surface, fontFamily: 'Inter_700Bold', fontSize: 16 },
  cancelArea: { paddingHorizontal: 28 },
  cancelWrapper: {
    borderRadius: 9999, borderWidth: 1.5, borderColor: fixedInk.hairline,
    paddingVertical: 16, alignItems: 'center', overflow: 'hidden',
  },
  cancelText: { color: 'rgba(249,248,244,0.75)', fontFamily: 'Inter_600SemiBold', fontSize: 14.5 },
});
