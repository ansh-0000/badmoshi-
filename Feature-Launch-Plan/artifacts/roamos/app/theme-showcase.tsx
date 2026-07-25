import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';

// UI Components
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { H1, H2, H3, H4, P, Label, Caption } from '@/components/ui/Typography';

export default function ThemeShowcaseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [bottomModalVisible, setBottomModalVisible] = useState(false);
  const [textVal, setTextVal] = useState('');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40, paddingTop: insets.top + 20 }]}
    >
      <Stack.Screen options={{ title: 'Theme Showcase' }} />

      <View style={styles.header}>
        <Button 
          variant="ghost" 
          size="icon" 
          leftIcon={<Feather name="arrow-left" size={24} color={colors.foreground} />} 
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <H1>Design System</H1>
      </View>
      <P style={{ color: colors.mutedForeground, marginBottom: 32 }}>Phase 2 Primitives</P>

      <Section title="Typography">
        <H1>Heading 1</H1>
        <H2>Heading 2</H2>
        <H3>Heading 3</H3>
        <H4>Heading 4</H4>
        <P>Body Text — The quick brown fox jumps over the lazy dog. Inter regular is used for most reading experiences.</P>
        <Label>LABEL TEXT</Label>
        <Caption>Caption text for subtle hints.</Caption>
      </Section>

      <Section title="Colors">
        <View style={styles.colorGrid}>
          <ColorSwatch color={colors.primary} label="Primary" />
          <ColorSwatch color={colors.secondary} label="Secondary" />
          <ColorSwatch color={colors.background} label="Background" />
          <ColorSwatch color={colors.card} label="Card" />
          <ColorSwatch color={colors.destructive} label="Destructive" />
          <ColorSwatch color={colors.muted} label="Muted" />
          <ColorSwatch color={colors.accent} label="Accent" />
          <ColorSwatch color={colors.tiraViolet} label="Tira Violet" />
        </View>
      </Section>

      <Section title="Buttons">
        <View style={styles.row}>
          <Button title="Primary" />
          <Button title="Secondary" variant="secondary" />
        </View>
        <View style={styles.row}>
          <Button title="Outline" variant="outline" />
          <Button title="Destructive" variant="destructive" />
        </View>
        <View style={styles.row}>
          <Button title="Ghost" variant="ghost" />
          <Button title="Loading" loading />
        </View>
        <View style={styles.row}>
          <Button title="With Icon" leftIcon={<Feather name="compass" size={18} color={colors.primaryForeground} />} />
          <Button size="icon" leftIcon={<Feather name="heart" size={18} color={colors.primaryForeground} />} />
        </View>
      </Section>

      <Section title="Inputs">
        <Input placeholder="Default Input" />
        <Input placeholder="With Icon" leftIcon={<Feather name="search" size={18} color={colors.mutedForeground} />} />
        <Input label="Email Address" placeholder="hello@steadynest.com" />
        <Input 
          label="Password" 
          placeholder="••••••••" 
          secureTextEntry 
          error="Password must be at least 8 characters"
        />
      </Section>

      <Section title="Cards">
        <Card>
          <CardHeader>
            <H3>Elevated Card</H3>
          </CardHeader>
          <CardContent>
            <P>This is a standard card using the elevated variant. It casts a soft shadow.</P>
          </CardContent>
          <CardFooter>
            <Button title="Action" size="sm" />
          </CardFooter>
        </Card>

        <Card variant="outline" style={{ marginTop: 16 }}>
          <CardHeader>
            <H3>Outline Card</H3>
          </CardHeader>
          <CardContent>
            <P>This card has no shadow, just a subtle border.</P>
          </CardContent>
        </Card>
      </Section>

      <Section title="Chips">
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          <Chip label="Filter 1" />
          <Chip label="Filter 2" variant="outline" />
          <Chip label="Active" active />
        </View>
      </Section>

      <Section title="Modals">
        <View style={styles.row}>
          <Button title="Center Modal" onPress={() => setModalVisible(true)} />
          <Button title="Bottom Modal" onPress={() => setBottomModalVisible(true)} />
        </View>
      </Section>

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} variant="center">
        <H3 style={{ marginBottom: 12 }}>Center Modal</H3>
        <P style={{ marginBottom: 24 }}>This is a centered modal, ideal for alerts and confirmations.</P>
        <Button title="Got it" onPress={() => setModalVisible(false)} />
      </Modal>

      <Modal visible={bottomModalVisible} onClose={() => setBottomModalVisible(false)} variant="bottom">
        <H3 style={{ marginBottom: 12 }}>Bottom Sheet</H3>
        <P style={{ marginBottom: 24 }}>This is a bottom sheet, ideal for options and menus on mobile.</P>
        <Button title="Close" onPress={() => setBottomModalVisible(false)} variant="secondary" />
      </Modal>

    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <H4 style={{ marginBottom: 16, color: colors.foreground }}>{title}</H4>
      <View style={styles.sectionContent}>{children}</View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </View>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.swatchContainer}>
      <View style={[styles.swatch, { backgroundColor: color, borderColor: colors.border }]} />
      <Caption style={{ textAlign: 'center' }}>{label}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 16,
    paddingHorizontal: 0,
    width: 44,
  },
  section: {
    marginBottom: 32,
  },
  sectionContent: {
    gap: 16,
  },
  divider: {
    height: 1,
    marginTop: 32,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  swatchContainer: {
    alignItems: 'center',
    width: 70,
    gap: 8,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  }
});
