/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    colors: {
      // Base colors
      white: "#ffffff",
      // Brand colors using CSS variable theme tokens
      maroon: "var(--color-maroon)",
      burgundy: "var(--color-burgundy)",
      gold: "var(--color-gold)",
      charcoal: "var(--color-charcoal)",
      slate: {
        50: "var(--color-slate-50)",
        100: "var(--color-slate-100)",
        300: "var(--color-slate-300)",
        600: "var(--color-slate-600)",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Lexend", "system-ui", "sans-serif"],
        heading: ["Lexend", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
