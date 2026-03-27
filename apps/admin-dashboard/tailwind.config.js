/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                dashboard: {
                    bg: '#060d1f',
                    card: '#0d1b33',
                    border: '#1e3a5f',
                    glass: 'rgba(13, 27, 51, 0.7)',
                },
                accent: {
                    cyan: '#06b6d4',
                    purple: '#8b5cf6',
                    green: '#10b981',
                    amber: '#f59e0b',
                    rose: '#f43f5e',
                },
            },
            backgroundImage: {
                'grid-pattern': "linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)",
                'hero-gradient': 'linear-gradient(135deg, #060d1f 0%, #0a1628 50%, #0d1b33 100%)',
                'card-gradient': 'linear-gradient(135deg, rgba(13,27,51,0.9) 0%, rgba(6,13,31,0.95) 100%)',
                'glow-primary': 'radial-gradient(ellipse at center, rgba(14,165,233,0.15) 0%, transparent 70%)',
                'glow-cyan': 'radial-gradient(ellipse at center, rgba(6,182,212,0.12) 0%, transparent 70%)',
                'sidebar-gradient': 'linear-gradient(180deg, #060d1f 0%, #0a1628 100%)',
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                'glass-hover': '0 16px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                'glow-primary': '0 0 20px rgba(14,165,233,0.3)',
                'glow-red': '0 0 20px rgba(239,68,68,0.3)',
                'glow-green': '0 0 20px rgba(16,185,129,0.3)',
                'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.08)',
            },
            animation: {
                'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'slide-in-left': 'slide-in-left 0.3s ease-out',
                'slide-in-right': 'slide-in-right 0.3s ease-out',
                'fade-in': 'fade-in 0.2s ease-out',
                'scale-in': 'scale-in 0.2s ease-out',
            },
            keyframes: {
                'pulse-slow': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'slide-in-left': {
                    '0%': { transform: 'translateX(-100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                'slide-in-right': {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(4px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            gridTemplateColumns: {
                'sidebar-open': '240px 1fr',
                'sidebar-closed': '64px 1fr',
            },
        },
    },
    plugins: [],
}
