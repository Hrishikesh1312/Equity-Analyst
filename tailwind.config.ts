import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          50:  "#22333B",
          100: "#1A2830",
          200: "#131F26",
          300: "#0F181E",
          400: "#2B3F49",
        },
        plum: {
          DEFAULT: "#241623",
          light: "#3A2238",
          border: "rgba(36,22,35,0.7)",
        },
        gold: {
          DEFAULT: "#C9A84C",
          dim: "rgba(201,168,76,0.12)",
          border: "rgba(201,168,76,0.28)",
        },
        gain:  "#2ECC8A",
        loss:  "#E85D4A",
        amber: "#E8A030",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "fade-in":    "fadeIn 0.35s ease forwards",
        "slide-up":   "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
