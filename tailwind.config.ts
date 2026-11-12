import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        deeper: "var(--color-deeper)",
        accent: "var(--color-accent)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        warning: "var(--color-warning)"
      },
      fontFamily: {
        ui: "var(--font-lexend)",
        mono: "var(--font-jetbrains-mono)"
      }
    }
  },
  plugins: []
};

export default config;
