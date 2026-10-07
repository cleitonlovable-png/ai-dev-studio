/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cada tom vira uma variavel CSS (ver src/index.css), trocada
        // automaticamente conforme a classe .dark esteja presente ou nao
        // no <html> — o app inteiro reage sem precisar editar componentes.
        base: {
          950: "rgb(var(--color-base-950) / <alpha-value>)",
          900: "rgb(var(--color-base-900) / <alpha-value>)",
          850: "rgb(var(--color-base-850) / <alpha-value>)",
          800: "rgb(var(--color-base-800) / <alpha-value>)",
          700: "rgb(var(--color-base-700) / <alpha-value>)",
          600: "rgb(var(--color-base-600) / <alpha-value>)",
        },
        border: {
          subtle: "rgb(var(--color-border-subtle) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
        },
        success: "#22c55e",
        warning: "#eab308",
        danger: "#ef4444",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        // So sobrescreve os tons de slate que o app realmente usa como
        // texto (100-400); os demais tons continuam com o valor padrao
        // do Tailwind, sem precisar redefinir a paleta inteira.
        slate: {
          100: "rgb(var(--color-slate-100) / <alpha-value>)",
          200: "rgb(var(--color-slate-200) / <alpha-value>)",
          300: "rgb(var(--color-slate-300) / <alpha-value>)",
          400: "rgb(var(--color-slate-400) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
