/**
 * MessageItem
 * ===========
 * Componente para renderizar uma mensagem individual no chat
 * Layout otimizado com bolhas maiores e avatares bem posicionados
 */

import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import MarkdownRenderer from './MarkdownRenderer';
import { cleanContent } from '../utils/messageUtils';

export default function MessageItem({ message, isLast }) {
  const { user } = useAuth();
  const isUser = message.role === 'user';
  const isStreaming = message.streaming || false;

  const formatTime = useMemo(() => {
    if (!message.timestamp) return '';
    const date = new Date(message.timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, [message.timestamp]);

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {/* Layout: Avatar posicionado acima/fora da bolha para não limitar largura */}
      {!isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.assistantAvatar}>
            <Ionicons
              name="sparkles"
              size={16}
              color={colors.accent.primary}
            />
          </View>
        </View>
      )}

      {/* Container da mensagem com largura maior */}
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.assistantMessageContainer]}>
        {/* Header com nome e timestamp (apenas para assistente) */}
        {!isUser && (
          <View style={styles.header}>
            <Text style={styles.name}>Luna</Text>
            {formatTime && (
              <Text style={styles.timestamp}>{formatTime}</Text>
            )}
          </View>
        )}

        {/* Bolha de mensagem */}
        {isUser ? (
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.55)', 'rgba(37, 99, 235, 0.45)', 'rgba(59, 130, 246, 0.50)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.userBubble]}
          >
            <View style={styles.bubbleContent}>
              <MarkdownRenderer content={cleanContent(message.content || '')} isStreaming={isStreaming} />
              {isStreaming && (
                <View style={styles.streamingIndicator}>
                  <View style={[styles.cursor, styles.userCursor]} />
                </View>
              )}
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.assistantBubble]}>
            <View style={styles.bubbleContent}>
              <MarkdownRenderer content={cleanContent(message.content || '')} isStreaming={isStreaming} />
              {isStreaming && (
                <View style={styles.streamingIndicator}>
                  <View style={[styles.cursor, styles.assistantCursor]} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Timestamp para usuário (abaixo da bolha) */}
        {isUser && formatTime && (
          <Text style={styles.userTimestamp}>{formatTime}</Text>
        )}
      </View>

      {/* Avatar do usuário (direita) */}
      {isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.userAvatar}>
            <Ionicons
              name="person"
              size={16}
              color={colors.accent.primary}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 8, // Mais espaço nas laterais
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 2, // Alinha com a base da bolha
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    maxWidth: '88%', // Muito mais espaço para as bolhas
    minWidth: 120,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    paddingLeft: 4,
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  timestamp: {
    fontSize: 10,
    color: colors.text.muted,
  },
  bubble: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  userBubble: {
    // Sem borda - apenas gradiente
  },
  assistantBubble: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border,
  },
  bubbleContent: {
    position: 'relative',
    zIndex: 1,
  },
  userTimestamp: {
    fontSize: 10,
    color: colors.text.muted,
    marginTop: 4,
    marginRight: 4,
    textAlign: 'right',
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cursor: {
    width: 2,
    height: 16,
    marginLeft: 2,
  },
  userCursor: {
    backgroundColor: colors.accent.primary,
  },
  assistantCursor: {
    backgroundColor: colors.accent.primary,
  },
});
