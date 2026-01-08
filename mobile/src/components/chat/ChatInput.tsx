/**
 * ChatInput Component - Luna Mobile
 * Input bar with attachments, thinking mode toggle, and send button
 */

import React, { useState, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, borderRadius, spacing } from '../../theme/colors';

interface ChatInputProps {
    onSend: (message: string, images: string[]) => void;
    onStop: () => void;
    isStreaming: boolean;
    isThinkingMode: boolean;
    setIsThinkingMode: (value: boolean) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSend,
    onStop,
    isStreaming,
    isThinkingMode,
    setIsThinkingMode,
}) => {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const inputRef = useRef<TextInput>(null);

    const handleSend = () => {
        if ((!input.trim() && attachments.length === 0) || isStreaming) return;

        onSend(input, attachments);
        setInput('');
        setAttachments([]);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            base64: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].base64) {
            const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setAttachments(prev => [...prev, base64Image]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.container}>
                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <ScrollView
                        horizontal
                        style={styles.attachmentsContainer}
                        showsHorizontalScrollIndicator={false}
                    >
                        {attachments.map((img, idx) => (
                            <View key={idx} style={styles.attachmentPreview}>
                                <Image source={{ uri: img }} style={styles.attachmentImage} />
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removeAttachment(idx)}
                                >
                                    <Ionicons name="close" size={12} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}

                {/* Input Row */}
                <View style={styles.inputRow}>
                    {/* Image Picker Button */}
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={pickImage}
                    >
                        <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                    </TouchableOpacity>

                    {/* Thinking Mode Toggle */}
                    <TouchableOpacity
                        style={[styles.iconButton, isThinkingMode && styles.iconButtonActive]}
                        onPress={() => setIsThinkingMode(!isThinkingMode)}
                    >
                        <Ionicons
                            name="bulb-outline"
                            size={22}
                            color={isThinkingMode ? colors.accent : colors.textMuted}
                        />
                    </TouchableOpacity>

                    {/* Text Input */}
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Mensagem para Luna..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        maxLength={4000}
                    />

                    {/* Send/Stop Button */}
                    {isStreaming ? (
                        <TouchableOpacity
                            style={[styles.sendButton, styles.stopButton]}
                            onPress={onStop}
                        >
                            <Ionicons name="stop" size={20} color={colors.text} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                (input.trim() || attachments.length > 0) && styles.sendButtonActive
                            ]}
                            onPress={handleSend}
                            disabled={!input.trim() && attachments.length === 0}
                        >
                            <Ionicons
                                name="send"
                                size={18}
                                color={(input.trim() || attachments.length > 0) ? colors.text : colors.textDim}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    attachmentsContainer: {
        marginBottom: spacing.sm,
    },
    attachmentPreview: {
        marginRight: spacing.sm,
        position: 'relative',
    },
    attachmentImage: {
        width: 60,
        height: 60,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    removeButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: colors.error,
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    iconButton: {
        padding: spacing.sm,
        marginBottom: 4,
    },
    iconButtonActive: {
        backgroundColor: `${colors.accent}20`,
        borderRadius: borderRadius.full,
    },
    input: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        color: colors.text,
        fontSize: 16,
        maxHeight: 120,
        marginHorizontal: spacing.xs,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    sendButtonActive: {
        backgroundColor: colors.primary,
    },
    stopButton: {
        backgroundColor: colors.error,
    },
});
