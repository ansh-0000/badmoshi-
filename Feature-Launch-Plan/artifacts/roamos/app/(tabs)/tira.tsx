import React, { useState, useRef, useEffect } from 'react';
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

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { CITIES } from '@/constants/data';
import { API_BASE } from '@/constants/api';
import { getAccessToken } from '@/lib/api';
import { toFriendlyError } from '@/lib/errorMessage';
import { useChatClient } from '@/hooks/useChatClient';
import StayCard from '@/components/StayCard';

interface Message {
  id: string;
  text: string;
  isAi: boolean;
  suggestedActions?: string[];
  routeOverview?: { duration: string; cost: string };
  steps?: Array<{ mode: string; instruction: string; color: string }>;
  recommendedStays?: any[];
  places?: any[];
}

interface GroupMessage {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export default function GuideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentCityId, user } = useApp();
  
  const city = CITIES.find(c => c.id === currentCityId) ?? CITIES[0];
  
  const [activeTab, setActiveTab] = useState<'ai' | 'group'>('ai');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: `Namaste! I'm Tira, your hyper-local guide dedicated exclusively to Delhi. Whether you're visiting from another state or flying in internationally, I have you covered. Need the best Metro route, safety tips for Paharganj, or help negotiating in Sarojini? Just ask!`,
      isAi: true,
      suggestedActions: ["How do I use the Delhi Metro?", "Is it safe to go out at night?", "Where to get a SIM card?"],
    }
  ]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flashListRef = useRef<FlatList<any>>(null);
  const groupListRef = useRef<FlatList<any>>(null);

  const handleGroupMessageReceived = (newMsg: any) => {
    setGroupMessages(prev => {
      // Avoid optimistic dupes
      if (prev.some(m => m.id === newMsg.id)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: newMsg.id,
          sender: newMsg.senderId,
          senderName: newMsg.senderName || 'User',
          text: newMsg.text,
          timestamp: new Date(newMsg.timestamp).toISOString()
        }
      ];
    });
  };

  const { isConnected, sendMessage: sendSocketMessage } = useChatClient({
    chatId: currentCityId,
    onMessageReceived: handleGroupMessageReceived
  });

  useEffect(() => {
    if (activeTab === 'group') {
      fetchGroupMessages();
    }
  }, [activeTab, currentCityId]);

  const fetchGroupMessages = async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/chat/${currentCityId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          // data.messages is returned from latest to oldest from chatRoutes reverse chronological
          setGroupMessages(data.messages);
        }
      }
    } catch (e) {
      console.log('Failed to fetch group chat:', e);
    }
  };

  const sendAiMessage = async (text: string) => {
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
        body: JSON.stringify({
          question: text,
          city: currentCityId,
        }),
      });
      const data = await res.json();

      if (res.ok && data.response) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          isAi: true,
          suggestedActions: data.suggestedActions,
          routeOverview: data.routeOverview,
          steps: data.steps,
          recommendedStays: data.recommendedStays,
          places: data.places
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Failed');
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

  const sendGroupMessage = async (text: string) => {
    if (!text.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tempId = Date.now().toString();
    const optimisticMsg: GroupMessage = {
      id: tempId,
      sender: user?.id || 'me',
      senderName: user?.name || 'You',
      text,
      timestamp: new Date().toISOString()
    };
    
    // Add to bottom (chronological order)
    setGroupMessages(prev => [...prev, optimisticMsg]);
    setInput('');
    
    const result = await sendSocketMessage(text);
    if (result && result.status !== 'sending') {
       // Replace optimistic tempId with real server ID if needed, though useChatClient handles it.
       setGroupMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: result.id } : m));
    }
  };

  const handleSend = () => {
    if (activeTab === 'ai') sendAiMessage(input);
    else sendGroupMessage(input);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    return (
      <View style={[styles.messageWrapper, item.isAi ? styles.messageWrapperAi : styles.messageWrapperUser]}>
        {item.isAi && (
          <LinearGradient
            colors={[colors.tiraViolet, colors.tiraPink]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="robot-outline" size={16} color="#FFF" />
          </LinearGradient>
        )}
        <View style={[
          styles.messageBubble,
          { backgroundColor: item.isAi ? colors.card : colors.tiraViolet },
          item.isAi ? { borderTopLeftRadius: 4, borderColor: colors.border, borderWidth: 1, shadowColor: colors.tiraViolet, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 } : { borderTopRightRadius: 4, shadowColor: colors.tiraViolet, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }
        ]}>
          <Text style={[styles.messageText, { color: item.isAi ? colors.foreground : '#FFF' }]}>
            {item.text}
          </Text>

          {item.routeOverview && item.steps && (
            <View style={styles.routeTimeline}>
              <View style={[styles.routeOverviewBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.routeMetric}>
                  <Feather name="clock" size={14} color={colors.accent} />
                  <Text style={[styles.routeMetricText, { color: colors.foreground }]}>{item.routeOverview.duration}</Text>
                </View>
                <View style={styles.routeMetric}>
                  <Feather name="credit-card" size={14} color={colors.signalGreen} />
                  <Text style={[styles.routeMetricText, { color: colors.foreground }]}>{item.routeOverview.cost}</Text>
                </View>
              </View>

              {item.steps.map((step, idx) => (
                <View key={idx} style={styles.timelineStep}>
                  <View style={styles.timelineLineWrapper}>
                    <View style={[styles.timelineDot, { backgroundColor: step.color }]} />
                    {idx < item.steps!.length - 1 && <View style={[styles.timelineLine, { backgroundColor: step.color + '40' }]} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineMode, { color: step.color }]}>{step.mode}</Text>
                    <Text style={[styles.timelineInstruction, { color: colors.mutedForeground }]}>{step.instruction}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          {/* Render Property Recommendations if Tira found any */}
          {item.isAi && item.recommendedStays && item.recommendedStays.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ marginTop: 16, marginHorizontal: -16 }} // negate padding to let cards bleed
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {item.recommendedStays.map((stay: any, idx: number) => {
                // Adapt the DB model to the StayCard expected model
                const parsedImages = stay.images ? JSON.parse(stay.images) : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800"];
                const stayObj = {
                  ...stay,
                  image: parsedImages[0],
                  rating: 4.8, // Mocked for now
                  reviews: 12, // Mocked for now
                  verified: true,
                  remoteWorkScore: 9.0
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

          {/* Render Places if Tira found any */}
          {item.isAi && item.places && item.places.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ marginTop: 16, marginHorizontal: -16 }} 
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {item.places.map((place: any, idx: number) => (
                <View key={idx} style={{ width: 240, marginRight: 16, backgroundColor: colors.background, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                  <Image source={{ uri: place.imageUrl }} style={{ width: '100%', height: 140 }} />
                  <View style={{ padding: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.foreground, flex: 1 }} numberOfLines={1}>{place.name}</Text>
                      {place.rating && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.signalGreen + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <MaterialCommunityIcons name="star" size={12} color={colors.signalGreen} />
                          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.signalGreen, marginLeft: 2 }}>{place.rating}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>{place.area}</Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.foreground, marginTop: 8 }} numberOfLines={2}>{place.description}</Text>
                    
                    <TouchableOpacity 
                      style={{ marginTop: 12, backgroundColor: colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (place.lat && place.lng) {
                          Linking.openURL(`https://maps.google.com/?q=${place.lat},${place.lng}`);
                        } else {
                          Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(place.name + ' ' + place.area)}`);
                        }
                      }}
                    >
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFF' }}>View on Map</Text>
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
                style={[styles.suggestionChip, { borderColor: colors.tiraViolet + '50', backgroundColor: colors.tiraViolet + '15' }]}
                onPress={() => sendAiMessage(action)}
              >
                <Text style={[styles.suggestionText, { color: colors.tiraPink }]}>{action}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderGroupMessage = ({ item }: { item: GroupMessage }) => {
    const isMe = item.sender === user?.id;
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperUser : styles.messageWrapperAi]}>
        {!isMe && (
          <Text style={[styles.groupSenderName, { color: colors.mutedForeground }]}>{item.senderName}</Text>
        )}
        <View style={[
          styles.messageBubble,
          { backgroundColor: isMe ? colors.primary : colors.card },
          isMe ? { borderTopRightRadius: 4 } : { borderTopLeftRadius: 4, borderWidth: 1, borderColor: colors.border }
        ]}>
          <Text style={[styles.messageText, { color: isMe ? '#FFF' : colors.foreground }]}>
            {item.text}
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: colors.mutedForeground, alignSelf: isMe ? 'flex-end' : 'flex-start' }]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background, paddingBottom: 110 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      
      {activeTab === 'ai' ? (
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[colors.tiraViolet + '40', 'transparent']}
            style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
          />
          <LinearGradient
            colors={[colors.tiraPink + '30', 'transparent']}
            style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0.8 }}
          />
        </View>
      ) : (
        <LinearGradient
          colors={[colors.primary + '15', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.3 }}
        />
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>TIRA</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {activeTab === 'ai' ? 'Your AI travel concierge' : `${city.name} community`}
          </Text>
        </View>
        
        {/* Segmented Control */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.segmentBtn, activeTab === 'ai' && { backgroundColor: colors.tiraViolet }]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('ai');
            }}
          >
            <Text style={[styles.segmentText, { color: activeTab === 'ai' ? '#FFF' : colors.mutedForeground }]}>AI Guide</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentBtn, activeTab === 'group' && { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('group');
            }}
          >
            <Text style={[styles.segmentText, { color: activeTab === 'group' ? '#FFF' : colors.mutedForeground }]}>Local Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      {activeTab === 'ai' ? (
        <View style={{ flex: 1 }}>
          {/* Delhi Quick Actions Header */}
          <View style={{ paddingTop: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {[
                { label: "🚇 Metro Routes", query: "What is the fastest metro route from here to..." },
                { label: "🛺 Avoid Scams", query: "What are the top auto-rickshaw scams to avoid in Delhi?" },
                { label: "🥘 Safe Street Food", query: "Where can I eat safe street food in Delhi?" },
                { label: "🏥 Medical Emergency", query: "I need an international standard hospital in Delhi." }
              ].map((chip, idx) => (
                <TouchableOpacity 
                  key={idx}
                  onPress={() => {
                    setInput(chip.query);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={{
                    backgroundColor: colors.tiraViolet + '15',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: colors.tiraViolet + '30'
                  }}
                >
                  <Text style={{ color: colors.tiraViolet, fontFamily: 'Inter_500Medium', fontSize: 13 }}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            style={{ flex: 1 }}
            ref={flashListRef}
            data={loading ? [...messages, { id: 'loading', text: 'Typing...', isAi: true, suggestedActions: [] }] : messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={[styles.chatContent, { paddingBottom: 120 }] as any}
            onContentSizeChange={() => flashListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flashListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <FlatList
            style={{ flex: 1 }}
            ref={groupListRef}
            data={groupMessages}
            keyExtractor={item => item.id}
            renderItem={renderGroupMessage}
            contentContainerStyle={[styles.chatContent, { paddingBottom: 120 }] as any}
            onContentSizeChange={() => groupListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => groupListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="message-square" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyStateText, { color: colors.mutedForeground }]}>No messages yet. Be the first to say hi!</Text>
            </View>
          }
        />
      )}

      {/* Input Area */}
      <View style={[styles.inputContainer, { bottom: insets.bottom + (Platform.OS === 'web' ? 100 : 90) }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={activeTab === 'ai' ? "Ask Tira anything..." : "Message the group..."}
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: input.trim() ? (activeTab === 'ai' ? colors.tiraViolet : colors.primary) : colors.muted }]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <Feather name="loader" size={16} color={colors.background} />
            ) : (
              <Feather name="arrow-up" size={18} color={input.trim() ? '#FFF' : colors.mutedForeground} />
            )}
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    width: 160,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  segmentText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
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
  groupSenderName: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
    marginLeft: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 20,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
    fontFamily: 'Inter_500Medium',
  },
  suggestionsScroll: {
    marginTop: 12,
    marginLeft: 34,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  suggestionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  routeTimeline: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  routeOverviewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  routeMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeMetricText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginLeft: 8,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineLineWrapper: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    height: 40,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
  },
  timelineMode: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  timelineInstruction: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  inputContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 32,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  }
});
