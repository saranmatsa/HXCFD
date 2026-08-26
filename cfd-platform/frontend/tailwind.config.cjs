/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ─── Design Tokens ──────────────────────────────────────────────
      colors: {
        // Semantic color system
        bg: {
          primary: '#030405',
          secondary: '#08090a',
          tertiary: '#0d0e10',
          elevated: '#121518',
          overlay: '#181c20',
        },
        border: {
          subtle: '#1e2228',
          default: '#2a2f38',
          strong: '#3a414d',
          focus: '#2f72e8',
          error: '#ef665b',
          success: '#22c55e',
          warning: '#f4b740',
        },
        text: {
          primary: '#f4f6f8',
          secondary: '#b8c0cc',
          muted: '#88909e',
          disabled: '#5a626e',
          inverse: '#030405',
          link: '#4d9bff',
          linkHover: '#7ab3ff',
        },
        accent: {
          blue: '#2f72e8',
          blueHover: '#4385fa',
          blueLight: '#1e3a5f',
          green: '#22c55e',
          greenHover: '#35d66e',
          greenLight: '#14532d',
          amber: '#f4b740',
          amberHover: '#f7c566',
          amberLight: '#784300',
          red: '#ef665b',
          redHover: '#f38478',
          redLight: '#7f1d1d',
          purple: '#a855f7',
          purpleHover: '#c084fc',
          purpleLight: '#4c1d95',
          cyan: '#06b6d4',
          cyanHover: '#22d3ee',
          cyanLight: '#164e63',
        },
        // Status colors
        status: {
          pending: '#88909e',
          generating: '#2f72e8',
          meshing: '#f4b740',
          optimizing: '#a855f7',
          completed: '#22c55e',
          failed: '#ef665b',
        },
      },

      // ─── Spacing System (4px base unit) ─────────────────────────────
      spacing: {
        '0': '0',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },

      // ─── Border Radius Scale ────────────────────────────────────────
      borderRadius: {
        'none': '0',
        'xs': '2px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '10px',
        '2xl': '12px',
        '3xl': '16px',
        'full': '9999px',
      },

      // ─── Typography Scale ───────────────────────────────────────────
      fontSize: {
        'display-xl': ['48px', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '600' }],
        'display-lg': ['40px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-md': ['32px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-sm': ['28px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-xl': ['24px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-lg': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-md': ['18px', { lineHeight: '1.35', fontWeight: '600' }],
        'heading-sm': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.55', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption-sm': ['11px', { lineHeight: '1.45', fontWeight: '400' }],
        'micro': ['10px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.02em' }],
        'micro-mono': ['10px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }],
      },

      // ─── Font Families ──────────────────────────────────────────────
      fontFamily: {
        ui: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Cascadia Mono', 'Consolas', 'monospace'],
      },

      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      // ─── Box Shadow System ──────────────────────────────────────────
      boxShadow: {
        'panel': 'inset 0 1px 0 rgba(255,255,255,0.02), 0 1px 2px rgba(0,0,0,0.3)',
        'card': '0 1px 3px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
        'floating': '0 12px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25)',
        'modal': '0 24px 64px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)',
        'focus': '0 0 0 2px #2f72e8, 0 0 0 4px rgba(47, 114, 232, 0.15)',
        'focus-error': '0 0 0 2px #ef665b, 0 0 0 4px rgba(239, 102, 91, 0.15)',
        'focus-success': '0 0 0 2px #22c55e, 0 0 0 4px rgba(34, 197, 94, 0.15)',
        'inner': 'inset 0 2px 4px rgba(0,0,0,0.2)',
      },

      // ─── Border Width ───────────────────────────────────────────────
      borderWidth: {
        'hairline': '0.5px',
        '1': '1px',
        '2': '2px',
      },

      // ─── Transition Timing ──────────────────────────────────────────
      transitionDuration: {
        'fast': '120ms',
        'normal': '180ms',
        'slow': '280ms',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // ─── Z-Index Scale ──────────────────────────────────────────────
      zIndex: {
        'dropdown': '100',
        'sticky': '200',
        'overlay': '300',
        'modal': '400',
        'popover': '500',
        'tooltip': '600',
        'toast': '700',
      },

      // ─── Animation ──────────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'fade-out': 'fade-out 120ms ease-in',
        'slide-in-up': 'slide-in-up 220ms ease-out',
        'slide-in-down': 'slide-in-down 220ms ease-out',
        'slide-in-right': 'slide-in-right 220ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'spin': 'spin 1s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },

      // ─── Background Images ──────────────────────────────────────────
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        'mesh': 'linear-gradient(rgba(47,114,232,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(47,114,232,0.06) 1px, transparent 1px)',
      },
      backgroundSize: {
        'mesh': '28px 28px',
      },

      // ─── Min/Max Width/Height ───────────────────────────────────────
      minWidth: {
        'panel': '280px',
        'modal-sm': '360px',
        'modal-md': '480px',
        'modal-lg': '640px',
        'modal-xl': '800px',
      },
      maxWidth: {
        'prose': '65ch',
        'panel': '360px',
        'modal-sm': '360px',
        'modal-md': '480px',
        'modal-lg': '640px',
        'modal-xl': '800px',
      },
    },
  },
  plugins: [],
}