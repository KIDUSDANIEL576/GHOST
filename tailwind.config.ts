import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ghost: {
          orange:  '#FF6B35',
          yellow:  '#FFB627',
          green:   '#06D6A0',
          red:     '#EF476F',
          blue:    '#118AB2',
          bg:      '#0A0E27',
          surface: '#1A1E37',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
