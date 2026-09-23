/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#08090D',
          surface: '#10121A',
          card: '#151821',
          border: '#262A38',
          text: '#F5F7FA',
          muted: '#969DAA',
          accent: '#8B5CF6',
          cyan: '#22D3EE',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        btn: '12px',
        card: '16px',
        modal: '20px',
      },
    },
  },
  plugins: [],
};
