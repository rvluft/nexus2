import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Lumen
        lumen: {
          turquoise: '#00d4d4',
          blue: '#0a2f5f',
          lime: '#c8ff00',
          white: '#ffffff',
        },
        primary: '#00d4d4',
        secondary: '#0a2f5f',
        accent: '#c8ff00',
      },
      backgroundImage: {
        'gradient-lumen': 'linear-gradient(135deg, #00d4d4 0%, #0a2f5f 100%)',
        'gradient-lumen-reverse': 'linear-gradient(135deg, #0a2f5f 0%, #00d4d4 100%)',
        'gradient-energetic': 'linear-gradient(135deg, #c8ff00 0%, #00d4d4 100%)',
        'gradient-full': 'linear-gradient(135deg, #0a2f5f 0%, #00d4d4 50%, #c8ff00 100%)',
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['Outfit', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
