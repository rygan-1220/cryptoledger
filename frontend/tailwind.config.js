/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,vue}"] ,
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"]
      },
      colors: {
        ink: "#0b1020",
        graphite: "#1f2437",
        mist: "#e6e9f2",
        ocean: "#3a6cff",
        ember: "#ff6b3d"
      },
      boxShadow: {
        glow: "0 20px 60px -20px rgba(58,108,255,0.45)"
      }
    }
  },
  plugins: []
};
