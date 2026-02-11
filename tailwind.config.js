/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx",
    "!./node_modules/**", // Exclude node_modules explicitly
    "!./api/**", // Exclude backend
    "!./functions/**", // Exclude cloud functions
  ],
  theme: {
    extend: {
      colors: {
        // ==============================
        // SNUGGLE BRAND COLORS (Updated Palette)
        // ==============================

        // Primary: Midnight Green (#03444A)
        primary: {
          DEFAULT: '#03444A',
          light: '#00A8A8', // Teal
          dark: '#022E33',
          50: '#F0FDFD',
          100: '#CCFBFB',
          200: '#9AD3DA',
          300: '#5FB5BE',
          400: '#2D8E99',
          500: '#03444A', // Base
          600: '#02363B',
          700: '#022E33',
          800: '#012023',
          900: '#011517',
        },

        // Accent: Soft Orange (#E66414) - REPLACING Teal as main accent
        accent: {
          DEFAULT: '#E66414',
          light: '#FF924C', // Peach
          dark: '#BF500F',
          50: '#FFF5EB',
          100: '#FFE8D6',
          200: '#FFD1B0',
          300: '#FFB078',
          400: '#FF924C',
          500: '#E66414', // Base
          600: '#D65A10',
          700: '#BF500F',
          800: '#A13F0A',
          900: '#853207',
        },

        // Warm Neutral Backgrounds
        warm: {
          neutral: '#FAF9F6', // Alabaster / Off-White
          card: '#FFFFFF',
        },

        // Semantic: Success
        success: {
          DEFAULT: '#2E7D32',
          light: '#4CAF50',
          dark: '#1B5E20',
          bg: 'rgba(46, 125, 50, 0.1)',
        },

        // Semantic: Warning
        warning: {
          DEFAULT: '#FF924C',
          light: '#FFB078',
          dark: '#E66414',
          bg: 'rgba(255, 146, 76, 0.1)',
        },

        // Semantic: Error
        error: {
          DEFAULT: '#D32F2F',
          light: '#EF5350',
          dark: '#C62828',
          bg: 'rgba(211, 47, 47, 0.1)',
        },

        // ==============================
        // LIGHT MODE SURFACES
        // ==============================
        light: {
          background: '#FAF9F6', // Warm Neutral
          surface: '#FFFFFF',
          text: {
            primary: '#1A1A1A', // Dark Readable
            secondary: '#4A4A4A',
            muted: '#757575',
            tertiary: '#757575',
            disabled: '#9CA3AF',
          },
          border: '#E0E0E0',
          hover: '#F5F5F5',
          pressed: '#EEEEEE',
          divider: '#E0E0E0',
        },

        // ==============================
        // DARK MODE SURFACES
        // ==============================
        dark: {
          bg: '#000000', // Strict Black Background
          surface: '#022E33', // Deep Teal
          elevated: '#03444A', // Base Teal
          overlay: 'rgba(0, 0, 0, 0.95)',
          divider: 'rgba(255, 255, 255, 0.1)',
          border: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.05)',
          pressed: 'rgba(255, 255, 255, 0.1)',
          selected: 'rgba(0, 168, 168, 0.2)', // Teal Tint
          // Legacy
          card: '#022E33',
        },

        // Dark mode text
        'dark-text': {
          primary: '#FFFFFF', // Strict White
          secondary: '#E2E8F0',
          tertiary: '#94A3B8',
          disabled: '#64748B',
          inverse: '#000000',
        },

        // ==============================
        // LEGACY COLORS (Backward Compatibility)
        // ==============================
        snuggle: {
          50: '#EEF2F7',
          100: '#D5DEE9',
          200: '#ABBDCE',
          300: '#819CB2',
          400: '#577B97',
          500: '#1F3A5F',
          600: '#1B3352',
          700: '#162B47',
          800: '#11223A',
          900: '#0C192B',
        },
        glass: {
          100: 'rgba(255, 255, 255, 0.1)',
          200: 'rgba(255, 255, 255, 0.2)',
          300: 'rgba(255, 255, 255, 0.3)',
          border: 'rgba(255, 255, 255, 0.2)',
          dark: 'rgba(0, 0, 0, 0.3)',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        'bento': '2.5rem',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'blob': 'blob 7s infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'throb': 'throb 2s infinite ease-in-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(5deg)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        throb: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
