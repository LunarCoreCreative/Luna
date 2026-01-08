import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { theme } from '../theme';
import { Message } from '../types';

interface ChatBubbleProps {
    message: Message;
    isStreaming?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isStreaming }) => {
    const isUser = message.role === 'user';

    return (
        <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                {!isUser && message.thought && (
                    <View style={styles.thoughtBox}>
                        <Text style={styles.thoughtTitle}>🧠 Pensamento</Text>
                        <Text style={styles.thoughtText}>{message.thought}</Text>
                    </View>
                )}

                <Markdown style={markdownStyles}>
                    {message.content || (isStreaming ? '...' : '')}
                </Markdown>

                <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
                    {message.timestamp}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: theme.spacing.md,
    },
    userContainer: {
        alignItems: 'flex-end',
    },
    assistantContainer: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '85%',
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
    },
    userBubble: {
        backgroundColor: theme.colors.userBubble,
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        backgroundColor: theme.colors.assistantBubble,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
    },
    thoughtBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: theme.radius.sm,
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        borderLeftWidth: 2,
        borderLeftColor: theme.colors.violet,
    },
    thoughtTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.violet,
        marginBottom: 2,
    },
    thoughtText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    timestamp: {
        fontSize: 10,
        color: theme.colors.textMuted,
        marginTop: 6,
    },
    timestampUser: {
        textAlign: 'right',
    },
});

const markdownStyles = {
    body: { color: theme.colors.text, fontSize: 16, lineHeight: 22 },
    code_inline: { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.accent, borderRadius: 4, paddingHorizontal: 4 },
    code_block: { backgroundColor: '#000', padding: 12, borderRadius: 8, marginVertical: 8 },
    fence: { backgroundColor: '#1d2127', padding: 12, borderRadius: 8 },
    strong: { fontWeight: 'bold' as const, color: '#fff' },
};
