import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: {
          bg: '#0f1115',
          panel: '#171a21',
          panel2: '#1d212b',
          border: '#262b36',
          text: '#e8eaf0',
          dim: '#9aa3b2',
          accent: '#f5b942',
          accentDim: '#8a6a1f'
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config
