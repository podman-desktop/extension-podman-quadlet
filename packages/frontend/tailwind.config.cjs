const tailwindColors = require('tailwindcss/colors')
const tailwindTypography = require('@tailwindcss/typography')

module.exports = {
  content: [
    'index.html',
    'src/**/*.{svelte,ts,css}',
    '../../node_modules/@podman-desktop/ui-svelte/dist/**/*.{svelte,ts,css}',
  ],
  darkMode: 'class',
  theme: {
    fontSize: {
      'xs': '10px',
      'sm': '11px',
      'base': '12px',
      'lg': '14px',
      'xl': '16px',
      '2xl': '18px',
      '3xl': '20px',
      '4xl': '24px',
      '5xl': '30px',
      '6xl': '36px',
    },
    colors: {},
  },
  plugins: [
    tailwindTypography
  ],
};
