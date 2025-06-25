// Import Inter font styles for specific subsets and weights
// If your content is primarily English, you likely only need 'latin' and 'latin-ext'.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";

// Import pdfjs-dist
import * as pdfjsLib from "pdfjs-dist";

// Correctly import the PDF.js worker using Vite's '?url' suffix.
// This tells Vite to treat it as a URL asset and include it in the build output.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure PDF.js worker source globally
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Prevents FOUC by applying the theme early using data-theme attribute.
(() => {
  const theme = localStorage.getItem("theme");
  if (
    theme === "dark" ||
    (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.setAttribute("data-theme", "dracula"); // Set dark theme
    document.documentElement.classList.add("dark"); // Keep 'dark' class for specific tailwind overrides if any
  } else {
    document.documentElement.setAttribute("data-theme", "emerald"); // Set light theme
    document.documentElement.classList.remove("dark"); // Remove 'dark' class
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  // Navigation HTML structure using DaisyUI classes
  const navHtml = `
    <header class="navbar bg-base-100 shadow-sm">
      <div class="navbar-start">
        <a href="index.html" class="btn btn-ghost normal-case text-xl text-primary">Doc Tools</a>
      </div>
      <div class="navbar-center hidden md:flex">
        <ul class="menu menu-horizontal px-1">
          <li><a href="index.html" class="nav-link">Statement</a></li>
          <li><a href="invoice.html" class="nav-link">Invoice</a></li>
        </ul>
      </div>
      <div class="navbar-end">
        <button id="mobile-menu-button" class="btn btn-ghost md:hidden" aria-label="Open mobile menu">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        </button>
      </div>
    </header>
    <nav id="mobile-menu" class="hidden md:hidden fixed top-16 left-0 right-0 bg-base-100 shadow-md py-2 z-50">
      <ul class="menu menu-vertical px-4">
        <li><a href="index.html" class="block py-2 nav-link">Statement</a></li>
        <li><a href="invoice.html" class="block py-2 nav-link">Invoice</a></li>
      </ul>
    </nav>
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
      // SVG paths remain the same as they are embedded directly
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

  // Active link highlighting based on current page (adapt for DaisyUI's 'active' class on tabs/links)
  const currentPath = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active"); // DaisyUI uses 'active' class for active state
    } else {
      link.classList.remove("active");
    }
  });

  // NOTE: Shared Modal Logic for API Key and Confirmation is now entirely handled
  // by `utils.js` and DaisyUI's `modal` component.
  // The showApiKeyModal and showConfirmationModal functions in `utils.js`
  // will now use `modal.showModal()` and `modal.close()` instead of
  // toggling 'hidden' classes.
});
