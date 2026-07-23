import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { brand: { DEFAULT: '#C2185B', dark: '#8E1043', soft: '#FCE4EC' } } } },
  plugins: [],
} satisfies Config;
