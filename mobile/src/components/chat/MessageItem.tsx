/**
 * MessageItem Component - Luna Mobile
 * Renders individual chat messages with markdown support
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors, borderRadius, spacing } from '../../theme/colors';
import { Message } from '../../hooks/useChat';

interface MessageItemProps {
    message: Message;
    isStreaming?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isStreaming }) => {
    const isUser = message.role === 'user';

    const markdownStyles = {
        body: {
            color: colors.text,
            fontSize: 16,
            lineHeight: 24,
        },
        code_inline: {
            backgroundColor: colors.surfaceLight,
            color: colors.accent,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            fontFamily: 'monospace',
        },
        fence: {
            backgroundColor: colors.surfaceLight,
            borderRadius: 8,
            padding: 12,
            marginVertical: 8,
        },
        code_block: {
            color: colors.text,
            fontFamily: 'monospace',
            fontSize: 14,
        },
        link: {
            color: colors.primary,
        },
        strong: {
            color: colors.text,
            fontWeight: '700' as const,
        },
        em: {
            color: colors.text,
            fontStyle: 'italic' as const,
        },
        heading1: {
            color: colors.text,
            fontSize: 24,
            fontWeight: '700' as const,
            marginVertical: 8,
        },
        heading2: {
            color: colors.text,
            fontSize: 20,
            fontWeight: '600' as const,
            marginVertical: 6,
        },
        heading3: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '600' as const,
            marginVertical: 4,
        },
        bullet_list: {
            marginVertical: 4,
        },
        ordered_list: {
            marginVertical: 4,
        },
        list_item: {
            marginVertical: 2,
        },
    };

    return (
        <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
            {!isUser && (
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>🌙</Text>
                </View>
            )}
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                {isUser ? (
                    <Text style={styles.userText}>{message.content}</Text>
                ) : (
                    <Markdown style={markdownStyles}>
                        {message.content || (isStreaming ? '...' : '')}
                    </Markdown>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginVertical: spacing.xs,
        paddingHorizontal: spacing.md,
    },
    userContainer: {
        justifyContent: 'flex-end',
    },
    assistantContainer: {
        justifyContent: 'flex-start',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    avatarText: {
        fontSize: 16,
    },
    bubble: {
        maxWidth: '80%',
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    userBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
    },
    userText: {
        color: colors.text,
        fontSize: 16,
        lineHeight: 22,
    },
});
