/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // iOS System Colors
        ios: {
          blue:    '#007AFF',
          indigo:  '#5856D6',
          purple:  '#AF52DE',
          pink:    '#FF2D55',
          red:     '#FF3B30',
          orange:  '#FF9500',
          yellow:  '#FFCC00',
          green:   '#34C759',
          teal:    '#5AC8FA',
          cyan:    '#32ADE6',
        },
        // System Grays
        sys: {
          bg:        '#F2F2F7',
          bg2:       '#EBEBF0',
          bg3:       '#E1E1E6',
          fill:      '#787880',
          fill2:     '#8E8E93',
          fill3:     '#AEAEB2',
          fill4:     '#C7C7CC',
          separator: '#E5E5EA',
          opaque:    '#C6C6C8',
          label:     '#1C1C1E',
          label2:    '#3A3A3C',
          label3:    '#636366',
          label4:    '#8E8E93',
        },
        surface: {
          primary:   '#FFFFFF',
          secondary: '#F9F9F9',
          tertiary:  '#F2F2F7',
          grouped:   '#EFEFF4',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Inter"', 'system-ui', 'sans-serif'],
        inter: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'ios':   '10px',
        'ios-lg': '14px',
        'ios-xl': '18px',
        'ios-2xl': '22px',
      },
      boxShadow: {
        'ios-sm':  '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        'ios':     '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
        'ios-md':  '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
        'ios-lg':  '0 8px 32px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)',
        'ios-xl':  '0 16px 48px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)',
      },
      backdropBlur: {
        'ios': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spring': 'spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        spring: {
          '0%':   { transform: 'scale(0.8)' },
          '60%':  { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      transitionTimingFunction: {
        'ios': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ios-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
