import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

// react-native-maps has no web implementation — it renders native platform
// views only. Metro picks this .web.tsx stub on web and the real
// components/MapView.tsx (react-native-maps) on iOS/Android, so the map you
// see here being a placeholder is expected on web, not a bug. Styled with
// the app's own tokens so the web build looks intentional rather than
// broken; the real map only appears on a device/emulator.
export const Marker = ({ coordinate, title, description, children }: any) => null;
export const Polyline = (props: any) => null;
export const PROVIDER_GOOGLE = 'google';

export default function MapView({ style, children }: any) {
  return (
    <View style={[style, styles.container]}>
      <View style={styles.iconCircle}>
        <Feather name="map" size={26} color="#3A5245" />
      </View>
      <Text style={styles.title}>Map preview</Text>
      <Text style={styles.subtitle}>The live map renders on iOS &amp; Android</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E6E3D8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: 'rgba(58,82,69,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#14201A',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    color: 'rgba(20,32,26,0.5)',
    fontSize: 12.5,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
});
