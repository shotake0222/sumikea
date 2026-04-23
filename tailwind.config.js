/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        // appフォルダ内の全ファイル
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // appの外にあるcomponentsフォルダ
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",        // supabase等が入っているlibフォルダ
  ],
  theme: {
    extend: {
      colors: {
        posutto: '#2563eb', // ぽすっとブルー
      },
    },
  },
  plugins: [],
}