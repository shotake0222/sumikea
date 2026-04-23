/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",      // appフォルダの中すべて
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",    // もしpagesフォルダがあれば
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // componentsフォルダ
    "./src/**/*.{js,ts,jsx,tsx,mdx}",      // もしsrcフォルダがあれば
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}