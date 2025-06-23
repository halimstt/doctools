import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  // Configure the build process for Rollup (used by Vite internally)
  build: {
    rollupOptions: {
      input: {
        // Define entry points for your HTML files
        main: resolve(__dirname, "index.html"),
        invoice: resolve(__dirname, "invoice.html"),
        // Add more HTML entry points here if you have them
      },
    },
    // Specify the output directory for the build (default is 'dist')
    outDir: "dist",
    // Clear the output directory before building
    emptyOutDir: true,
  },
  // IMPORTANT: Remove explicit postcss configuration here.
  // Vite will automatically pick up your 'postcss.config.js' file
  // and use it to process any CSS imported in your JavaScript.
  // This simplifies the Vite config and relies on the dedicated PostCSS config.
  // If you previously had 'css: { postcss: { plugins: [...] } }' here, remove it.
});
