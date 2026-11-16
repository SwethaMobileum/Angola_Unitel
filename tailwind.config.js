/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F7F9FB',
        surface: '#FFFFFF',
        navy: {
          DEFAULT: '#1F3A5F',
          dark: '#152841',
          light: '#2D5284',
        },
        orange: {
          DEFAULT: '#E8772E',
          soft: '#FDF0E6',
          hover: '#D36822',
        },
        slate: {
          text: '#1E293B',
          muted: '#64748B',
          border: '#D5DDE6',
        },
        status: {
          success: '#2E7D4F',
          warn: '#B26A00',
          danger: '#B3261E',
        },
        block: {
          p: '#5F6F80',
          t: '#2A7F8E',
          w: '#7B4FA3',
          b: '#1F3A5F',
          x: '#B26A00',
          a: '#2E7D4F',
        },
        segment: {
          s1: '#8A6D3B',
          s2: '#C0612B',
          s3: '#7B4FA3',
          s4: '#B8860B',
          s5: '#1F3A5F',
          s6: '#2A7F8E',
          s7: '#2E7D4F',
          s8: '#A83F5C',
          s9: '#4A6FA5',
          s10: '#444B6E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(31, 58, 95, 0.08), 0 1px 2px rgba(31, 58, 95, 0.04)',
      },
    },
  },
  plugins: [],
}
