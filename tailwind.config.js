/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#002819',
          secondary: '#06402B',
          accent: '#D4AF37',
          light: '#FAF1F5',
        },
        role: {
          admin: { bg: '#FEE2E2', text: '#DC2626' },
          owner: { bg: '#FEF3C7', text: '#D97706' },
          manager: { bg: '#EDE9FE', text: '#7C3AED' },
          shepherd: { bg: '#DBEAFE', text: '#2563EB' },
          doctor: { bg: '#D1FAE5', text: '#059669' },
        },
        danger: '#BA1A1A',
        success: '#059669',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0px 4px 16px rgba(6, 64, 43, 0.08)',
        'card-hover': '0px 8px 24px rgba(6, 64, 43, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
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
      },
    },
  },
  plugins: [],
};