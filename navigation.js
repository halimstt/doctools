// Import pdfjs-dist
import * as pdfjsLib from "pdfjs-dist";

// Correctly import the PDF.js worker using Vite's '?url' suffix.
// This tells Vite to treat it as a URL asset and include it in the build output.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure PDF.js worker source globally
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Function to set the theme
function setTheme(themeName) {
  document.documentElement.setAttribute("data-theme", themeName);
  localStorage.setItem("theme", themeName);

  // --- IMPORTANT FIX: Update checked state and button classes for ALL theme controllers ---
  const themeControllers = document.querySelectorAll(".theme-controller");
  themeControllers.forEach((controller) => {
    if (controller.value === themeName) {
      controller.checked = true;
      // Remove btn-ghost and add a more prominent class for the active theme
      controller.classList.remove("btn-ghost");
      // Choose a class that gives a clear visual active state, e.g., 'btn-primary' or 'btn-active' if you have specific styles for it
      controller.classList.add("btn-primary"); // Or 'btn-active', 'bg-primary', etc. depending on desired look
    } else {
      controller.checked = false;
      // Ensure non-active themes revert to btn-ghost
      controller.classList.remove("btn-primary"); // Remove other active classes
      controller.classList.add("btn-ghost");
    }
  });
  // --- END IMPORTANT FIX ---
}

// Prevents FOUC by applying the theme early using data-theme attribute.
(() => {
  const storedTheme = localStorage.getItem("theme");
  // Default to 'light' if no theme is stored or if system preference is light
  // Otherwise, if system prefers dark and no theme is stored, use 'dark'
  // If a theme is stored, use that theme.
  if (
    !storedTheme &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    setTheme("dark"); // Changed default dark theme
  } else if (!storedTheme) {
    setTheme("light"); // Changed default light theme
  } else {
    setTheme(storedTheme);
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  // List of all DaisyUI themes
  const daisyThemes = [
    "light",
    "dark",
    "cupcake",
    "bumblebee",
    "emerald",
    "corporate",
    "synthwave",
    "retro",
    "cyberpunk",
    "valentine",
    "halloween",
    "garden",
    "forest",
    "aqua",
    "lofi",
    "pastel",
    "fantasy",
    "wireframe",
    "black",
    "luxury",
    "dracula",
    "cmyk",
    "autumn",
    "business",
    "acid",
    "lemonade",
    "night",
    "coffee",
    "winter",
    "dim",
    "nord",
    "sunset",
  ];

  // Helper to generate theme list items HTML
  const generateThemeListItems = (namePrefix) => {
    // Separate "light" and "dark" to put them at the top as requested.
    // Filter out "light" and "dark" from the main list temporarily.
    const filteredThemes = daisyThemes.filter(
      (theme) => theme !== "light" && theme !== "dark"
    );

    let itemsHtml = `
      <li>
        <input type="radio" name="${namePrefix}" class="theme-controller btn btn-md btn-block btn-ghost justify-start" aria-label="Light" value="light"/>
      </li>
      <li>
        <input type="radio" name="${namePrefix}" class="theme-controller btn btn-md btn-block btn-ghost justify-start" aria-label="Dark" value="dark"/>
      </li>
    `;

    // Add remaining themes
    filteredThemes.forEach((theme) => {
      // Capitalize first letter for aria-label
      const label = theme.charAt(0).toUpperCase() + theme.slice(1);
      itemsHtml += `
        <li>
          <input type="radio" name="${namePrefix}" class="theme-controller btn btn-md btn-block btn-ghost justify-start" aria-label="${label}" value="${theme}"/>
        </li>
      `;
    });
    return itemsHtml;
  };

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
        <!-- Theme selector for larger screens -->
        <div class="dropdown dropdown-end hidden md:flex">
          <div tabindex="0" role="button" class="btn m-1">
            Theme
            <svg
              width="12px"
              height="12px"
              class="inline-block h-2 w-2 fill-current opacity-60"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 2048 2048">
              <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
            </svg>
          </div>
          <ul class="dropdown-content bg-base-300 rounded-box z-[999] w-52 p-2 shadow-2xl theme-list max-h-72 overflow-y-auto">
            ${generateThemeListItems("theme-dropdown-desktop")}
          </ul>
        </div>

        <!-- Theme selector for smaller screens - moved outside the mobile menu -->
        <div class="dropdown dropdown-end md:hidden">
            <div tabindex="0" role="button" class="btn m-1">
                Theme
                <svg
                  width="12px"
                  height="12px"
                  class="inline-block h-2 w-2 fill-current opacity-60"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 2048 2048">
                  <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
                </svg>
            </div>
            <ul class="dropdown-content bg-base-300 rounded-box z-[999] w-52 p-2 shadow-2xl theme-list max-h-72 overflow-y-auto">
              ${generateThemeListItems("theme-dropdown-mobile")}
            </ul>
        </div>

        <button id="mobile-menu-button" class="btn btn-ghost md:hidden" aria-label="Open mobile menu">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        </button>
      </div>
    </header>
    <nav id="mobile-menu" class="hidden md:hidden fixed top-16 left-0 right-0 bg-base-100 shadow-md py-2 z-50">
      <ul class="menu menu-vertical w-full px-4">
        <li><a href="index.html" class="block py-3 nav-link">Statement</a></li>
        <li><a href="invoice.html" class="block py-3 nav-link">Invoice</a></li>
        <!-- Theme selector for smaller screens - REMOVED from here -->
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

  // Active link highlighting based on current page
  const currentPath = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("menu-active");
    } else {
      link.classList.remove("menu-active");
    }
  });

  // Theme selection logic
  // The initial checked state setting should also use setTheme to ensure consistency
  const initialTheme = localStorage.getItem("theme") || "light";
  setTheme(initialTheme); // Apply theme and set radio button checked state on load

  const themeControllers = document.querySelectorAll(".theme-controller");
  themeControllers.forEach((controller) => {
    controller.addEventListener("change", (event) => {
      setTheme(event.target.value);
    });
  });
});
