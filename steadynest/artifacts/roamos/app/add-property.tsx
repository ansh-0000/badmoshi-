import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Input } from '@/components/ui/Input';
import { useColors } from '@/hooks/useColors';
import {
  createUnverifiedPropertyLocationDraft,
  getPropertyLocationInputState,
  type PropertyLocationInputState,
} from '@/lib/propertyLocation';

type PropertyType = 'apartment' | 'house' | 'room' | 'co-living';

const PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'room', 'co-living'];

export default function AddPropertyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PropertyType>('apartment');
  const [rent, setRent] = useState('');
  const [propertyLocation, setPropertyLocation] = useState(() => createUnverifiedPropertyLocationDraft(''));
  const locationInputState = useMemo(
    () => getPropertyLocationInputState(propertyLocation.rawInput),
    [propertyLocation.rawInput],
  );

  const continueWithUnverifiedLocation = () => {
    const price = Number(rent);
    if (title.trim().length < 3 || !Number.isFinite(price) || price <= 0) {
      Alert.alert('Check the listing details', 'Add a title and positive monthly rent.');
      return;
    }

    // The live listing API and PostGIS index require a real map position.
    // This no-provider phase stores only the local form draft and must never
    // manufacture a position or send an incomplete create-listing payload.
    Alert.alert(
      'Location needs verification',
      'The address is saved, but its map position has not been verified yet. Connect location search before publishing this listing.',
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Add rental', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]}
        extraKeyboardSpace={16}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Create a rental listing</Text>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>Use INR and add a Delhi NCR property location.</Text>

        <View style={styles.locationSection}>
          <Input
            label="Property location"
            value={propertyLocation.rawInput}
            onChangeText={(value) => setPropertyLocation(createUnverifiedPropertyLocationDraft(value))}
            placeholder="Type an address or paste a Google Maps link"
            maxLength={500}
            autoCapitalize="sentences"
            autoCorrect={false}
            keyboardType="default"
            accessibilityLabel="Property location"
            accessibilityHint={locationInputState.error ?? 'Type an address or paste a Google Maps link. The link will not open automatically.'}
            error={locationInputState.error ?? undefined}
            leftIcon={<Feather name="map-pin" size={18} color={colors.primaryTint} />}
          />
          <Text style={[styles.locationHelper, { color: colors.mutedForeground }]}>{'Add the building, society, street or nearby landmark. We’ll use this to place the property on the map.'}</Text>
          <PropertyLocationStatus inputState={locationInputState} />
        </View>

        <Field label="Listing title" value={title} onChangeText={setTitle} placeholder="e.g. Sunlit 2BHK near Saket Metro" />
        <Field label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Key details for tenants" multiline />
        <Text style={[styles.label, { color: colors.foreground }]}>Property type</Text>
        <View style={styles.typeRow}>
          {PROPERTY_TYPES.map((option) => {
            const selected = option === type;
            return (
              <TouchableOpacity key={option} onPress={() => setType(option)} style={[styles.typeButton, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.muted : colors.card }]}>
                <Text style={[styles.typeText, { color: selected ? colors.primaryTint : colors.mutedForeground }]}>{option.replace('-', ' ')}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Field label="Monthly rent (INR)" value={rent} onChangeText={setRent} placeholder="25000" keyboardType="number-pad" />
      </KeyboardAwareScrollViewCompat>
      <KeyboardStickyView
        offset={{ opened: -8 }}
        style={[styles.submitBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}
      >
        <TouchableOpacity
          disabled={!locationInputState.canContinue}
          accessibilityRole="button"
          accessibilityState={{ disabled: !locationInputState.canContinue }}
          onPress={continueWithUnverifiedLocation}
          style={[styles.submit, { backgroundColor: colors.primary, opacity: locationInputState.canContinue ? 1 : 0.45 }]}
        >
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Continue</Text>
        </TouchableOpacity>
      </KeyboardStickyView>
    </View>
  );
}

function PropertyLocationStatus({ inputState }: { inputState: PropertyLocationInputState }) {
  const colors = useColors();
  if (!inputState.isValid) return null;

  const isMapsLink = inputState.kind === 'google_maps_url';
  const title = isMapsLink ? 'Google Maps link added' : 'Address entered';
  const body = isMapsLink
    ? 'We’ll read the place from this link when map search is connected.'
    : 'We’ll verify the exact map position when location search is connected.';

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${body}`}
      style={[styles.locationStatus, { backgroundColor: colors.muted, borderColor: colors.border }]}
    >
      <Feather name={isMapsLink ? 'link' : 'map-pin'} size={16} color={isMapsLink ? colors.accent : colors.primaryTint} />
      <View style={styles.locationStatusCopy}>
        <Text style={[styles.locationStatusTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.locationStatusBody, { color: colors.mutedForeground }]}>{body}</Text>
      </View>
    </View>
  );
}

function Field({ label, multiline = false, ...props }: { label: string; multiline?: boolean; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'number-pad' | 'decimal-pad' }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.multiline, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]} placeholderTextColor={colors.mutedForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, marginTop: 8 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 26 },
  field: { marginBottom: 16 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 13, fontFamily: 'Inter_400Regular', fontSize: 15 },
  multiline: { minHeight: 94, paddingTop: 12, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeButton: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: 13, paddingVertical: 10 },
  typeText: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'capitalize' },
  locationSection: { marginBottom: 16 },
  locationHelper: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: -8 },
  locationStatus: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 12 },
  locationStatusCopy: { flex: 1, gap: 2 },
  locationStatusTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  locationStatusBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  submitBar: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12 },
  submit: { minHeight: 52, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
