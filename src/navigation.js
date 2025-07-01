import {
  showConfirmationModal,
  showMessage,
  setGeminiApiKey,
  getGeminiApiKey,
  setTheme,
} from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
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
    "winter",
    "summer",
    "spring",
    "business",
    "acid",
    "lemonade",
    "night",
    "coffee",
    "dim",
    "nord",
    "sunset",
    "caramellatte",
    "abyss",
    "silk",
    "tenang",
    "tron",
  ];

  const generateThemeListItems = (namePrefix) => {
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

    filteredThemes.forEach((theme) => {
      const label = theme.charAt(0).toUpperCase() + theme.slice(1);
      itemsHtml += `
        <li>
          <input type="radio" name="${namePrefix}" class="theme-controller btn btn-md btn-block btn-ghost justify-start" aria-label="${label}" value="${theme}"/>
        </li>
      `;
    });
    return itemsHtml;
  };

  const navHtml = `
    <header class="navbar bg-base-100 shadow-sm">
      <div class="navbar-start">
        <a href="index.html" class="btn btn-ghost normal-case text-xl text-primary">Doctools</a>
      </div>
      <div class="navbar-center hidden md:flex">
        <ul class="menu menu-horizontal px-1">
          <li><a href="index.html" class="nav-link">Home</a></li>
          <li><a href="statement.html" class="nav-link">Statement</a></li>
          <li><a href="invoice.html" class="nav-link">Invoice</a></li>
          <li><a id="clear-gemini-key-btn-desktop" class="nav-link cursor-pointer">Clear Gemini</a></li>
        </ul>
      </div>
      <div class="navbar-end">
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
      </div>
    </header>
    <div class="dock md:hidden">
      <a href="index.html" class="dock-item">
        <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt"><polyline points="1 11 12 2 23 11" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="2"></polyline><path d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></path><line x1="12" y1="22" x2="12" y2="18" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></line></g></svg>
        <span class="dock-label">Home</span>
      </a>
      <a href="statement.html" class="dock-item">
        <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt"><polyline points="3 14 9 14 9 17 15 17 15 14 21 14" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="2"></polyline><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></rect></g></svg>
        <span class="dock-label">Statement</span>
      </a>
      <a href="invoice.html" class="dock-item">
        <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt"><path d="m20,22h-16c-1.105,0-2-.895-2-2v-16c0-1.105.895-2,2-2h16c1.105,0,2,.895,2,2v16c0,1.105-.895,2-2,2Z" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></path><line x1="6" y1="8" x2="18" y2="8" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></line><line x1="6" y1="12" x2="18" y2="12" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></line><line x1="6" y1="16" x2="14" y2="16" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></line></g></svg>
        <span class="dock-label">Invoice</span>
      </a>
      <a id="clear-gemini-key-btn-mobile" class="dock-item cursor-pointer">
        <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt"><path d="m19,22h-14c-1.105,0-2-.895-2-2v-16c0-1.105.895-2,2-2h14c1.105,0,2,.895,2,2v16c0,1.105-.895,2-2,2Z" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></path><line x1="12" y1="6" x2="12" y2="18" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></line><line x1="15" y1="9" x2="12" y2="6" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></line><line x1="9" y1="9" x2="12" y2="6" fill="none" stroke="currentColor" stroke-linecap="square" stroke-miterlimit="10" stroke-width="2"></line></g></svg>
        <span class="dock-label">Clear Gemini</span>
      </a>
    </div>
  `;

  const navPlaceholder = document.getElementById("nav-placeholder");
  if (navPlaceholder) {
    navPlaceholder.outerHTML = navHtml;
  }

  const clearGeminiKeyBtnDesktop = document.getElementById(
    "clear-gemini-key-btn-desktop"
  );
  const clearGeminiKeyBtnMobile = document.getElementById(
    "clear-gemini-key-btn-mobile"
  );

  const geminiApiKeyExists = getGeminiApiKey() !== "";
  if (!geminiApiKeyExists) {
    if (clearGeminiKeyBtnDesktop) {
      clearGeminiKeyBtnDesktop.classList.add("hidden");
    }
    if (clearGeminiKeyBtnMobile) {
      clearGeminiKeyBtnMobile.classList.add("hidden");
    }
  }

  const handleClearGeminiKey = () => {
    showConfirmationModal(
      "Confirm Clear Gemini Key",
      "Are you sure you want to clear your Gemini API key? You will need to re-enter it later to use Gemini features.",
      "Clear Key",
      () => {
        setGeminiApiKey("");
        showMessage("success", "Gemini API key cleared successfully!");

        if (clearGeminiKeyBtnDesktop) {
          clearGeminiKeyBtnDesktop.classList.add("hidden");
        }
        if (clearGeminiKeyBtnMobile) {
          clearGeminiKeyBtnMobile.classList.add("hidden");
        }
      },
      () => {
        showMessage("info", "Clearing Gemini API key cancelled.");
      }
    );
  };

  if (clearGeminiKeyBtnDesktop) {
    clearGeminiKeyBtnDesktop.addEventListener("click", handleClearGeminiKey);
  }
  if (clearGeminiKeyBtnMobile) {
    clearGeminiKeyBtnMobile.addEventListener("click", handleClearGeminiKey);
  }

  const currentPath = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".nav-link, .dock-item");

  navLinks.forEach((link) => {
    if (
      link.getAttribute("href") &&
      link.getAttribute("href") === currentPath
    ) {
      link.classList.add("dock-active");
    } else {
      link.classList.remove("dock-active");
    }
  });

  (() => {
    const storedTheme = localStorage.getItem("theme");
    let initialTheme = "light";

    if (storedTheme) {
      initialTheme = storedTheme;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      initialTheme = "dark";
    }

    setTheme(initialTheme);
  })();

  const themeControllers = document.querySelectorAll(".theme-controller");
  themeControllers.forEach((controller) => {
    controller.addEventListener("change", (event) => {
      setTheme(event.target.value);
    });
  });
});
