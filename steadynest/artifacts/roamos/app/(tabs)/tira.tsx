import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  Image,
  Linking
} from 'react-native';
import { FlatList } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { useApp } from '@/context/AppContext';
import { API_BASE } from '@/constants/api';
import { getAccessToken } from '@/lib/api';
import { toFriendlyError, ApiError } from '@/lib/errorMessage';
import StayCard from '@/components/StayCard';
import { useTabBarClearance } from '@/constants/layout';

// Tira is deliberately a fixed dark ("Ink") screen regardless of the app's
// light/dark setting — same treatment as Onboarding, per SteadyNest.dc.html
// frame 7. It does not follow useColors()/theme.
const INK = '#14201A';
const ALABASTER = '#F9F8F4';
const GOLD = '#E2A73E';
const GOLD_DEEP = '#B5842C';
const MOSS = '#3A5245';

const QUICK_CHIPS = ['Explain my lease', 'Split rent', 'Moving checklist'];

interface Message {
  id: string;
  text: string;
  isAi: boolean;
  suggestedActions?: string[];
  recommendedStays?: any[];
  places?: any[];
}

export default function TiraScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const tabBarClearance = useTabBarClearance();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: `Namaste${user?.name ? ', ' + user.name.split(' ')[0] : ''} 👋 I can help you find a stay, understand your rent agreement, or plan a move. What's on your mind?`,
      isAi: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<any>>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: Message = { id: Date.now().toString(), text, isAi: false };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/guide/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();

      if (res.ok && data.response) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          isAi: true,
          suggestedActions: data.suggestedActions,
          recommendedStays: data.recommendedStays,
          places: data.places,
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new ApiError(data.error || 'Failed');
      }
    } catch (e: any) {
      // Never show the raw error to the user — log it for developers and
      // show a friendly message that still tells them what to do next.
      const friendly = toFriendlyError(e, "Tira couldn't respond just now. Please try again in a moment.");
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: friendly,
        isAi: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    return (
      <View style={[styles.messageWrapper, item.isAi ? styles.messageWrapperAi : styles.messageWrapperUser]}>
        {item.isAi && (
          <LinearGradient
            colors={[GOLD, GOLD_DEEP]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="creation" size={15} color={INK} />
          </LinearGradient>
        )}
        <View style={[
          styles.messageBubble,
          item.isAi
            ? { backgroundColor: 'rgba(249,248,244,0.07)', borderColor: 'rgba(249,248,244,0.09)', borderWidth: 1, borderTopLeftRadius: 8, borderTopRightRadius: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }
            : { backgroundColor: MOSS, borderTopRightRadius: 8, borderTopLeftRadius: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
        ]}>
          <Text style={[styles.messageText, { color: ALABASTER }]}>
            {item.text}
          </Text>

          {item.isAi && item.recommendedStays && item.recommendedStays.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 16, marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {item.recommendedStays.map((stay: any) => {
                const parsedImages = stay.images ? JSON.parse(stay.images) : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800"];
                const stayObj = {
                  ...stay,
                  image: parsedImages[0],
                  rating: 4.8,
                  reviews: 12,
                  verified: true,
                };
                return (
                  <View key={stay.id} style={{ width: 280, marginRight: 16 }}>
                    <StayCard
                      stay={stayObj}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/listing/${stay.id}`);
                      }}
                    />
                  </View>
                );
              })}
            </ScrollView>
          )}

          {item.isAi && item.places && item.places.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 16, marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {item.places.map((place: any, idx: number) => (
                <View key={idx} style={{ width: 240, marginRight: 16, backgroundColor: INK, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(249,248,244,0.12)' }}>
                  <Image source={{ uri: place.imageUrl }} style={{ width: '100%', height: 140 }} />
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: ALABASTER }} numberOfLines={1}>{place.name}</Text>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: 'rgba(249,248,244,0.55)', marginTop: 4 }}>{place.area}</Text>
                    <TouchableOpacity
                      style={{ marginTop: 12, backgroundColor: GOLD, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (place.lat && place.lng) {
                          Linking.openURL(`https://maps.google.com/?q=${place.lat},${place.lng}`);
                        } else {
                          Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(place.name + ' ' + place.area)}`);
                        }
                      }}
                    >
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: INK }}>View on Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {item.isAi && item.suggestedActions && item.suggestedActions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
            {item.suggestedActions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionChip}
                onPress={() => sendMessage(action)}
              >
                <Text style={styles.suggestionText}>{action}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: INK }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[GOLD + '40', 'transparent']}
          style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.5 }}
        />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <LinearGradient
          colors={[GOLD, GOLD_DEEP]}
          style={styles.headerAvatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="creation" size={24} color={INK} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Tira</Text>
          <Text style={styles.subtitle}>Your SteadyNest assistant</Text>
        </View>
        <View style={styles.aiPill}>
          <Text style={styles.aiPillText}>AI</Text>
        </View>
      </View>

      <FlatList
        style={{ flex: 1 }}
        ref={listRef}
        data={loading ? [...messages, { id: 'loading', text: 'Typing...', isAi: true }] : messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContent as any}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom dock — chips sit ABOVE the input in normal flow.
          The input used to be position:absolute, so it painted over the
          in-flow chips and its bounds swallowed their taps (the chips were
          correctly wired to sendMessage all along — the presses never
          reached them). Both are laid out in the same flex column now, so
          they can't overlap and nothing intercepts the chip touches. */}
      <View style={[styles.bottomDock, { paddingBottom: tabBarClearance }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {QUICK_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                sendMessage(chip);
              }}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ask Tira anything…"
            placeholderTextColor="rgba(249,248,244,0.5)"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <Feather name="loader" size={18} color={INK} />
            ) : (
              <Feather name="arrow-up" size={20} color={INK} />
            )}
          </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: ALABASTER,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(249,248,244,0.55)',
    marginTop: 2,
  },
  aiPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(226,167,62,0.16)',
  },
  aiPillText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: GOLD,
    letterSpacing: 0.6,
  },
  chatContent: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 24,
    maxWidth: '85%',
  },
  messageWrapperAi: {
    alignSelf: 'flex-start',
  },
  messageWrapperUser: {
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  messageBubble: {
    padding: 16,
  },
  messageText: {
    fontSize: 14.5,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  suggestionsScroll: {
    marginTop: 12,
    marginLeft: 34,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(226,167,62,0.3)',
    backgroundColor: 'rgba(226,167,62,0.15)',
    marginRight: 10,
  },
  suggestionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: GOLD_DEEP,
  },
  chipsRow: {
    flexGrow: 0,
    marginBottom: 4,
  },
  quickChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: 'rgba(249,248,244,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249,248,244,0.12)',
  },
  quickChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: ALABASTER,
  },
  bottomDock: {
    gap: 10,
  },
  inputContainer: {
    paddingHorizontal: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249,248,244,0.14)',
    backgroundColor: 'rgba(249,248,244,0.08)',
    borderRadius: 9999,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxHeight: 100,
    paddingVertical: 8,
    color: ALABASTER,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    backgroundColor: GOLD,
  },
});
