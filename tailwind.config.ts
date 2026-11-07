import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-nunito)", "var(--font-arabic)", "sans-serif"],
        quran: ["var(--font-quran)", "serif"],
        arabic: ["var(--font-arabic)", "serif"],
        kufi: ["var(--font-kufi)", "var(--font-arabic)", "sans-serif"],
      },
      colors: {
        // Faqih's colours (see docs/BRAND.md): navy for the app and its
        // actions, gold for what is achieved and for ayah markers. Green is
        // only for a right answer, rose only for a wrong one.
        brand: {
          50: "#eef3fa",
          100: "#dbe5f3",
          200: "#b7cae6",
          300: "#8aa8d3",
          400: "#5a80bb",
          500: "#3a62a0",
          600: "#284d86",
          700: "#1b3a6b",
          800: "#142c52",
          900: "#0e1f3b",
        },
        gold: {
          50: "#fff9e5",
          100: "#fff1bf",
          200: "#ffe380",
          300: "#ffd640",
          400: "#ffc800",
          500: "#e6b400",
          600: "#b88f00",
          700: "#8a6b00",
          800: "#5c4700",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // A new kids sticker on the finish screen (components/sticker).
        "sticker-pop": {
          "0%": { transform: "scale(0) rotate(-20deg)", opacity: "0" },
          "70%": { transform: "scale(1.15) rotate(6deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "sticker-pop": "sticker-pop 0.6s ease-out 0.3s both",
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;

export default config;
