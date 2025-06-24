/** @type {import('tailwindcss').Config} */
export default {
  // Configure dark mode to be based on the 'data-theme' attribute on the html element
  // DaisyUI automatically handles this with its theme system.
  darkMode: ["class", '[data-theme="dracula"]'], // Use class strategy for theme toggle
  content: [
    "./index.html",
    "./invoice.html",
    "./index.js",
    "./invoice.js",
    "./navigation.js",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // We are removing custom colors here. DaisyUI themes like 'pastel' and 'dracula'
      // will provide a comprehensive color palette that integrates with component styles.
      // If you need specific custom colors in addition to DaisyUI, you can define them here,
      // but ensure they don't clash with DaisyUI's built-in color names if you intend
      // to override primary, secondary, accent, etc.
      zIndex: {
        1000: "1000", // Keep for modals
      },
      width: {
        90: "22.5rem", // Keep for modal content
      },
    },
  },
  // Add the DaisyUI plugin and configure its themes
  daisyui: {
    themes: [
      "pastel", // Light theme
      "dracula", // Dark theme
    ],
    darkTheme: "dracula", // Explicitly set the default dark theme
    // Add other DaisyUI configuration options if needed, e.g.,
    // styled: true, // include daisyUI colors and design system
    // base: true, // include base styles
    // utils: true, // adds responsive and other utility classes
    // logs: false, // shows daisyUI info in browser console (default is true)
    // prefix: "", // prefix for daisyUI classes (default is "")
  },
  plugins: [require("daisyui")], // Require the daisyUI plugin
};
