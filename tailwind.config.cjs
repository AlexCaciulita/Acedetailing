module.exports = {
  content: ['./public/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        primary: '#826C3E',
        'primary-light': '#B5A17A',
        'primary-dark': '#6B5834',
        secondary: '#1A1A1A',
        light: {
          50: '#F7F7F5',
          100: '#EFEFED',
          200: '#E8E7E2',
          300: '#DCDBD5',
          400: '#C4C3BE',
          500: '#9A9A94',
          600: '#5C5C5E',
          700: '#45454A',
          800: '#343432',
          900: '#262625',
          950: '#1A1A1A'
        }
      },
      fontFamily: {
        heading: ['Montserrat', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        gold: '0 4px 20px rgba(181, 161, 122, 0.18)',
        'gold-lg': '0 8px 40px rgba(181, 161, 122, 0.28)',
        soft: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 4px 12px rgba(0, 0, 0, 0.08)'
      }
    }
  },
  plugins: []
};
