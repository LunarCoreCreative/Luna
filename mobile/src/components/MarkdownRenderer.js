/**
 * MarkdownRenderer
 * ================
 * Renderizador básico de Markdown para React Native
 */

import { Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { colors } from '../theme/colors';

export default function MarkdownRenderer({ content, isStreaming = false }) {
  const processedContent = useMemo(() => {
    if (!content) return '';

    let processed = content;

    // Remove markdown complexo e mantém apenas formatação básica
    // Bold: **text** -> text (mantém o texto)
    processed = processed.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Italic: *text* -> text (mantém o texto)
    processed = processed.replace(/\*(.*?)\*/g, '$1');
    
    // Code: `code` -> code (mantém o texto)
    processed = processed.replace(/`([^`]+)`/g, '$1');
    
    // Links: [text](url) -> text
    processed = processed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Headers: # text -> text
    processed = processed.replace(/^#{1,6}\s+/gm, '');
    
    // List items: - item -> • item
    processed = processed.replace(/^-\s+/gm, '• ');

    return processed;
  }, [content]);

  return (
    <Text style={styles.text}>
      {processedContent}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
  },
});
