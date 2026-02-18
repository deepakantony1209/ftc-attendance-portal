/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            colors: {
                // Nock-inspired primary: Electric Blue
                primary: {
                    50: '#eef3ff',
                    100: '#dce8ff',
                    200: '#b9d0ff',
                    300: '#85adff',
                    400: '#5585ff',
                    500: '#3772FF', // Nock signature blue
                    600: '#2558e8',
                    700: '#1a42cc',
                    800: '#1535a5',
                    900: '#122d82',
                },
                // Nock sidebar: Rich Black / Midnight Navy
                navy: {
                    800: '#1a1d2e',
                    900: '#141416',
                    950: '#0d0e14',
                },
                // Nock success: Emerald Green
                success: {
                    400: '#5ecb8a',
                    500: '#45B36B',
                    600: '#35a05a',
                },
                // Nock alert: Coral Red
                coral: {
                    400: '#f46d8a',
                    500: '#EF466F',
                    600: '#d93360',
                },
                // Nock warm accent: Peach/Orange
                peach: {
                    300: '#ffd4b8',
                    400: '#FFBC99',
                    500: '#ff9f6b',
                },
                // App background: cool off-white
                app: {
                    bg: '#F4F7FE',
                    'bg-dark': '#0f1117',
                    card: '#FFFFFF',
                    'card-dark': '#1a1d2e',
                },
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
                '4xl': '2rem',
            },
            boxShadow: {
                'card': '0 4px 24px rgba(55, 114, 255, 0.06), 0 1px 4px rgba(0,0,0,0.04)',
                'card-hover': '0 8px 32px rgba(55, 114, 255, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
                'card-dark': '0 4px 24px rgba(0,0,0,0.3)',
                'primary': '0 4px 16px rgba(55, 114, 255, 0.35)',
                'primary-lg': '0 8px 24px rgba(55, 114, 255, 0.45)',
            },
            spacing: {
                'sidebar': '260px',
                'header': '60px',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-in': 'slideIn 0.3s ease-out',
                'slide-up': 'slideUp 0.2s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideIn: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
