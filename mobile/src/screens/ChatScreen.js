/**
 * ChatScreen
 * ===========
 * Interface de chat completa com lista de mensagens e input
 */

import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { colors } from '../theme/colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../hooks/useChat';
import MessageItem from '../components/MessageItem';
import TypingIndicator from '../components/TypingIndicator';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, profile } = useAuth();
  const chatId = route?.params?.chatId;
  const insets = useSafeAreaInsets();
  
  const [inputText, setInputText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  const {
    messages,
    isLoadingHistory,
    isSending,
    error,
    sendMessage,
  } = useChat(chatId);

  // Estado do botão (habilitado ou não)
  const isButtonEnabled = inputText.trim() && !isSending;

  // Scroll automático para última mensagem
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Monitora teclado para ajustar layout
  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSubscription = Keyboard.addListener(
        'keyboardDidShow',
        (e) => {
          setKeyboardHeight(e.endCoordinates.height);
        }
      );
      const hideSubscription = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          // Reset imediato sem delay para evitar espaço extra
          setKeyboardHeight(0);
        }
      );

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }
    // iOS usa KeyboardAvoidingView, não precisa monitorar manualmente
  }, []);

  // Calcula padding bottom dinamicamente
  const getInputPaddingBottom = () => {
    if (Platform.OS === 'ios') {
      return insets.bottom + 12;
    }
    // Android: quando teclado está aberto, usa padding mínimo
    // quando fechado, usa padding padrão (sem ajuste extra)
    return keyboardHeight > 0 ? 12 : 12;
  };

  // Anima botão baseado no estado
  useEffect(() => {
    Animated.parallel([
      Animated.timing(buttonOpacity, {
        toValue: isButtonEnabled ? 1 : 0.4,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: isButtonEnabled ? 1 : 0.9,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isButtonEnabled, buttonOpacity, buttonScale]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending) {
      return;
    }

    // Animação de feedback ao pressionar
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();

    const messageText = inputText.trim();
    setInputText('');

    try {
      const success = await sendMessage(messageText);
      if (!success) {
        // Se falhou, restaura o texto
        setInputText(messageText);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setInputText(messageText);
    }
  }, [inputText, isSending, sendMessage, buttonScale]);

  const handleGoBack = useCallback(() => {
    requestAnimationFrame(() => {
      navigation.goBack();
    });
  }, [navigation]);

  const renderMessage = useCallback(({ item, index }) => {
    return <MessageItem message={item} isLast={index === messages.length - 1} />;
  }, [messages.length]);

  const renderFooter = useCallback(() => {
    // Mostra indicador quando está enviando ou aguardando resposta
    if (isSending) {
      return <TypingIndicator message="Luna está digitando..." />;
    }
    return null;
  }, [isSending]);

  const renderEmpty = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={colors.text.muted} />
        <Text style={styles.emptyText}>Inicie uma conversa</Text>
        <Text style={styles.emptySubtext}>
          Digite uma mensagem abaixo para começar
        </Text>
      </View>
    );
  }, []);

  const getHeaderTitle = () => {
    if (chatId) {
      // Poderia buscar o título do chat aqui
      return 'Chat';
    }
    return 'Nova Conversa';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={handleGoBack}
          style={styles.backButton}
          android_ripple={{ color: colors.bg.secondary, borderless: true }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.accent.primary} />
        </Pressable>
        
        <View style={styles.headerCenter}>
          <Text style={styles.title} numberOfLines={1}>
            {getHeaderTitle()}
          </Text>
          {isSending && (
            <Text style={styles.connectionStatus}>Processando...</Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {isLoadingHistory && (
            <ActivityIndicator size="small" color={colors.accent.primary} />
          )}
        </View>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <View style={[
          styles.contentWrapper,
          Platform.OS === 'android' && keyboardHeight > 0 && {
            marginBottom: keyboardHeight,
          }
        ]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id || item.timestamp || Math.random().toString()}
            contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.list}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            showsVerticalScrollIndicator={false}
            // Otimizações de performance
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
          />

          {/* Input Area */}
          <View style={[
            styles.inputContainer,
            {
              paddingBottom: getInputPaddingBottom(),
            }
          ]}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Digite sua mensagem..."
              placeholderTextColor={colors.text.muted}
              multiline
              maxLength={4000}
              editable={!isSending}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            
            <Animated.View
              style={[
                styles.sendButtonContainer,
                {
                  opacity: buttonOpacity,
                  transform: [{ scale: buttonScale }],
                },
              ]}
            >
              {isButtonEnabled ? (
                <Pressable
                  onPress={handleSend}
                  style={({ pressed }) => [
                    styles.sendButton,
                    pressed && styles.sendButtonPressed,
                  ]}
                  android_ripple={{ 
                    color: colors.accent.hover, 
                    borderless: true,
                    radius: 18,
                  }}
                >
                  <LinearGradient
                    colors={[colors.accent.primary, colors.accent.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendButtonGradient}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color={colors.bg.primary} />
                    ) : (
                      <Ionicons 
                        name="send" 
                        size={18} 
                        color={colors.bg.primary}
                      />
                    )}
                  </LinearGradient>
                </Pressable>
              ) : (
                <View style={[styles.sendButton, styles.sendButtonDisabled]}>
                  <Ionicons 
                    name="send" 
                    size={18} 
                    color={colors.text.muted}
                  />
                </View>
              )}
            </Animated.View>
          </View>
        </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  connectionStatus: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  retryButton: {
    padding: 8,
    borderRadius: 20,
  },
  keyboardView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  list: {
    paddingVertical: 16,
    paddingHorizontal: 8, // Reduz padding horizontal para dar mais espaço às bolhas
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 12,
  },
  inputContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    // paddingBottom será calculado dinamicamente no componente
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error + '20',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: colors.bg.secondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButtonContainer: {
    width: 36,
    height: 36,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    // Sombra para quando habilitado
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.primary,
    opacity: 0.6,
  },
  typingText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
});
