/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#F26B1D',
          btn: '#D14F00',
          'btn-hover': '#B84400',
          soft: '#FFE8D1',
          border: '#FED7AA',
        },
        yellow: {
          DEFAULT: '#FFB703',
          soft: '#FEF3C7',
        },
        ink: {
          DEFAULT: '#1F2430',
          dark: '#151922',
          light: '#2D3446',
        },
        teal: {
          DEFAULT: '#14808A',
          soft: '#E6F4F5',
        },
        green: {
          DEFAULT: '#22A06B',
          soft: '#EAF7F0',
        },
        red: {
          DEFAULT: '#C8372D',
          soft: '#FDECEB',
        },
        cream: '#FFF7EC',
        peach: '#FFE8D1',
        card: '#FFFFFF',
        bg: '#FFF7EC',
        surface: '#FFFFFF',
        block: {
          p: '#5F6F80',
          t: '#14808A',
          w: '#7B4FA3',
          b: '#2F4B7C',
          x: '#B26A00',
          a: '#22A06B',
        },
        segment: {
          s1: '#8A6D3B',
          s2: '#C0612B',
          s3: '#7B4FA3',
          s4: '#B8860B',
          s5: '#2F4B7C',
          s6: '#14808A',
          s7: '#22A06B',
          s8: '#C8372D',
          s9: '#4A6FA5',
          s10: '#444B6E',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        card: '16px',
      },
      boxShadow: {
        warm: '0 6px 20px rgba(242, 107, 29, 0.10)',
        card: '0 6px 20px rgba(242, 107, 29, 0.10)',
      },
    },
  },
  plugins: [],
}
