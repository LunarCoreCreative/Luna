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
                surface: 'var(--bg-glass)',
                'surface-solid': 'var(--bg-glass-solid)',
                border: 'var(--border-color)',
                accent: 'var(--accent-primary)',
                'accent-secondary': 'var(--accent-secondary)',
                // Legacy dark colors
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
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
