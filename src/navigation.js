function setTheme(themeName) {
  document.documentElement.setAttribute("data-theme", themeName);
  localStorage.setItem("theme", themeName);

  const themeControllers = document.querySelectorAll(".theme-controller");
  themeControllers.forEach((controller) => {
    if (controller.value === themeName) {
      controller.checked = true;
      controller.classList.remove("btn-ghost");
      controller.classList.add("btn-primary");
    } else {
      controller.checked = false;
      controller.classList.remove("btn-primary");
      controller.classList.add("btn-ghost");
    }
  });
}

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
          <li><a href="index.html" class="nav-link">Statement</a></li>
          <li><a href="invoice.html" class="nav-link">Invoice</a></li>
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

  const currentPath = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("menu-active");
    } else {
      link.classList.remove("menu-active");
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
