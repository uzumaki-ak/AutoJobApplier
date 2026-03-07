import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx,js,jsx}",
    "./src/components/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        // Light Mode Colors (White + Blue)
        background: "#ffffff",
        foreground: "#0f172a",
        muted: "#f1f5f9",
        "muted-foreground": "#64748b",
        border: "#e2e8f0",
        card: "#ffffff",
        "card-foreground": "#0f172a",
        primary: "#2563eb",
        "primary-foreground": "#ffffff",
        secondary: "#f1f5f9",
        "secondary-foreground": "#0f172a",
        accent: "#eff6ff",
        "accent-foreground": "#1d4ed8",
        destructive: "#ef4444",
        "destructive-foreground": "#ffffff",
        ring: "#2563eb",
        input: "#e2e8f0",
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

export default config;
