/**
 * ChatsScreen
 * ===========
 * Tela de lista de conversas - Design premium e minimalista
 */

import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChatsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = useCallback(async () => {
    try {
      const response = await api.get(`/chats?user_id=${user?.uid || ''}`);
      if (response.success && Array.isArray(response.chats)) {
        // Ordena por updated_at (mais recente primeiro)
        const sortedChats = [...response.chats].sort((a, b) => {
          const aDate = new Date(a.updated_at || a.created_at || 0);
          const bDate = new Date(b.updated_at || b.created_at || 0);
          return bDate - aDate;
        });
        setChats(sortedChats);
      }
    } catch (error) {
      // Erro de rede é esperado quando a API não está disponível
      if (__DEV__ && error.message?.includes('Network request failed')) {
        // Silencia erros de rede em desenvolvimento
      } else {
        console.warn('Erro ao carregar chats:', error.message || error);
      }
      setChats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  // Recarrega quando a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadChats();
      }
    }, [loadChats, loading])
  );

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChats();
  }, [loadChats]);

  // Resolve o problema do "piscar" usando requestAnimationFrame
  const handleChatPress = useCallback((chatId) => {
    // Pequeno delay para melhorar feedback visual antes da navegação
    requestAnimationFrame(() => {
      navigation.navigate('Chat', { chatId });
    });
  }, [navigation]);

  // Navega para nova conversa
  const handleNewChat = useCallback(() => {
    requestAnimationFrame(() => {
      navigation.navigate('Chat', { chatId: null });
    });
  }, [navigation]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 4) return `${diffWeeks}sem`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }, []);

  const renderChatItem = useCallback(({ item, index }) => {
    const hasPreview = item.last_message && item.last_message.trim().length > 0;
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.chatItem,
          pressed && styles.chatItemPressed,
        ]}
        onPress={() => handleChatPress(item.id)}
        android_ripple={{ color: colors.bg.secondary }}
      >
        {/* Avatar com gradiente sutil */}
        <View style={styles.chatAvatar}>
          <View style={styles.avatarInner}>
            <Ionicons 
              name="chatbubble-ellipses" 
              size={22} 
              color={colors.accent.primary} 
            />
          </View>
        </View>

        {/* Conteúdo */}
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {item.title || 'Chat sem título'}
            </Text>
            {item.updated_at && (
              <Text style={styles.chatTime}>
                {formatDate(item.updated_at)}
              </Text>
            )}
          </View>
          
          {hasPreview ? (
            <Text style={styles.chatPreview} numberOfLines={1}>
              {item.last_message}
            </Text>
          ) : (
            <Text style={styles.chatPreviewEmpty} numberOfLines={1}>
              Inicie uma conversa
            </Text>
          )}
        </View>

        {/* Indicador de seta */}
        <View style={styles.chatArrow}>
          <Ionicons 
            name="chevron-forward" 
            size={18} 
            color={colors.text.muted} 
          />
        </View>
      </Pressable>
    );
  }, [handleChatPress, formatDate]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons 
          name="chatbubbles-outline" 
          size={72} 
          color={colors.text.muted} 
        />
      </View>
      <Text style={styles.emptyText}>Nenhum chat ainda</Text>
      <Text style={styles.emptySubtext}>
        Toque no botão + para iniciar uma nova conversa
      </Text>
    </View>
  ), []);

  const keyExtractor = useCallback((item) => item.id?.toString() || Math.random().toString(), []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header minimalista */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversas</Text>
      </View>

      {/* Lista de Chats */}
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={chats.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
            progressViewOffset={20}
          />
        }
        // Otimizações de performance
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />

      {/* Botão de Nova Conversa (FAB) */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: insets.bottom + 16,
          },
          pressed && styles.fabPressed,
        ]}
        onPress={handleNewChat}
        android_ripple={{ 
          color: colors.accent.hover, 
          borderless: true,
          radius: 28,
        }}
      >
        <LinearGradient
          colors={[colors.accent.primary, colors.accent.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color={colors.bg.primary} />
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingTop: 4,
  },
  emptyList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.bg.primary,
  },
  chatItemPressed: {
    backgroundColor: colors.bg.secondary,
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    backgroundColor: colors.bg.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    // Sombra sutil para profundidade
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.2,
  },
  chatTime: {
    fontSize: 13,
    color: colors.text.muted,
    fontWeight: '500',
  },
  chatPreview: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  chatPreviewEmpty: {
    fontSize: 14,
    color: colors.text.muted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  chatArrow: {
    marginLeft: 8,
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
