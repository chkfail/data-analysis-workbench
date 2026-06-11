import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f1d2b",
        paper: "#f4f7f5",
        line: "#e4e9ef",
        field: {
          DEFAULT: "#0c6e60",
          deep: "#09584d",
          soft: "#e9f4f1"
        }
      },
      borderRadius: {
        card: "20px"
      },
      boxShadow: {
        panel:
          "0 1px 2px rgba(15, 29, 43, 0.04), 0 16px 40px -16px rgba(15, 29, 43, 0.14)"
      },
      fontFamily: {
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Consolas",
          "monospace"
        ]
      }
    }
  },
  plugins: []
};

export default config;
