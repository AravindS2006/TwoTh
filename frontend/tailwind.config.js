/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0e1a",
        surface: "#111827",
        primary: "#6366f1",
        secondary: "#22d3ee",
        error: "#f87171",
        success: "#34d399",
      },
    },
  },
  plugins: [],
}
