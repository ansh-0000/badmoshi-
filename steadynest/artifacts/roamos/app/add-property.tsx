import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, router } from 'expo-router';

import { useColors } from '@/hooks/useColors';
import api from '@/lib/api';

type PropertyType = 'apartment' | 'house' | 'room' | 'co-living';

const PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'room', 'co-living'];

export default function AddPropertyScreen() {
  const colors = useColors();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PropertyType>('apartment');
  const [rent, setRent] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const price = Number(rent);
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (title.trim().length < 3 || !Number.isFinite(price) || price <= 0 || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert('Check the listing details', 'Add a title, positive monthly rent, latitude and longitude.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/listings', {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        price,
        currency: 'INR',
        address: address.trim() || undefined,
        lat,
        lng,
      });
      router.replace('/(landlord)/listings');
    } catch {
      Alert.alert('Listing not created', 'Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Add rental', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.foreground }]}>Create a rental listing</Text>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>Use INR and a Delhi NCR property location. Coordinates are required for nearby search.</Text>

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
        <Field label="Address (optional)" value={address} onChangeText={setAddress} placeholder="Saket, New Delhi" />
        <Field label="Latitude" value={latitude} onChangeText={setLatitude} placeholder="28.5245" keyboardType="decimal-pad" />
        <Field label="Longitude" value={longitude} onChangeText={setLongitude} placeholder="77.2066" keyboardType="decimal-pad" />

        <TouchableOpacity disabled={submitting} onPress={() => void submit()} style={[styles.submit, { backgroundColor: colors.primary, opacity: submitting ? 0.65 : 1 }]}>
          {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Create listing</Text>}
        </TouchableOpacity>
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 40 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, marginTop: 8 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 26 },
  field: { marginBottom: 16 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 13, fontFamily: 'Inter_400Regular', fontSize: 15 },
  multiline: { minHeight: 94, paddingTop: 12, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeButton: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: 13, paddingVertical: 10 },
  typeText: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'capitalize' },
  submit: { minHeight: 52, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  submitText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
