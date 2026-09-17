/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        soil: {
          950: "#1A1208",
          900: "#2C1810",
          800: "#4A2C1A",
        },
        leaf: {
          950: "#081C15",
          900: "#1B4332",
          700: "#2D6A4F",
          500: "#40916C",
          300: "#95D5B2",
          100: "#D8F3DC",
        },
        harvest: {
          500: "#E09F3E",
          400: "#F4C95D",
        },
        cream: {
          50: "#FBF7EF",
          100: "#F3E9D7",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Figtree", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 40px rgba(27, 67, 50, 0.12)",
      },
    },
  },
  plugins: [],
};
