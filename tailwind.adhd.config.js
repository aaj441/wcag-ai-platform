/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,html}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      // ADHD-Friendly Color Palette
      // High contrast, reduced saturation, calming tones
      colors: {
        // Primary: Calm Blue (focus and clarity)
        primary: {
          50: '#e6f2ff',
          100: '#cce5ff',
          200: '#99ccff',
          300: '#66b2ff',
          400: '#3399ff',
          500: '#0080ff', // Main
          600: '#0066cc',
          700: '#004d99',
          800: '#003366',
          900: '#001a33',
        },
        // Secondary: Soft Green (success and calm)
        secondary: {
          50: '#e6f7ed',
          100: '#ccefdb',
          200: '#99dfb7',
          300: '#66cf93',
          400: '#33bf6f',
          500: '#00af4b', // Main
          600: '#008c3c',
          700: '#00692d',
          800: '#00461e',
          900: '#00230f',
        },
        // Accent: Warm Orange (energy without overwhelm)
        accent: {
          50: '#fff5e6',
          100: '#ffebcc',
          200: '#ffd699',
          300: '#ffc266',
          400: '#ffad33',
          500: '#ff9900', // Main
          600: '#cc7a00',
          700: '#995c00',
          800: '#663d00',
          900: '#331f00',
        },
        // Neutral: High contrast grays
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        // Semantic colors
        success: {
          light: '#d1fae5',
          DEFAULT: '#10b981',
          dark: '#065f46',
        },
        warning: {
          light: '#fef3c7',
          DEFAULT: '#f59e0b',
          dark: '#92400e',
        },
        error: {
          light: '#fee2e2',
          DEFAULT: '#ef4444',
          dark: '#991b1b',
        },
        info: {
          light: '#dbeafe',
          DEFAULT: '#3b82f6',
          dark: '#1e40af',
        },
      },

      // ADHD-Friendly Typography
      fontSize: {
        // Larger base sizes for better readability
        'xs': ['0.875rem', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'sm': ['0.9375rem', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'base': ['1rem', { lineHeight: '1.7', letterSpacing: '0.01em' }],
        'lg': ['1.125rem', { lineHeight: '1.7', letterSpacing: '0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.7', letterSpacing: '0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '1.6', letterSpacing: '0' }],
        '3xl': ['1.875rem', { lineHeight: '1.5', letterSpacing: '0' }],
        '4xl': ['2.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        '5xl': ['3rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
      },

      fontFamily: {
        // System fonts for familiarity and performance
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Optional: OpenDyslexic for dyslexia support
        dyslexic: ['OpenDyslexic', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      // ADHD-Friendly Spacing
      // Generous spacing reduces visual clutter
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },

      // ADHD-Friendly Focus Indicators
      ringWidth: {
        '3': '3px',
        '5': '5px',
      },
      ringOffsetWidth: {
        '3': '3px',
        '4': '4px',
      },

      // ADHD-Friendly Border Radius
      // Softer corners reduce visual harshness
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },

      // ADHD-Friendly Shadows
      // Subtle depth without distraction
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'soft-xl': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'focus': '0 0 0 3px rgba(0, 128, 255, 0.3)',
      },

      // ADHD-Friendly Animations
      // Reduced motion by default
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'gentle-bounce': 'gentleBounce 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        gentleBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },

      // ADHD-Friendly Transitions
      transitionDuration: {
        '0': '0ms', // For reduced-motion preference
        '150': '150ms',
        '250': '250ms',
      },
    },
  },
  plugins: [
    // ADHD-Friendly Utilities
    function({ addUtilities, addComponents, theme }) {
      // Custom utilities for ADHD-friendly patterns
      const adhdUtilities = {
        // Focus Mode - remove distractions
        '.focus-mode': {
          filter: 'none',
          transition: 'none',
        },
        '.focus-mode *:not(:focus):not(:focus-within)': {
          opacity: '0.4',
          transition: 'opacity 0.2s',
        },

        // High Contrast Mode
        '.high-contrast': {
          filter: 'contrast(1.2)',
        },

        // Reduced Motion (respects prefers-reduced-motion)
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            'animation-duration': '0.01ms !important',
            'animation-iteration-count': '1 !important',
            'transition-duration': '0.01ms !important',
          },
        },

        // Clear Visual Hierarchy
        '.visual-hierarchy': {
          '& h1, & h2, & h3': {
            fontWeight: '700',
            marginBottom: theme('spacing.4'),
          },
          '& p': {
            marginBottom: theme('spacing.4'),
          },
        },

        // Chunked Content (for better focus)
        '.content-chunk': {
          marginBottom: theme('spacing.8'),
          paddingBottom: theme('spacing.8'),
          borderBottom: `1px solid ${theme('colors.neutral.200')}`,
        },
        '.content-chunk:last-child': {
          borderBottom: 'none',
        },
      };

      // ADHD-Friendly Components
      const adhdComponents = {
        // Large, Clear Buttons
        '.btn-adhd': {
          padding: `${theme('spacing.4')} ${theme('spacing.8')}`,
          fontSize: theme('fontSize.lg[0]'),
          fontWeight: '600',
          borderRadius: theme('borderRadius.xl'),
          transition: 'all 0.15s',
          border: '2px solid transparent',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: theme('boxShadow.soft-lg'),
          },
          '&:focus': {
            outline: 'none',
            boxShadow: theme('boxShadow.focus'),
            borderColor: theme('colors.primary.500'),
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },

        '.btn-adhd-primary': {
          backgroundColor: theme('colors.primary.500'),
          color: 'white',
          '&:hover': {
            backgroundColor: theme('colors.primary.600'),
          },
        },

        '.btn-adhd-secondary': {
          backgroundColor: theme('colors.neutral.100'),
          color: theme('colors.neutral.900'),
          '&:hover': {
            backgroundColor: theme('colors.neutral.200'),
          },
        },

        // Clear Input Fields
        '.input-adhd': {
          padding: `${theme('spacing.4')} ${theme('spacing.4')}`,
          fontSize: theme('fontSize.base[0]'),
          borderRadius: theme('borderRadius.lg'),
          border: `2px solid ${theme('colors.neutral.300')}`,
          transition: 'border-color 0.15s',
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.primary.500'),
            boxShadow: theme('boxShadow.focus'),
          },
          '&::placeholder': {
            color: theme('colors.neutral.400'),
          },
        },

        // Clear Cards
        '.card-adhd': {
          padding: theme('spacing.6'),
          backgroundColor: 'white',
          borderRadius: theme('borderRadius.2xl'),
          boxShadow: theme('boxShadow.soft'),
          border: `1px solid ${theme('colors.neutral.200')}`,
          transition: 'box-shadow 0.2s',
          '&:hover': {
            boxShadow: theme('boxShadow.soft-lg'),
          },
        },

        // Alert Badges
        '.badge-adhd': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: `${theme('spacing.2')} ${theme('spacing.3')}`,
          fontSize: theme('fontSize.sm[0]'),
          fontWeight: '600',
          borderRadius: theme('borderRadius.lg'),
          border: '2px solid currentColor',
        },

        // Progress Indicators
        '.progress-adhd': {
          width: '100%',
          height: theme('spacing.3'),
          backgroundColor: theme('colors.neutral.200'),
          borderRadius: theme('borderRadius.full'),
          overflow: 'hidden',
        },
        '.progress-adhd-bar': {
          height: '100%',
          backgroundColor: theme('colors.primary.500'),
          transition: 'width 0.3s ease',
        },

        // Focus Outlines (always visible, not just on keyboard)
        '.focus-visible-always': {
          outline: `3px solid ${theme('colors.primary.500')}`,
          outlineOffset: '3px',
        },
      };

      addUtilities(adhdUtilities);
      addComponents(adhdComponents);
    },

    // Form Plugin for better form styling
    require('@tailwindcss/forms')({
      strategy: 'class', // Only apply to elements with .form-input, etc.
    }),
  ],
  // Safelist ADHD-specific classes
  safelist: [
    'focus-mode',
    'high-contrast',
    'visual-hierarchy',
    'content-chunk',
    {
      pattern: /btn-adhd.*/,
      variants: ['hover', 'focus', 'active'],
    },
  ],
};
