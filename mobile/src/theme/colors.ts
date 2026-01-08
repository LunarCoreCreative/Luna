/**
 * Luna Mobile - Design Tokens
 * Baseado nas variáveis CSS do Desktop (index.css)
 */

// Dark Theme (Default)
export const colors = {
    // Backgrounds
    bgPrimary: '#0d1117',
    bgSecondary: '#161b22',
    bgTertiary: '#21262d',
    bgGlass: 'rgba(13, 17, 23, 0.8)',
    bgGlassSolid: '#0d1117',

    // Text
    textPrimary: '#c9d1d9',
    textSecondary: '#8b949e',
    textMuted: '#484f58',

    // Accents
    accentPrimary: '#58a6ff',
    accentSecondary: '#1f6feb',
    violet: '#8b5cf6',

    // Bubbles
    userBubble: '#1f6feb',
    assistantBubble: '#161b22',

    // Borders
    border: '#30363d',
    borderLight: 'rgba(255, 255, 255, 0.1)',

    // Status
    error: '#f85149',
    success: '#3fb950',
    warning: '#d29922',
};

// Spacing scale
export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// Border radius
export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
};

// Typography
export const typography = {
    fontFamily: undefined, // Uses system font
    sizes: {
        xs: 10,
        sm: 12,
        base: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        title: 32,
    },
    weights: {
        normal: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
};

// Shadow presets
export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
};
