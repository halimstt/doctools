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
    outDir: "docs",
    // Clear the output directory before building
    emptyOutDir: true,
  },
});
