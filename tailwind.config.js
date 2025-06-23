/** @type {import('tailwindcss').Config} */
export default {
  // Configure dark mode to be based on the 'class' attribute on the html element
  darkMode: "class",
  // Specify all files that should be scanned for Tailwind classes.
  // This is crucial for Tailwind's JIT mode to work correctly and purge unused CSS.
  content: [
    "./index.html", // Include your main HTML files
    "./invoice.html",
    // Include all JavaScript files that contain or import Tailwind classes.
    // Vite will resolve these imports and process the CSS.
    "./index.js",
    "./invoice.js",
    "./navigation.js",
    // If you have any other JS/TS/JSX/TSX files that use Tailwind classes, add them here.
    "./src/**/*.{js,ts,jsx,tsx}", // General glob pattern for files in src/
  ],
  theme: {
    extend: {
      colors: {
        // Define custom color palette based on your existing theme
        "light-bg-primary": "#F9FAFB",
        "light-bg-secondary": "#FFFFFF",
        "light-text-primary": "#1F2937",
        "light-text-secondary": "#4B5563",
        "light-border": "#E5E7EB",
        "dark-bg-primary": "#111827",
        "dark-bg-secondary": "#1F2937",
        "dark-text-primary": "#F3F4F6",
        "dark-text-secondary": "#9CA3AF",
        "dark-border": "#374151",
        "accent-blue-light": "#2563EB",
        "accent-blue-dark": "#60A5FA",
      },
      // Extend the default z-index values to include z-1000 for modals
      zIndex: {
        1000: "1000",
      },
      // Extend the default width values to include w-90 for modal content
      width: {
        90: "22.5rem", // 90 * 0.25rem = 22.5rem, assuming Tailwind's default base of 4 (16px) units for width
      },
    },
  },
  plugins: [],
};
