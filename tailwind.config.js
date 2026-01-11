/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Theme-aware colors (map to CSS variables)
                foreground: 'var(--text-primary)',
                'foreground-muted': 'var(--text-secondary)',
                'foreground-dim': 'var(--text-muted)',
                surface: {
                    DEFAULT: 'var(--bg-glass)',
                    solid: 'var(--bg-glass-solid)',
                    primary: 'var(--bg-primary)',
                    secondary: 'var(--bg-secondary)',
                    tertiary: 'var(--bg-tertiary)',
                },
                border: {
                    DEFAULT: 'var(--border-color)',
                    color: 'var(--border-color)',
                },
                accent: {
                    DEFAULT: 'var(--accent-primary)',
                    primary: 'var(--accent-primary)',
                    secondary: 'var(--accent-secondary)',
                    hover: 'var(--accent-hover)',
                },
                bubble: {
                    user: 'var(--user-bubble)',
                    assistant: 'var(--assistant-bubble)',
                },
                shadow: {
                    color: 'var(--shadow-color)',
                },
                glow: {
                    color: 'var(--glow-color)',
                },
                // Legacy dark colors (for backwards compatibility)
                dark: {
                    900: '#050505',
                    800: '#0a0a0a',
                    700: '#111111',
                    600: '#1a1a1a',
                },
                violet: {
                    500: '#8B5CF6',
                    600: '#7C3AED',
                }
            },
            backgroundColor: {
                'theme-primary': 'var(--bg-primary)',
                'theme-secondary': 'var(--bg-secondary)',
                'theme-tertiary': 'var(--bg-tertiary)',
                'theme-glass': 'var(--bg-glass)',
                'theme-glass-solid': 'var(--bg-glass-solid)',
            },
            textColor: {
                'theme-primary': 'var(--text-primary)',
                'theme-secondary': 'var(--text-secondary)',
                'theme-muted': 'var(--text-muted)',
            },
            borderColor: {
                'theme': 'var(--border-color)',
            },
            backdropBlur: {
                'glass': 'var(--glass-blur, 20px)',
            },
            boxShadow: {
                'theme': '0 4px 20px var(--shadow-color)',
                'theme-glow': '0 0 20px var(--glow-color)',
                'theme-lg': '0 8px 32px var(--shadow-color)',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
