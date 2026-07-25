import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Mock components for Web to prevent react-native-maps crashes
export const Marker = ({ coordinate, title, description, children }: any) => null;
export const Polyline = (props: any) => null;
export const PROVIDER_GOOGLE = 'google';

export default function MapView({ style, children }: any) {
  return (
    <View style={[style, styles.container]}>
      <Feather name="map" size={48} color="#999" />
      <Text style={styles.text}>Map View (Native Only)</Text>
      {/* We don't render children (Markers) to avoid further errors */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#eaeaea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#666',
    marginTop: 12,
    fontFamily: 'Inter_400Regular',
  },
});
