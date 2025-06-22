// navigation.js

// --- Early System Theme Detection Logic (STAYS AT THE TOP) ---
// This ensures the <html> element gets the 'dark' class immediately
// preventing a full page theme flash.

(() => {
  tailwind.config = {
    darkMode: "class", // Enable dark mode based on the 'dark' class
    theme: {
      extend: {
        colors: {
          // Custom colors based on the Tailwind UI theme examples
          "light-bg-primary": "#F9FAFB", // Light mode body background (gray-50/100)
          "light-bg-secondary": "#FFFFFF", // Light mode card/container background
          "light-text-primary": "#1F2937", // Light mode dark text (gray-900)
          "light-text-secondary": "#4B5563", // Light mode medium text (gray-700)
          "light-border": "#E5E7EB", // Light mode light borders (gray-200)
          "dark-bg-primary": "#111827", // Dark mode body background (gray-900)
          "dark-bg-secondary": "#1F2937", // Dark mode card/container background (gray-800)
          "dark-text-primary": "#F3F4F6", // Dark mode light text (gray-100)
          "dark-text-secondary": "#9CA3AF", // Dark mode medium text (gray-400)
          "dark-border": "#374151", // Dark mode dark borders (gray-700)
          "accent-blue-light": "#2563EB", // Blue for light mode accent (blue-600)
          "accent-blue-dark": "#60A5FA", // Blue for dark mode accent (blue-400)
        },
      },
    },
  };

  const themeKey = "theme";

  const applyTheme = (isDarkMode) => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const loadThemePreference = () => {
    const savedTheme = localStorage.getItem(themeKey);
    if (savedTheme) {
      applyTheme(savedTheme === "dark");
    } else {
      applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  };

  loadThemePreference();

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem(themeKey)) {
        applyTheme(e.matches);
      }
    });
})();

document.addEventListener("DOMContentLoaded", () => {
  // The HTML string for your navigation
  const navHtml = `
    <header class="bg-white shadow-sm dark:bg-gray-800">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center relative">
        <a href="index.html" class="text-2xl font-bold text-accent-blue-light dark:text-accent-blue-dark">Doc Tools</a>

        <nav class="hidden md:flex space-x-6 items-center">
          <a href="index.html" class="text-light-text-secondary hover:text-accent-blue-light dark:text-dark-text-secondary dark:hover:text-accent-blue-dark font-medium transition-colors duration-200">Statement</a>
          <a href="invoice.html" class="text-light-text-secondary hover:text-accent-blue-light dark:text-dark-text-secondary dark:hover:text-accent-blue-dark font-medium transition-colors duration-200">Invoice</a>
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
              <a href="index.html" class="block py-2 text-light-text-secondary hover:text-accent-blue-light dark:text-dark-text-secondary dark:hover:text-accent-blue-dark font-medium transition-colors duration-200">Statement</a>
            </li>
            <li>
              <a href="invoice.html" class="block py-2 text-light-text-secondary hover:text-accent-blue-light dark:text-dark-text-secondary dark:hover:text-accent-blue-dark font-medium transition-colors duration-200">Invoice</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  `;

  // Find the placeholder and replace its outerHTML with the actual navigation
  const navPlaceholder = document.getElementById("nav-placeholder");
  if (navPlaceholder) {
    navPlaceholder.outerHTML = navHtml;
  }

  // --- Mobile Menu Toggle Logic (STAYS AS IS) ---
  // These elements now exist within the dynamically replaced navHtml
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
