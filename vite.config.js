import { resolve } from "path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  // base: "/doctools/", // Enable if hosting on github-pages free domain
  plugins: [
    tailwindcss(),
    visualizer({
      filename: "./dist/bundle-report.html",
      open: false,
      gzipSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        // Define entry points for your HTML files
        main: resolve(__dirname, "index.html"),
        statement: resolve(__dirname, "statement.html"),
        invoice: resolve(__dirname, "invoice.html"),
        // Add more HTML entry points here if you have them
      },
    },
    // Specify the output directory for the build (default is 'dist')
    outDir: "dist",
    // Clear the output directory before building
    emptyOutDir: true,
  },
  server: {
    host: true, // This will expose the server to all network interfaces
    // Or you can specify an IP address like host: '0.0.0.0',
  },
});
