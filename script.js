const root = document.documentElement;
const body = document.body;
const languageButtons = document.querySelectorAll(".language-button");
const printButtons = document.querySelectorAll(".print-button");
const menuButton = document.querySelector(".menu-button");
const overlay = document.querySelector(".drawer-overlay");
const navLinks = [...document.querySelectorAll(".site-nav a")];
const sections = [...document.querySelectorAll("main section[id]")];

function readStoredLanguage() {
  try {
    return localStorage.getItem("resume-language");
  } catch {
    return null;
  }
}

function storeLanguage(language) {
  try {
    localStorage.setItem("resume-language", language);
  } catch {
    // The page still works when storage is blocked.
  }
}

const storedLanguage = readStoredLanguage();
const preferredLanguage = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";

function setLanguage(language) {
  const nextLanguage = language === "zh" ? "zh" : "en";
  root.dataset.lang = nextLanguage;
  root.lang = nextLanguage === "zh" ? "zh-CN" : "en";
  storeLanguage(nextLanguage);
  document.title = nextLanguage === "zh"
    ? root.dataset.titleZh || "柴斌 — GPU 性能工程师"
    : root.dataset.titleEn || "Bin Chai — GPU Performance Engineer";
}

setLanguage(storedLanguage || preferredLanguage);

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(root.dataset.lang === "en" ? "zh" : "en");
  });
});

printButtons.forEach((button) => button.addEventListener("click", () => window.print()));

function setDrawer(open) {
  body.classList.toggle("drawer-open", open);
  menuButton?.setAttribute("aria-expanded", String(open));
  overlay?.setAttribute("aria-hidden", String(!open));
}

menuButton?.addEventListener("click", () => setDrawer(!body.classList.contains("drawer-open")));
overlay?.addEventListener("click", () => setDrawer(false));

navLinks.forEach((link) => {
  link.addEventListener("click", () => setDrawer(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setDrawer(false);
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );

  document.querySelectorAll(".reveal").forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
    revealObserver.observe(element);
  });

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
      });
    },
    { rootMargin: "-18% 0px -63%", threshold: [0.02, 0.2, 0.5] },
  );

  sections.forEach((section) => sectionObserver.observe(section));
} else {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("visible"));
}

document.getElementById("current-year").textContent = new Date().getFullYear();
