import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from '@/components/CameraWrapper';
import * as Linking from 'expo-linking';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { CITIES } from '@/constants/data';
import { API_BASE } from '@/constants/api';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function SettingRow({ icon, label, sub, right, onPress, noBorder }: {
  icon: any; label: string; sub?: string; right?: React.ReactNode; onPress?: () => void; noBorder?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, !noBorder && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {sub && <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{sub}</Text>}
      </View>
      {right && <View>{right}</View>}
      {onPress && !right && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentCityId, setCurrentCityId, radius, setRadius, autopayEnabled, setAutopayEnabled } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const [triggeringSOS, setTriggeringSOS] = useState(false);
  const [contacts, setContacts] = useState(['+919876543210']); // Mock saved contact

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 16);

  const RADIUS_OPTIONS = [0.5, 1, 2, 3, 5, 10];

  const handleSOS = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert("🚨 SOS Triggered", "Capturing location and camera data...");
    setTriggeringSOS(true);

    let lat = 0, lon = 0;
    try {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
    } catch (err) {
      console.warn("SOS: failed to get location", err);
    }

    let photoBase64: string | null = null;
    try {
      if (permission?.granted && cameraRef.current && Platform.OS !== 'web') {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1 });
        photoBase64 = photo?.base64 ?? null;
      }
    } catch (err) {
      console.warn("SOS: failed to capture photo", err);
    }

    const mapsLink = lat && lon ? `https://maps.google.com/?q=${lat},${lon}` : 'location unavailable';
    const smsBody = `EMERGENCY SOS: I need help. My live location: ${mapsLink}`;

    // Best-effort server-side dispatch (only real once TWILIO_* env vars are
    // configured on the backend). This never blocks the guaranteed on-device
    // SMS below, which works today with zero API keys.
    let serverDispatched = false;
    try {
      const res = await fetch(`${API_BASE}/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          photos: photoBase64 ? [photoBase64] : [],
          contacts: contacts
        })
      });
      if (res.ok) {
        const data = await res.json();
        serverDispatched = !!data.dispatched;
      }
    } catch (err) {
      console.warn("SOS: server dispatch unavailable, using on-device SMS only", err);
    }

    setTriggeringSOS(false);

    if (serverDispatched) {
      Alert.alert("SOS Dispatched", "Emergency contacts have been notified automatically.");
    } else {
      Alert.alert("Opening SMS", "Automatic dispatch isn't set up yet — send this SMS now to alert your contact.");
      Linking.openURL(`sms:${contacts[0]}?body=${encodeURIComponent(smsBody)}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hidden Camera for SOS */}
      {permission?.granted && !triggeringSOS && Platform.OS !== 'web' && (
         <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
         </View>
      )}

      <LinearGradient
        colors={['rgba(226,167,62,0.04)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.2 }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>SETTINGS</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 40 }]}
      >
        {/* HUGE EMERGENCY BUTTON AT TOP */}
        <TouchableOpacity 
           style={[styles.sosButton, { backgroundColor: colors.vermillion + '22', borderColor: colors.vermillion }]}
           onPress={handleSOS}
           activeOpacity={0.7}
           disabled={triggeringSOS}
        >
           {triggeringSOS ? (
             <ActivityIndicator color={colors.vermillion} size="small" />
           ) : (
             <>
               <Feather name="alert-triangle" size={24} color={colors.vermillion} />
               <View style={{ marginLeft: 16 }}>
                 <Text style={[styles.sosTitle, { color: colors.vermillion }]}>EMERGENCY SOS</Text>
                 <Text style={[styles.sosDesc, { color: colors.vermillion }]}>Tap to instantly dispatch location & camera snapshots to contacts.</Text>
               </View>
             </>
           )}
        </TouchableOpacity>

        {!permission?.granted && Platform.OS !== 'web' && (
           <TouchableOpacity style={{ marginTop: -10, marginBottom: 20 }} onPress={requestPermission}>
             <Text style={{ color: colors.primary, fontSize: 12, textAlign: 'center' }}>Grant Camera Permission for SOS Photos</Text>
           </TouchableOpacity>
        )}

        {/* Location */}
        <Section title="LOCATION">
          {CITIES.map((city, i) => (
            <TouchableOpacity
              key={city.id}
              style={[
                styles.cityRow,
                i < CITIES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentCityId(city.id);
              }}
            >
              <View style={styles.cityInfo}>
                <Text style={[styles.cityName, { color: city.id === currentCityId ? colors.primary : colors.foreground }]}>
                  {city.name}
                </Text>
                <Text style={[styles.cityCoords, { color: colors.mutedForeground }]}>{city.coords}</Text>
              </View>
              {city.id === currentCityId && (
                <View style={[styles.activeMark, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={12} color={colors.ink} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </Section>

        {/* Contacts */}
        <Section title="EMERGENCY CONTACTS">
           <SettingRow icon="phone" label="Primary Guardian" sub={contacts[0]} right={<Feather name="edit-2" size={14} color={colors.mutedForeground} />} />
        </Section>

        {/* Radar radius */}
        <Section title="RADAR RADIUS">
          <View style={styles.radiusGrid}>
            {RADIUS_OPTIONS.map((r, i) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.radiusOption,
                  {
                    backgroundColor: radius === r ? colors.accent : colors.muted,
                    borderColor: radius === r ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRadius(r);
                }}
              >
                <Text style={[styles.radiusNum, { color: radius === r ? '#fff' : colors.foreground }]}>
                  {r}
                </Text>
                <Text style={[styles.radiusUnit, { color: radius === r ? '#ffffffcc' : colors.mutedForeground }]}>km</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.radiusNote, { color: colors.mutedForeground }]}>
            Current: {radius}km radius · Showing places within {radius * 1000}m
          </Text>
        </Section>

        {/* Autopay */}
        <Section title="AUTOPAY">
          <SettingRow
            icon="zap"
            label="Enable Autopay"
            sub="Auto-pay rent to verified landlords"
            right={
              <Switch
                value={autopayEnabled}
                onValueChange={v => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAutopayEnabled(v);
                }}
                trackColor={{ false: colors.muted, true: colors.primary + '80' }}
                thumbColor={autopayEnabled ? colors.primary : colors.mutedForeground}
              />
            }
            noBorder
          />
        </Section>

        {/* Appearance */}
        <Section title="APPEARANCE">
          <SettingRow
            icon="moon"
            label="Always Dark"
            sub="ROAM•OS is dark by design — warm editorial only"
            right={
              <View style={[styles.alwaysBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.alwaysText, { color: colors.mutedForeground }]}>LOCKED</Text>
              </View>
            }
            noBorder
          />
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <SettingRow icon="compass" label="ROAM•OS" sub="v1.0.0 · Premium travel companion for India" />
          <SettingRow icon="shield" label="Privacy" sub="All data stored locally on your device" noBorder />
        </Section>

        {/* ROAM wordmark footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerWordmark, { color: colors.primary + '40' }]}>ROAM•OS</Text>
          <Text style={[styles.footerTagline, { color: colors.mutedForeground }]}>
            Built for nomads exploring India
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  backBtn: { padding: 4 },
  screenTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 10,
  },
  sosTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginBottom: 4 },
  sosDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16, paddingRight: 30 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginLeft: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  rowSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  cityInfo: { flex: 1 },
  cityName: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  cityCoords: { fontSize: 10, fontFamily: 'Inter_400Regular', letterSpacing: 0.3, marginTop: 1 },
  activeMark: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  radiusOption: {
    flex: 1,
    minWidth: '28%',
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  radiusNum: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  radiusUnit: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  radiusNote: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 4, paddingBottom: 12 },
  alwaysBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  alwaysText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  footer: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  footerWordmark: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: 4 },
  footerTagline: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
