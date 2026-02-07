/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}", // All TS/TSX files
    "!./node_modules/**", // Exclude node_modules explicitly
  ],
  theme: {
    extend: {
      colors: {
        // ==============================
        // SNUGGLE BRAND COLORS
        // ==============================

        // Primary: Deep Blue - Trust, Calmness
        primary: {
          DEFAULT: '#1F3A5F',
          light: '#2B4A73',
          dark: '#162B47',
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

        // Accent: Bright Blue - Connection, Action
        accent: {
          DEFAULT: '#4C9AFF',
          light: '#6BABFF',
          dark: '#2B7CE5',
          50: '#EBF4FF',
          100: '#D6E8FF',
          200: '#ADD1FF',
          300: '#85BAFF',
          400: '#4C9AFF',
          500: '#3385F0',
          600: '#2B7CE5',
          700: '#1F66CC',
          800: '#1650A3',
          900: '#0D3A7A',
        },

        // Warm Accent: Soft Orange - Warmth, Highlights
        warm: {
          DEFAULT: '#F4A261',
          light: '#F6B379',
          dark: '#E08C42',
          50: '#FEF6EE',
          100: '#FCEBDD',
          200: '#F9D7BC',
          300: '#F6C39A',
          400: '#F4A261',
          500: '#E08C42',
          600: '#C87530',
          700: '#A65E24',
          800: '#854A1B',
          900: '#633713',
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
          DEFAULT: '#F59E0B',
          light: '#FBB12B',
          dark: '#D97706',
          bg: 'rgba(245, 158, 11, 0.1)',
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
          bg: '#F7F9FC',
          surface: '#FFFFFF',
          elevated: '#FFFFFF',
          overlay: 'rgba(255, 255, 255, 0.9)',
          divider: '#E5E7EB',
          border: '#E5E7EB',
          hover: 'rgba(0, 0, 0, 0.04)',
          pressed: 'rgba(0, 0, 0, 0.08)',
          selected: 'rgba(76, 154, 255, 0.12)',
        },

        // Light mode text
        'light-text': {
          primary: '#111827',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
          disabled: '#D1D5DB',
          inverse: '#FFFFFF',
        },

        // ==============================
        // DARK MODE SURFACES
        // ==============================
        dark: {
          bg: '#0F172A',
          surface: '#1E293B',
          elevated: '#273449',
          overlay: 'rgba(15, 23, 42, 0.95)',
          divider: '#334155',
          border: '#334155',
          hover: 'rgba(255, 255, 255, 0.06)',
          pressed: 'rgba(255, 255, 255, 0.12)',
          selected: 'rgba(76, 154, 255, 0.2)',
          // Legacy - kept for backward compatibility
          card: '#1E293B',
        },

        // Dark mode text
        'dark-text': {
          primary: '#F9FAFB',
          secondary: '#94A3B8',
          tertiary: '#64748B',
          disabled: '#475569',
          inverse: '#111827',
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
