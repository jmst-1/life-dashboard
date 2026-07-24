import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ld: {
          bg: "var(--ld-bg)",
          surface: "var(--ld-surface)",
          "surface-high": "var(--ld-surface-high)",
          "surface-pop": "var(--ld-surface-pop)",
          border: "var(--ld-border)",
          "border-bright": "var(--ld-border-bright)",
          text: "var(--ld-text)",
          "text-sub": "var(--ld-text-sub)",
          "text-muted": "var(--ld-text-muted)",
          orange: "var(--ld-orange)",
          "orange-dim": "var(--ld-orange-dim)",
          "orange-mid": "var(--ld-orange-mid)",
          purple: "var(--ld-purple)",
          "purple-dim": "var(--ld-purple-dim)",
          teal: "var(--ld-teal)",
          "teal-dim": "var(--ld-teal-dim)",
          green: "var(--ld-green)",
          "green-dim": "var(--ld-green-dim)",
          red: "var(--ld-red)",
          "red-dim": "var(--ld-red-dim)",
          amber: "var(--ld-amber)",
          "amber-dim": "var(--ld-amber-dim)",
          blue: "var(--ld-blue)",
          "blue-dim": "var(--ld-blue-dim)",
          pink: "var(--ld-pink)",
          "pink-dim": "var(--ld-pink-dim)",
        },
      },
      maxWidth: {
        phone: "430px",
      },
    },
  },
  plugins: [],
};
export default config;
