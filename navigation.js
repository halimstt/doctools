// Import Inter font styles for specific subsets and weights
// If your content is primarily English, you likely only need 'latin' and 'latin-ext'.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";

// Uncomment the line below if you also need latin-extended characters (e.g., for some European languages)
// import '@fontsource/inter/latin-ext-400.css';
// import '@fontsource/inter/latin-ext-500.css';
// import '@fontsource/inter/latin-ext-600.css';
// import '@fontsource/inter/latin-ext-700.css';

// Import pdfjs-dist
import * as pdfjsLib from "pdfjs-dist";

// Set the worker source using new URL() and import.meta.url
// This tells Vite to treat the worker file as an asset and provide its URL.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs", // Or 'pdfjs-dist/build/pdf.worker.min.mjs'
  import.meta.url
).toString();

// Prevents FOUC (Flash of Unstyled Content) by applying the theme early.
(() => {
  const theme = localStorage.getItem("theme");
  if (
    theme === "dark" ||
    (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  // Navigation HTML structure remains the same, but now uses the new nav-link custom class
  const navHtml = `
    <header class="bg-white shadow-sm dark:bg-gray-800">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center relative">
        <a href="index.html" class="text-2xl font-bold text-accent-blue-light dark:text-accent-blue-dark">Doc Tools</a>

        <nav class="hidden md:flex space-x-6 items-center">
          <a href="index.html" class="nav-link">Statement</a>
          <a href="invoice.html" class="nav-link">Invoice</a>
        </nav>

        <div class="flex items-center md:hidden space-x-2">
          <button id="mobile-menu-button" class="text-gray-700 dark:text-gray-300 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-blue-light dark:focus:ring-accent-blue-dark transition-colors duration-200" aria-label="Open mobile menu">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          </button>
        </div>

        <nav id="mobile-menu" class="hidden md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-md py-2 z-50">
          <ul class="flex flex-col space-y-2 px-4">
            <li>
              <a href="index.html" class="block py-2 nav-link">Statement</a>
            </li>
            <li>
              <a href="invoice.html" class="block py-2 nav-link">Invoice</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  `;

  const navPlaceholder = document.getElementById("nav-placeholder");
  if (navPlaceholder) {
    navPlaceholder.outerHTML = navHtml;
  }

  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
      const icon = mobileMenuButton.querySelector("svg");
      if (mobileMenu.classList.contains("hidden")) {
        icon.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>';
      } else {
        icon.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
      }
    });
  }
});
