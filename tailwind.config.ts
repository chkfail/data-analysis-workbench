import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#132033",
        field: "#0f766e",
        paper: "#f6f8fb"
      },
      boxShadow: {
        panel: "0 18px 45px rgba(15, 35, 66, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
