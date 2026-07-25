import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import api from '@/lib/api';

const SUITES = [
  { id: 'standard', name: 'Standard Suite', priceMod: 0, desc: 'Shared bath, perfect for solo travelers.' },
  { id: 'deluxe', name: 'Deluxe Suite', priceMod: 5000, desc: 'Private bath, extra workspace.' },
  { id: 'premium', name: 'Premium Master', priceMod: 12000, desc: 'Largest room, panoramic views, en-suite.' },
];

export default function BookingSetupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [guests, setGuests] = useState(1);
  const [gender, setGender] = useState<'any' | 'male' | 'female'>('any');
  const [selectedSuite, setSelectedSuite] = useState('standard');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/listings/${id}`);
        if (!cancelled) setStay(data.data);
      } catch (err) {
        console.warn('Failed to fetch listing for booking', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!stay) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.foreground }}>Property not found.</Text>
      </View>
    );
  }

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const basePrice = stay.price;
    const suitePrice = SUITES.find(s => s.id === selectedSuite)?.priceMod || 0;
    const totalBase = basePrice + suitePrice;

    router.push({
      pathname: '/booking/invoice',
      params: {
        id,
        guests,
        suite: selectedSuite,
        basePrice: totalBase,
        title: stay.title,
      }
    });
  };

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Booking Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.propertyName, { color: colors.foreground }]}>{stay.name}</Text>
        <Text style={[styles.propertyLocation, { color: colors.mutedForeground }]}>{stay.location}</Text>

        {/* Mandatory Notification */}
        <View style={[styles.alertCard, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '40' }]}>
          <Feather name="alert-circle" size={20} color={colors.destructive} style={styles.alertIcon} />
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: colors.destructive }]}>Mandatory Requirement</Text>
            <Text style={[styles.alertText, { color: colors.foreground }]}>
              Please ensure you carry a valid Passport or Government ID and any required local IDs for check-in. Entry will be denied without valid documentation.
            </Text>
          </View>
        </View>

        {/* Guests Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Number of People</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity 
              style={[styles.stepperBtn, { backgroundColor: colors.muted }]} 
              onPress={() => {
                Haptics.selectionAsync();
                setGuests(Math.max(1, guests - 1));
              }}
            >
              <Feather name="minus" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: colors.foreground }]}>{guests}</Text>
            <TouchableOpacity 
              style={[styles.stepperBtn, { backgroundColor: colors.muted }]} 
              onPress={() => {
                Haptics.selectionAsync();
                setGuests(Math.min(4, guests + 1));
              }}
            >
              <Feather name="plus" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Gender Preference</Text>
          <View style={styles.genderRow}>
            {(['any', 'male', 'female'] as const).map(g => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderBtn, 
                  { 
                    backgroundColor: gender === g ? colors.primary : colors.card,
                    borderColor: gender === g ? colors.primary : colors.border
                  }
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setGender(g);
                }}
              >
                <Text style={[styles.genderText, { color: gender === g ? '#FFF' : colors.foreground }]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Suite Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Suite</Text>
          {SUITES.map(suite => (
            <TouchableOpacity
              key={suite.id}
              style={[
                styles.suiteCard,
                {
                  backgroundColor: selectedSuite === suite.id ? colors.primary + '10' : colors.card,
                  borderColor: selectedSuite === suite.id ? colors.primary : colors.border
                }
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedSuite(suite.id);
              }}
            >
              <View style={styles.suiteInfo}>
                <Text style={[styles.suiteName, { color: colors.foreground }]}>{suite.name}</Text>
                <Text style={[styles.suiteDesc, { color: colors.mutedForeground }]}>{suite.desc}</Text>
              </View>
              <Text style={[styles.suitePrice, { color: colors.foreground }]}>
                {suite.priceMod > 0 ? `+₹${suite.priceMod.toLocaleString('en-IN')}` : 'Base'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleNext}>
          <Text style={styles.primaryBtnText}>Next: Review Invoice</Text>
          <Feather name="arrow-right" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  propertyName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  propertyLocation: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
    marginBottom: 24,
  },
  alertCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  alertIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    minWidth: 20,
    textAlign: 'center',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  genderText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  suiteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  suiteInfo: {
    flex: 1,
    paddingRight: 12,
  },
  suiteName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  suiteDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  suitePrice: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 999,
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
