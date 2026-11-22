/** @type {import('tailwindcss').Config} */
module.exports = {
  "presets": [require('./public/dashhq/dashhq-tailwind-preset.cjs')],
  "darkMode": [
    "selector",
    "[data-theme=\"dark\"]"
  ],
  "content": [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  "theme": {
    "extend": {
      "colors": {},
      "fontFamily": {
        "sans": [
          "var(--dh-font)"
        ]
      },
      "animation": {
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "scale-in": "scaleIn 0.2s ease-out"
      },
      "keyframes": {
        "slideUp": {
          "0%": {
            "transform": "translateY(10px)",
            "opacity": "0"
          },
          "100%": {
            "transform": "translateY(0)",
            "opacity": "1"
          }
        },
        "slideDown": {
          "0%": {
            "transform": "translateY(-10px)",
            "opacity": "0"
          },
          "100%": {
            "transform": "translateY(0)",
            "opacity": "1"
          }
        },
        "fadeIn": {
          "0%": {
            "opacity": "0"
          },
          "100%": {
            "opacity": "1"
          }
        },
        "scaleIn": {
          "0%": {
            "transform": "scale(0.95)",
            "opacity": "0"
          },
          "100%": {
            "transform": "scale(1)",
            "opacity": "1"
          }
        }
      }
    }
  },
  "plugins": []
}
