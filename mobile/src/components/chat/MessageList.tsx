/**
 * MessageList Component - Luna Mobile
 * Optimized FlatList for rendering chat messages
 */

import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { MessageItem } from './MessageItem';
import { Message } from '../../hooks/useChat';
import { colors, spacing } from '../../theme/colors';

interface MessageListProps {
    messages: Message[];
    isStreaming: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isStreaming }) => {
    const flatListRef = useRef<FlatList>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const renderItem = ({ item, index }: { item: Message; index: number }) => {
        const isLastMessage = index === messages.length - 1;
        const showStreamingIndicator = isLastMessage && isStreaming && item.role === 'assistant';

        return (
            <MessageItem
                message={item}
                isStreaming={showStreamingIndicator}
            />
        );
    };

    return (
        <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(_, index) => index.toString()}
            style={styles.list}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={styles.footer} />}
        />
    );
};

const styles = StyleSheet.create({
    list: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    footer: {
        height: spacing.lg,
    },
});
