/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#05070D",
        surface: "#0B0F19",
        "surface-high": "#141A29",
        cyan: "#00F0FF",
        violet: "#8A2BE2",
        "border-glow": "rgba(0, 240, 255, 0.2)",
      },
      fontFamily: {
        display: ['Montserrat', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyan-violet-gradient': 'linear-gradient(135deg, #00F0FF 0%, #8A2BE2 100%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 40px -10px rgba(0, 240, 255, 0.3)',
        'glow-violet': '0 0 40px -10px rgba(138, 43, 226, 0.3)',
        'glow-lg': '0 0 80px -15px rgba(0, 240, 255, 0.4)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
