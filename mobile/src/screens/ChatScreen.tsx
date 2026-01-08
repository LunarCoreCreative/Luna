import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { ChevronLeft, Brain, Send, Square } from 'lucide-react-native';
import { theme } from '../theme';
import { RootStackParamList } from '../types';
import { ChatBubble } from '../components/ChatBubble';
import { GlassBox } from '../components/GlassBox';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import * as Haptics from 'expo-haptics';

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

const ChatScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<ChatRouteProp>();
    const [inputText, setInputText] = React.useState('');
    const flashListRef = useRef<FlashList<any>>(null);

    const { profile, user } = useAuth();
    const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário';

    const {
        messages,
        isStreaming,
        isThinking,
        setIsThinking,
        sendMessage,
        stopGeneration
    } = useChat(displayName);

    const handleSend = () => {
        if (!inputText.trim() || isStreaming) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        sendMessage(inputText.trim());
        setInputText('');
    };

    useEffect(() => {
        if (messages.length > 0) {
            flashListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages.length]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ChevronLeft size={24} color={theme.colors.text} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Luna</Text>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Online</Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setIsThinking(!isThinking);
                    }}
                    style={[styles.thinkingButton, isThinking && styles.thinkingActive]}
                >
                    <Brain size={20} color={isThinking ? theme.colors.violet : theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Messages List */}
            <View style={styles.listContainer}>
                <FlashList
                    ref={flashListRef}
                    data={messages}
                    renderItem={({ item, index }) => (
                        <ChatBubble
                            message={item}
                            isStreaming={index === messages.length - 1 && isStreaming}
                        />
                    )}
                    estimatedItemSize={100}
                    contentContainerStyle={styles.listContent}
                    keyExtractor={(item) => item.id}
                />
            </View>

            {/* Input Bar */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <GlassBox style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Digite sua mensagem..."
                        placeholderTextColor={theme.colors.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline={true}
                        maxHeight={120}
                    />

                    {isStreaming ? (
                        <TouchableOpacity onPress={stopGeneration} style={styles.stopButton}>
                            <Square size={16} fill="#fff" color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!inputText.trim()}
                            style={[styles.sendButton, !inputText.trim() && styles.sendDisabled]}
                        >
                            <Send size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </GlassBox>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
        marginTop: Platform.OS === 'android' ? 40 : 0,
    },
    iconButton: {
        padding: 8,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.success,
    },
    statusText: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    thinkingButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
    },
    thinkingActive: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        padding: theme.spacing.md,
    },
    inputContainer: {
        margin: theme.spacing.md,
        marginBottom: Platform.OS === 'ios' ? 10 : theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 8,
        paddingLeft: 16,
        borderRadius: 24,
    },
    input: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 16,
        paddingVertical: 10,
        paddingRight: 10,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.accentSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendDisabled: {
        backgroundColor: theme.colors.surfaceSecondary,
    },
    stopButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default ChatScreen;
