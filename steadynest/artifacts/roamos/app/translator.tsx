import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';

import { useColors } from '@/hooks/useColors';
import api from '@/lib/api';
import { toFriendlyError } from '@/lib/errorMessage';

// ── GPS → Language Auto-Detection Table ──────────────────────────────────────
const REGION_LANGUAGES: {
  name: string;
  lang: string;
  native: string;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}[] = [
  { name: 'Tamil Nadu', lang: 'tamil', native: 'தமிழ்', bounds: { minLat: 8.0, maxLat: 13.5, minLng: 76.0, maxLng: 80.5 } },
  { name: 'Kerala', lang: 'malayalam', native: 'മലയാളം', bounds: { minLat: 8.2, maxLat: 12.8, minLng: 74.8, maxLng: 77.4 } },
  { name: 'Karnataka', lang: 'kannada', native: 'ಕನ್ನಡ', bounds: { minLat: 11.5, maxLat: 18.5, minLng: 74.0, maxLng: 78.5 } },
  { name: 'West Bengal', lang: 'bengali', native: 'বাংলা', bounds: { minLat: 21.5, maxLat: 27.2, minLng: 86.0, maxLng: 89.9 } },
  { name: 'Gujarat', lang: 'gujarati', native: 'ગુજરાતી', bounds: { minLat: 20.1, maxLat: 24.7, minLng: 68.1, maxLng: 74.5 } },
  { name: 'Maharashtra', lang: 'marathi', native: 'मराठी', bounds: { minLat: 15.6, maxLat: 22.0, minLng: 72.6, maxLng: 80.9 } },
  { name: 'India', lang: 'hindi', native: 'हिन्दी', bounds: { minLat: 6.0, maxLat: 37.0, minLng: 68.0, maxLng: 97.5 } },
  { name: 'Japan', lang: 'japanese', native: '日本語', bounds: { minLat: 24.0, maxLat: 46.0, minLng: 122.0, maxLng: 153.0 } },
  { name: 'Thailand', lang: 'thai', native: 'ไทย', bounds: { minLat: 5.5, maxLat: 20.5, minLng: 97.3, maxLng: 105.7 } },
  { name: 'France', lang: 'french', native: 'Français', bounds: { minLat: 41.3, maxLat: 51.1, minLng: -5.1, maxLng: 9.6 } },
  { name: 'Spain', lang: 'spanish', native: 'Español', bounds: { minLat: 36.0, maxLat: 43.8, minLng: -9.3, maxLng: 4.3 } },
  { name: 'Germany', lang: 'german', native: 'Deutsch', bounds: { minLat: 47.3, maxLat: 55.1, minLng: 5.9, maxLng: 15.0 } },
  { name: 'Indonesia', lang: 'indonesian', native: 'Bahasa', bounds: { minLat: -11.0, maxLat: 6.0, minLng: 95.0, maxLng: 141.0 } },
  { name: 'Vietnam', lang: 'vietnamese', native: 'Tiếng Việt', bounds: { minLat: 8.2, maxLat: 23.4, minLng: 102.1, maxLng: 109.5 } },
];

// Real translation goes through POST /api/guide/translate (Gemini-backed).
// There is no honest offline/mock fallback for translation the way Tira's
// Q&A has canned topic answers — if the AI key isn't configured, the backend
// says so plainly and this screen surfaces that instead of pretending.
async function translateText(text: string, targetLanguage: string): Promise<{ translated: string; transliteration: string | null }> {
  const { data } = await api.post('/guide/translate', { text, targetLanguage });
  return { translated: data.translated, transliteration: data.transliteration ?? null };
}

interface ConversationItem {
  id: string;
  original: string;
  translated: string;
  transliteration: string | null;
  targetLang: string;
  targetNative: string;
  timestamp: string;
}

function detectLanguageFromCoords(lat: number, lng: number): { lang: string; native: string; region: string } {
  for (const region of REGION_LANGUAGES) {
    const { bounds } = region;
    if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
      return { lang: region.lang, native: region.native, region: region.name };
    }
  }
  return { lang: 'hindi', native: 'हिन्दी', region: 'Unknown (default: Hindi)' };
}

export default function TranslatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'done' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);

  const [detectedLang, setDetectedLang] = useState('hindi');
  const [detectedNative, setDetectedNative] = useState('हिन्दी');
  const [detectedRegion, setDetectedRegion] = useState('Detecting...');
  const [manualOverride, setManualOverride] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashListRef = useRef<FlashListRef<any>>(null);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 16);

  useEffect(() => {
    if (manualOverride) return;
    (async () => {
      try {
        const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
        if (locStatus !== 'granted') {
          setDetectedRegion('Permission denied (default: Hindi)');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const result = detectLanguageFromCoords(loc.coords.latitude, loc.coords.longitude);
        setDetectedLang(result.lang);
        setDetectedNative(result.native);
        setDetectedRegion(result.region);
      } catch (err) {
        console.warn('GPS detection failed', err);
        setDetectedRegion('GPS unavailable (default: Hindi)');
      }
    })();
  }, [manualOverride]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.6, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const cyclableLanguages = REGION_LANGUAGES.map(r => ({ lang: r.lang, native: r.native, region: r.name }));
  const cycleLanguage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setManualOverride(true);
    const currentIdx = cyclableLanguages.findIndex(l => l.lang === detectedLang);
    const nextIdx = (currentIdx + 1) % cyclableLanguages.length;
    const next = cyclableLanguages[nextIdx];
    setDetectedLang(next.lang);
    setDetectedNative(next.native);
    setDetectedRegion(next.region + ' (manual)');
  };

  const runTranslation = async (textToTranslate: string) => {
    setStatus('processing');
    setErrorText('');
    try {
      const { translated, transliteration } = await translateText(textToTranslate, detectedLang);
      const newItem: ConversationItem = {
        id: Date.now().toString(),
        original: textToTranslate,
        translated,
        transliteration,
        targetLang: detectedLang,
        targetNative: detectedNative,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      };
      setConversation(prev => [...prev, newItem]);
      setInputText('');
      setStatus('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => flashListRef.current?.scrollToEnd({ animated: true }), 300);
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setErrorText(toFriendlyError(err, "Couldn't translate that. Please try again."));
      setStatus('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsRecording(false);
      setStatus('processing');
      try {
        if (recording) {
          await recording.stopAndUnloadAsync();
          setRecording(null);
        }
      } catch (err) {}

      // Voice-to-text itself is still a stand-in (real speech recognition is
      // a separate, larger piece of work) — but the translation of whatever
      // text results is real, not a canned string.
      const textToTranslate = inputText.trim() || "How much is this?";
      runTranslation(textToTranslate);
    } else {
      setStatus('listening');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(rec);
        setIsRecording(true);
      } catch (err) {
        console.warn('Recording failed, running in simulation mode', err);
        setIsRecording(true);
      }
    }
  };

  const quickTranslate = () => {
    const textToTranslate = inputText.trim();
    if (!textToTranslate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    runTranslation(textToTranslate);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + '20', colors.background]}
        style={[styles.headerGradient, { paddingTop: topInset + 16 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.foreground }]}>Say It Right</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Live Voice Translator</Text>
          </View>
        </View>

        <View style={styles.langRow}>
          <View style={styles.langBox}>
            <Text style={styles.langLabel}>YOU SPEAK</Text>
            <Text style={styles.langValue}>English</Text>
          </View>
          <Feather name="arrow-right" size={18} color={colors.mutedForeground} />
          <TouchableOpacity style={[styles.langBox, styles.langBoxActive, { borderColor: colors.primary + '60' }]} onPress={cycleLanguage}>
            <Text style={styles.langLabel}>LOCAL ({detectedRegion.split(' ')[0].toUpperCase()})</Text>
            <Text style={[styles.langValue, { color: colors.primary }]}>{detectedNative}</Text>
            <Text style={styles.langHint}>TAP TO CHANGE</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlashList
        ref={flashListRef}
        data={conversation}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.conversationList, { paddingBottom: 200 }] as any}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flashListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flashListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="mic" size={40} color={colors.primary + '40'} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Say Something</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Speak in English below and it will translate{'\n'}and play aloud in {detectedNative} for you.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.convItem}>
            <View style={[styles.convBubble, styles.convBubbleOwn, { backgroundColor: colors.muted }]}>
              <Text style={[styles.convBubbleLabel, { color: colors.mutedForeground }]}>YOU SAID</Text>
              <Text style={[styles.convBubbleText, { color: colors.foreground }]}>"{item.original}"</Text>
              <Text style={[styles.convTime, { color: colors.mutedForeground }]}>{item.timestamp}</Text>
            </View>
            <View style={styles.convArrow}>
              <Feather name="arrow-down" size={16} color={colors.primary} />
            </View>
            <LinearGradient
              colors={[colors.primary + '15', colors.primary + '05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.convBubble, styles.convBubbleTira, { borderColor: colors.primary + '30' }]}
            >
              <View style={styles.tiraBubbleHeader}>
                <Text style={[styles.convBubbleLabel, { color: colors.primary }]}>LOCAL · {item.targetNative}</Text>
                <TouchableOpacity style={{ padding: 4 }}>
                  <Feather name="volume-2" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.convBubbleText, { color: colors.foreground }]}>{item.translated}</Text>
              {!!item.transliteration && (
                <Text style={[styles.convTransliteration, { color: colors.mutedForeground }]}>
                  "{item.transliteration}"
                </Text>
              )}
            </LinearGradient>
          </View>
        )}
      />

      {status === 'processing' && (
        <View style={[styles.statusBar, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.statusText, { color: colors.primary }]}>Translating...</Text>
        </View>
      )}
      {status === 'done' && (
        <View style={[styles.statusBar, { backgroundColor: colors.signalGreen + '15' }]}>
          <Feather name="check" size={14} color={colors.signalGreen} />
          <Text style={[styles.statusText, { color: colors.signalGreen }]}> Translated</Text>
        </View>
      )}
      {status === 'error' && (
        <View style={[styles.statusBar, { backgroundColor: colors.destructive + '15' }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.statusText, { color: colors.destructive }]}> {errorText}</Text>
        </View>
      )}

      <View style={[styles.inputArea, { paddingBottom: bottomInset + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
            placeholder="Or type to translate..."
            placeholderTextColor={colors.mutedForeground}
            value={inputText}
            onChangeText={setInputText}
            multiline
            onSubmitEditing={quickTranslate}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : colors.muted }]}
            onPress={quickTranslate}
            disabled={!inputText.trim()}
          >
            <Feather name="send" size={18} color={inputText.trim() ? '#fff' : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.fabRow}>
          <Animated.View
            style={[
              styles.fabPulseRing,
              {
                backgroundColor: isRecording ? colors.primary + '30' : 'transparent',
                borderColor: isRecording ? colors.primary + '40' : 'transparent',
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: isRecording ? colors.primary : colors.card, borderColor: colors.border, borderWidth: isRecording ? 0 : 1 }]}
            onPress={toggleRecording}
            activeOpacity={0.8}
          >
            <Feather name={isRecording ? 'square' : 'mic'} size={28} color={isRecording ? '#fff' : colors.primary} />
          </TouchableOpacity>
          {isRecording && (
            <Text style={[styles.listeningLabel, { color: colors.primary }]}>Listening...</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  langBox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langBoxActive: {
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  langLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginBottom: 4,
    color: '#888',
  },
  langValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  langHint: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    color: '#aaa',
    marginTop: 4,
    letterSpacing: 0.6,
  },
  conversationList: {
    padding: 20,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  convItem: {
    marginBottom: 24,
  },
  convBubble: {
    padding: 16,
    borderRadius: 16,
    maxWidth: '92%',
  },
  convBubbleOwn: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  convBubbleTira: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  tiraBubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  convBubbleLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  convBubbleText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  convTransliteration: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginTop: 4,
  },
  convTime: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    textAlign: 'right',
  },
  convArrow: {
    alignSelf: 'center',
    marginVertical: 6,
  },
  statusBar: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  inputArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    maxHeight: 100,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  fabPulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  listeningLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
  },
});
