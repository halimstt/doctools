import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  base: "/", // Enable if hosting on github-pages free domain
  plugins: [
    tailwindcss(),
    react(),
    visualizer({
      filename: "./docs/bundle-report.html",
      open: false,
      gzipSize: true,
    }),
  ],
  build: {
    // Specify the output directory for the build (default is 'dist')
    outDir: "docs",
    // Clear the output directory before building
    emptyOutDir: true,
  },
  server: {
    host: true, // This will expose the server to all network interfaces
    // Or you can specify an IP address like host: '0.0.0.0',
  },
});
