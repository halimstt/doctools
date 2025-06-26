/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./invoice.html",
    "./index.js",
    "./invoice.js",
    "./navigation.js", // If you dynamically set themes, ensure JS files are scanned
    // Add any other paths where you use Tailwind/DaisyUI classes, e.g.:
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {},
  },
  daisyui: {
    // You can still list themes here for clarity or if you use specific DaisyUI config features,
    // but the actual CSS generation is primarily driven by the @plugin in your CSS file for v5.
    // If you list themes here, ensure it matches what's in your CSS file.
    themes: ["light", "dark", "cupcake", "synthwave", "dracula", "emerald"],
    // Other DaisyUI config like base, styled, utils, etc.
    // For example, to ensure default base styles for components are included:
    base: true, // adds base styles for HTML elements
    styled: true, // adds all daisyUI component styles
    utils: true, // adds responsive and helper utility classes
    rtl: false, // For right-to-left languages
    prefix: "", // DaisyUI class prefix (e.g., 'daisy-btn')
    logs: true, // Shows DaisyUI logs in console
  },
  plugins: [require("daisyui")],
};
