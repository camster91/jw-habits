/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'jw-blue': '#4A6FA4',
        'jw-green': '#71BC37',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        glow: {
          'from': { boxShadow: '0 0 5px rgba(74, 111, 164, 0.5)' },
          'to': { boxShadow: '0 0 20px rgba(74, 111, 164, 0.8)' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          'from': { opacity: '0', transform: 'translateX(-10px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          primary: "#4A6FA4",
          secondary: "#71BC37",
          accent: "#f59e0b",
          neutral: "#374151",
          "base-100": "#ffffff",
          "base-200": "#f3f4f6",
          "base-300": "#e5e7eb",
        },
      },
      {
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "#5b8fd9",
          secondary: "#84d94a",
          accent: "#fbbf24",
          // Override DaisyUI's default dim #A6ADBB to actual iOS dark
          // mode colors. iOS uses 3 surface layers (page < card <
          // card-elevated) and a white text on the topmost layer.
          //   page:    #000000 (true black, what iOS uses)
          //   card:    #1C1C1E (the .ios-grouped card background)
          //   text:    #FFFFFF (label, primary)
          //   text-2:  rgba(235,235,245,0.78) → via text-base-content/70
          //            in CSS, Tailwind reads base-content/70 from the
          //            CSS color-mix() result. To keep things simple we
          //            pin base-content to white here; the existing
          //            text-base-content/70 etc. classes continue to
          //            render as 70% white-on-dark.
          "base-content": "#FFFFFF",
          "base-100": "#1C1C1E",
          "base-200": "#000000",
          "base-300": "#2C2C2E",
        },
      },
    ],
  },
}
