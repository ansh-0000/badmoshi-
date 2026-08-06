import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { Message } from '@/constants/data';
import api from '@/lib/api';
import { toFriendlyError } from '@/lib/errorMessage';
import { useChatClient } from '@/hooks/useChatClient';
import { useApp } from '@/context/AppContext';

// Real translation — POST /api/guide/translate is Gemini-backed. The
// endpoint only needs a target language (Gemini infers the source from the
// text itself), which is exactly what "translate this incoming message to
// English" needs — no separate language-detection step required.
async function translateToEnglish(text: string): Promise<string> {
  const { data } = await api.post('/guide/translate', { text, targetLanguage: 'english' });
  return data.translated;
}

function Bubble({ msg }: { msg: Message }) {
  const colors = useColors();
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    if (translation || translating) return;
    setTranslating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const translated = await translateToEnglish(msg.text);
      setTranslation(translated);
    } catch (err) {
      Alert.alert('Translation failed', toFriendlyError(err, "Couldn't translate that message."));
    } finally {
      setTranslating(false);
    }
  };

  const getStatusIcon = () => {
    if (msg.status === 'sending') return <Feather name="clock" size={10} color={colors.mutedForeground} />;
    if (msg.status === 'failed') return <Feather name="alert-circle" size={10} color={colors.vermillion} />;
    if (msg.status === 'read') return <Text style={{ color: '#34B7F1', fontSize: 10 }}>✓✓</Text>;
    if (msg.status === 'delivered') return <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>✓✓</Text>;
    if (msg.status === 'sent') return <Feather name="check" size={12} color={colors.mutedForeground} />;
    return null;
  };

  return (
    <Animated.View entering={FadeInUp.duration(250).springify()} layout={Layout.springify()} style={[styles.bubbleWrapper, msg.isOwn && styles.bubbleWrapperOwn]}>
      <View
        style={[
          styles.bubble,
          msg.isOwn
            ? { backgroundColor: colors.primary, borderTopRightRadius: 8, borderTopLeftRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }
            : {
                backgroundColor: colors.card,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 24,
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 2,
              },
          msg.status === 'failed' && { borderColor: colors.vermillion, borderWidth: 1 },
        ]}
      >
        <Text style={[styles.msgText, { color: msg.isOwn ? '#fff' : colors.foreground }]}>{msg.text}</Text>

        {!msg.isOwn && (
          <TouchableOpacity style={styles.translateRow} onPress={handleTranslate} disabled={translating}>
            {translating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="globe" size={13} color={colors.primary} />
            )}
            <Text style={[styles.translateLabel, { color: colors.primary }]}>
              {translation ? 'Translated to English' : translating ? 'Translating…' : 'Translate'}
            </Text>
          </TouchableOpacity>
        )}

        {translation && (
          <View style={[styles.translationCard, { backgroundColor: colors.background, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.translationText, { color: colors.foreground }]}>{translation}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: msg.isOwn ? 'flex-end' : 'flex-start' }}>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{msg.timestamp}</Text>
        {msg.isOwn && getStatusIcon()}
        {msg.status === 'failed' && <Text style={{ fontSize: 10, color: colors.vermillion }}>Tap to Retry</Text>}
      </View>
    </Animated.View>
  );
}

export default function ChatThreadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, name, role } = useLocalSearchParams<{ id: string; name?: string; role?: string }>();
  const { user } = useApp();

  const otherName = name || 'Chat';
  const isLandlord = role === 'landlord';

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);

  const handleMessageReceived = useCallback((newMsg: any) => {
    const isOwn = newMsg.senderId === user?.id;
    const msg: Message = {
      id: newMsg.id,
      clientId: newMsg.id,
      sender: isOwn ? 'You' : otherName,
      text: newMsg.text,
      timestamp: new Date(newMsg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isOwn,
      status: newMsg.status || 'delivered',
    };

    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) {
        return prev.map(m => (m.id === msg.id ? { ...m, status: msg.status } : m));
      }
      return [msg, ...prev];
    });
    setPartnerTyping(false);
  }, [user, otherName]);

  const handleTyping = useCallback((data: { userId: string; typing: boolean }) => {
    if (data.userId !== user?.id) setPartnerTyping(data.typing);
  }, [user]);

  const { isConnected, sendMessage, sendTypingEvent } = useChatClient({
    chatId: id,
    onMessageReceived: handleMessageReceived,
    onTyping: handleTyping,
    onMessageRead: (data) => {
      setMessages(prev => prev.map(m => (data.messageIds.includes(m.id) ? { ...m, status: 'read' } : m)));
    },
  });

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  const { data: historyMessages, isLoading: loading } = useQuery({
    queryKey: ['chatHistory', id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/chat/${id}/messages`);
        if (data.success && data.messages) {
          return data.messages.map((m: any) => ({
            id: m.id,
            clientId: m.id,
            sender: m.senderId === user?.id ? 'You' : otherName,
            text: m.text,
            timestamp: new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            isOwn: m.senderId === user?.id,
            status: m.status,
          }));
        }
        return [];
      } catch (err) {
        toFriendlyError(err, "Couldn't load this conversation.");
        return [];
      }
    },
    enabled: !!user && !!id,
  });

  useEffect(() => {
    if (historyMessages && messages.length === 0) {
      setMessages(historyMessages);
    }
  }, [historyMessages]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendTypingEvent(false);

    const tempMsg: Message = {
      id: Date.now().toString(),
      clientId: Date.now().toString(),
      sender: 'You',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isOwn: true,
      status: 'sending',
    };

    setMessages(prev => [tempMsg, ...prev]);
    setText('');

    const result = await sendMessage(trimmed);
    if (result) {
      setMessages(prev => prev.map(m => (m.id === tempMsg.id ? { ...m, id: result.id, status: result.status } : m)));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: colors.muted }]}>
          <Text style={[styles.headerAvatarInitial, { color: colors.primary }]}>{otherName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.roomName, { color: colors.foreground }]} numberOfLines={1}>{otherName}</Text>
            {isLandlord && (
              <View style={[styles.landlordTag, { backgroundColor: colors.accent + '2E' }]}>
                <Text style={[styles.landlordTagText, { color: '#8A6A22' }]}>Landlord</Text>
              </View>
            )}
          </View>
          <Text style={[styles.onlineCount, { color: isConnected ? colors.primary : colors.mutedForeground }]}>
            {isConnected ? 'Active now' : 'Reconnecting…'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert('Calling', "Voice calls aren't available in chat yet.")}
          style={styles.callBtn}
        >
          <Feather name="phone" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlashList
            data={messages}
            inverted
            keyExtractor={m => m.id}
            renderItem={({ item }) => <Bubble msg={item} />}
            contentContainerStyle={[styles.messages, { paddingBottom: 12, paddingTop: 12 }] as any}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              partnerTyping ? (
                <View style={[styles.bubbleWrapper, { alignSelf: 'flex-start', marginBottom: 8 }]}>
                  <View style={[styles.bubble, { backgroundColor: colors.card, borderTopLeftRadius: 8 }]}>
                    <Text style={[styles.msgText, { color: colors.foreground, fontStyle: 'italic', fontSize: 13 }]}>Typing...</Text>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: bottomInset + 8 }]}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.muted }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={text}
              onChangeText={(v) => {
                setText(v);
                sendTypingEvent(v.length > 0);
              }}
              placeholder={`Message ${otherName}…`}
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={send}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.muted }]}
            onPress={send}
            disabled={!text.trim()}
          >
            <Feather name="arrow-up" size={20} color={text.trim() ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerAvatar: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  headerAvatarInitial: { fontSize: 16, fontFamily: 'PlayfairDisplay_600SemiBold' },
  headerCenter: { flex: 1, gap: 2 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  roomName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flexShrink: 1 },
  landlordTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  landlordTagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  onlineCount: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  callBtn: { padding: 6 },
  messages: { paddingHorizontal: 16, paddingTop: 16, gap: 14, flexGrow: 1, justifyContent: 'flex-end' },
  bubbleWrapper: { gap: 3, maxWidth: '82%' },
  bubbleWrapperOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 16, paddingVertical: 13, maxWidth: '100%' },
  msgText: { fontSize: 14.5, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  translateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  translateLabel: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold' },
  translationCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  translationText: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  time: { fontSize: 10, fontFamily: 'Inter_400Regular', marginHorizontal: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 9999,
    paddingHorizontal: 18,
    paddingVertical: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
