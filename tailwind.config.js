// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  // スキャン対象をプロジェクト全体に広げる
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // srcフォルダがある場合のため
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;