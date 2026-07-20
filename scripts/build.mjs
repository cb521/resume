import { cp, copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const dataPath = path.join(rootDirectory, "data", "resume.json");
const templatePath = path.join(rootDirectory, "src", "index.template.html");
const outputDirectory = path.join(rootDirectory, "dist");

const externalIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>';
const chevronIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>';
const mailIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM3 6l9 7 9-7" /></svg>';
const printIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" /></svg>';
const languageIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3.5 12h17M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21M12 3C9.8 5.5 8.7 8.5 8.7 12S9.8 18.5 12 21" /></svg>';

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInline(value) {
  const parts = String(value ?? "").split("**");
  if (parts.length % 2 === 0) {
    throw new Error(`Unmatched ** in text: ${value}`);
  }
  return parts.map((part, index) => index % 2 ? `<strong>${escapeHtml(part)}</strong>` : escapeHtml(part)).join("");
}

function isLocalized(value) {
  return value && typeof value === "object" && !Array.isArray(value) && "en" in value && "zh" in value;
}

function localizedInline(value, { markdown = false } = {}) {
  const render = markdown ? formatInline : escapeHtml;
  if (!isLocalized(value)) return render(value);
  return `<span class="lang-en">${render(value.en)}</span><span class="lang-zh">${render(value.zh)}</span>`;
}

function localizedBlock(tag, value, className = "", { markdown = false } = {}) {
  const render = markdown ? formatInline : escapeHtml;
  const baseClass = className ? `${className} ` : "";
  if (!isLocalized(value)) {
    return `<${tag}${className ? ` class="${escapeHtml(className)}"` : ""}>${render(value)}</${tag}>`;
  }
  return `<${tag} class="${baseClass}lang-en">${render(value.en)}</${tag}><${tag} class="${baseClass}lang-zh">${render(value.zh)}</${tag}>`;
}

function localizedPair(first, separator, second) {
  const normalize = (value, language) => isLocalized(value) ? value[language] : value;
  return {
    en: `${normalize(first, "en")}${separator}${normalize(second, "en")}`,
    zh: `${normalize(first, "zh")}${separator}${normalize(second, "zh")}`,
  };
}

function assetUrl(value) {
  const url = String(value);
  return /^(?:\.|\/|https?:)/.test(url) ? url : `./${url}`;
}

function externalAttributes(url) {
  return /^https?:\/\//.test(url) ? ' target="_blank" rel="noreferrer"' : "";
}

function renderTags(tags = []) {
  return `<div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function renderSectionHeading(title) {
  return `<div class="section-heading reveal">
          <h2>${localizedInline(title)}<span aria-hidden="true">⌘</span></h2>
        </div>`;
}

function renderPageChrome(data) {
  const { site } = data;
  const status = localizedPair(site.location, " · ", site.availability);
  const navigation = [
    ["home", "Home", "首页"],
    ["work", "Work Experience", "工作经历"],
    ["speaking", "Sharing", "分享"],
    ["background", "Education & Publications", "教育与论文"],
    ["contact", "Contact", "联系我"],
  ];

  return `<a class="skip-link" href="#main-content">
      <span class="lang-en">Skip to content</span>
      <span class="lang-zh">跳到正文</span>
    </a>

    <header class="mobile-bar">
      <button class="icon-button menu-button" type="button" aria-label="Open navigation" aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <a class="mobile-brand" href="#home" aria-label="${escapeHtml(site.name.en)} home">
        <span class="brand-mark brand-mark--small">${escapeHtml(site.monogram)}</span>
        <span>${escapeHtml(site.name.en)}</span>
      </a>
      <button class="language-button language-button--mobile" type="button" aria-label="Switch language">
        <span class="lang-en">中文</span><span class="lang-zh">EN</span>
      </button>
    </header>

    <div class="drawer-overlay" aria-hidden="true"></div>

    <aside class="sidebar" aria-label="Primary navigation">
      <div class="sidebar-inner">
        <a class="identity" href="#home" aria-label="${escapeHtml(site.name.en)} home">
          <div class="brand-mark" aria-hidden="true"><span>${escapeHtml(site.monogram)}</span><i></i><i></i><i></i></div>
          <div><strong>${escapeHtml(site.name.en)}</strong><span>${escapeHtml(site.name.zh)}</span></div>
        </a>

        <nav class="site-nav" aria-label="Section navigation">
          ${navigation.map(([id, en, zh], index) => `<a${index === 0 ? ' class="active"' : ""} href="#${id}"><span class="lang-en">${escapeHtml(en)}</span><span class="lang-zh">${escapeHtml(zh)}</span></a>`).join("\n          ")}
        </nav>

        <div class="sidebar-actions">
          <button class="language-button" type="button" aria-label="Switch language">
            ${languageIcon}<span class="lang-en">中文</span><span class="lang-zh">English</span>
          </button>
          <button class="print-button" type="button">
            ${printIcon}<span class="lang-en">Save as PDF</span><span class="lang-zh">保存为 PDF</span>
          </button>
        </div>

        <p class="sidebar-note"><span class="status-dot"></span>${localizedInline(status)}</p>
      </div>
    </aside>`;
}

function renderHero(data) {
  const { site, hero } = data;
  return `<section class="hero section" id="home">
        <h1 class="hero-title reveal">
          <span class="lang-en">${escapeHtml(hero.greeting.en)}<span class="wave" aria-hidden="true">👋</span></span>
          <span class="lang-zh">${escapeHtml(hero.greeting.zh)}<span class="wave" aria-hidden="true">👋</span></span>
        </h1>

        <p class="print-contact">${escapeHtml(site.name.en)} · ${escapeHtml(site.location.en)} · ${escapeHtml(site.email)}</p>

        <div class="hero-copy reveal">
          ${localizedBlock("p", hero.lead, "lead", { markdown: true })}
          <ul class="intro-list">
            ${hero.intro.map((item) => `<li><span class="bullet-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>${localizedInline(item.text)}</li>`).join("\n            ")}
          </ul>
        </div>

        <div class="hero-actions reveal">
          <a class="primary-button" href="#work"><span class="lang-en">Explore my work</span><span class="lang-zh">查看工作经历</span>${chevronIcon}</a>
          <a class="text-button" href="mailto:${escapeHtml(site.email)}">${mailIcon}<span class="lang-en">Email me</span><span class="lang-zh">邮件联系</span></a>
          <button class="text-button print-button print-button--inline" type="button">${printIcon}<span class="lang-en">Print résumé</span><span class="lang-zh">打印简历</span></button>
        </div>
      </section>`;
}

function renderCompanyHeading(group, spaced) {
  return `<div class="company-heading${spaced ? " company-heading--spaced" : ""} reveal">
          <div class="company-logo company-logo--${escapeHtml(group.logoKey)}" aria-hidden="true"><img src="${escapeHtml(assetUrl(group.logo))}" alt="" /></div>
          <div><strong>${localizedInline(group.company)}</strong><span>${localizedInline(group.meta)}</span></div>
        </div>`;
}

function renderWorkLink(link) {
  if (!link) return "";
  return `<a class="card-link" href="${escapeHtml(link.url)}"${externalAttributes(link.url)}>${localizedInline(link.label)}${externalIcon}</a>`;
}

function renderWorkCard(project) {
  return `<article class="work-card${project.featured ? " work-card--featured" : ""} reveal">
            <div class="card-topline"><span>${escapeHtml(project.years)}</span><span class="role-pill">${localizedInline(project.role)}</span></div>
            <h3>${localizedInline(project.title)}</h3>
            ${localizedBlock("p", project.description)}
            <ul class="result-list">${project.results.map((result) => `<li>${localizedInline(result)}</li>`).join("")}</ul>
            <div class="card-footer">${renderTags(project.tags)}${renderWorkLink(project.link)}</div>
          </article>`;
}

function renderWideCard(project) {
  return `<article class="wide-card reveal">
          <div><span class="role-pill">${localizedInline(project.role)}</span><h3>${localizedInline(project.title)}</h3></div>
          ${localizedBlock("p", project.description)}
          <div class="wide-card-result"><strong>${escapeHtml(project.metric.value)}</strong>${localizedInline(project.metric.label)}</div>
        </article>`;
}

function renderInternships(group, spaced) {
  const label = group.companies.map((company) => isLocalized(company.name) ? company.name.en : company.name).join(", ");
  return `<div class="company-heading company-heading--plain${spaced ? " company-heading--spaced" : ""} reveal">
          <div><strong>${localizedInline(group.company)}</strong><span>${localizedInline(group.meta)}</span></div>
        </div>
        <article class="internship-card reveal">
          ${localizedBlock("p", group.description)}
          <div class="internship-companies" role="list" aria-label="${escapeHtml(label)}">
            ${group.companies.map((company) => `<div class="internship-company" role="listitem"><span class="internship-logo internship-logo--${escapeHtml(company.logoKey)}" aria-hidden="true"><img src="${escapeHtml(assetUrl(company.logo))}" alt="" /></span><strong>${localizedInline(company.name)}</strong></div>`).join("\n            ")}
          </div>
        </article>`;
}

function renderWork(data) {
  const groups = data.work.map((group, index) => {
    if (group.layout === "internships") {
      return renderInternships(group, index > 0);
    }
    const heading = renderCompanyHeading(group, index > 0);
    if (group.layout === "grid") {
      return `${heading}\n        <div class="work-grid">${group.projects.map(renderWorkCard).join("\n")}</div>`;
    }
    if (group.layout === "wide") {
      return `${heading}\n        ${group.projects.map(renderWideCard).join("\n        ")}`;
    }
    throw new Error(`Unknown work layout: ${group.layout}`);
  }).join("\n\n        ");

  return `<section class="section" id="work">
        ${renderSectionHeading({ en: "Work Experience", zh: "工作经历" })}
        ${groups}
      </section>`;
}

function renderEvent(event) {
  const tag = event.url ? "a" : "article";
  const linkAttributes = event.url ? ` href="${escapeHtml(event.url)}"${externalAttributes(event.url)}` : "";
  return `<${tag} class="media-card reveal"${linkAttributes}>
            <div class="media-image"><img src="${escapeHtml(assetUrl(event.image.src))}" alt="${escapeHtml(event.image.alt)}" loading="lazy" /></div>
            <div class="media-body">
              <div class="card-topline"><span>${escapeHtml(event.meta)}</span><span class="role-pill">${localizedInline(event.role)}</span></div>
              <h3>${localizedInline(event.title)}</h3>
              <span class="media-link">${localizedInline(event.label)}${event.url ? " ↗" : ""}</span>
            </div>
          </${tag}>`;
}

function renderWritingItem(item) {
  return `<a class="writing-item reveal" href="${escapeHtml(item.url)}"${externalAttributes(item.url)}>
            <span class="writing-type">${escapeHtml(item.type)}</span>
            <div><h3>${localizedInline(item.title)}</h3><p>${localizedInline(item.meta)}</p></div>
            ${externalIcon}
          </a>`;
}

function renderSpeaking(data) {
  return `<section class="section" id="speaking">
        ${renderSectionHeading({ en: "Sharing", zh: "分享" })}
        <div class="media-grid">${data.speaking.events.map(renderEvent).join("\n")}</div>
        <div class="writing-list">${data.speaking.writing.map(renderWritingItem).join("\n")}</div>
      </section>`;
}

function renderEducation(item) {
  return `<article class="education-card"><span class="education-years">${escapeHtml(item.years)}</span><h4>${localizedInline(item.school)}</h4><p>${localizedInline(item.degree)}</p></article>`;
}

function renderPublication(item) {
  return `<a class="publication-card" href="${escapeHtml(item.url)}"${externalAttributes(item.url)}>
              <span class="publication-role">${localizedInline(item.role)}</span>
              <h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.venue)}</p>${externalIcon}
            </a>`;
}

function renderBackground(data) {
  const background = data.background;
  return `<section class="section" id="background">
        ${renderSectionHeading({ en: "Education & Publications", zh: "教育与论文" })}
        <div class="background-grid">
          <div class="background-column reveal">
            <h3 class="subsection-title"><span class="lang-en">Education</span><span class="lang-zh">教育经历</span></h3>
            ${background.education.map(renderEducation).join("\n            ")}
            <h3 class="subsection-title subsection-title--spaced"><span class="lang-en">Selected Recognition</span><span class="lang-zh">部分奖项</span></h3>
            <ul class="award-list">${background.recognition.map((item) => `<li><strong>${escapeHtml(item.year)}</strong>${localizedInline(item.name)}</li>`).join("")}</ul>
          </div>
          <div class="background-column reveal">
            <h3 class="subsection-title"><span class="lang-en">Publications</span><span class="lang-zh">论文</span></h3>
            ${background.publications.map(renderPublication).join("\n            ")}
            <h3 class="subsection-title subsection-title--spaced"><span class="lang-en">Toolbox</span><span class="lang-zh">技术栈</span></h3>
            <div class="skills-cloud">${background.skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}</div>
          </div>
        </div>
      </section>`;
}

function renderContact(data) {
  const { site, contact } = data;
  return `<section class="contact-section section" id="contact">
        <div class="contact-card reveal">
          <h2>${localizedInline(contact.title)}</h2>
          ${localizedBlock("p", contact.description)}
          <div class="contact-actions">
            <a class="primary-button primary-button--dark" href="mailto:${escapeHtml(site.email)}">${mailIcon}${escapeHtml(site.email)}</a>
            <a class="text-button text-button--light" href="${escapeHtml(site.authorProfile)}"${externalAttributes(site.authorProfile)}><span class="lang-en">NVIDIA author profile</span><span class="lang-zh">NVIDIA 作者主页</span> ↗</a>
          </div>
        </div>
        <footer>
          <p>© <span id="current-year">${new Date().getFullYear()}</span> ${escapeHtml(site.name.en)}</p>
          <p><span class="lang-en">Built for the open web. No tracking.</span><span class="lang-zh">为开放网络而建，不收集访问数据。</span></p>
        </footer>
      </section>`;
}

function renderBody(data) {
  return `    ${renderPageChrome(data)}

    <main id="main-content">
      ${renderHero(data)}

      ${renderWork(data)}

      ${renderSpeaking(data)}

      ${renderBackground(data)}

      ${renderContact(data)}
    </main>`;
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

async function validateData(data) {
  const requireText = (value, label) => requireValue(typeof value === "string" && value.trim().length > 0, `${label} must be non-empty text`);
  const requireLocalizedText = (value, label) => {
    if (typeof value === "string") return requireText(value, label);
    requireValue(isLocalized(value), `${label} must be text or contain en and zh`);
    requireText(value.en, `${label}.en`);
    requireText(value.zh, `${label}.zh`);
  };
  const requireArray = (value, label, { allowEmpty = true } = {}) => {
    requireValue(Array.isArray(value), `${label} must be an array`);
    if (!allowEmpty) requireValue(value.length > 0, `${label} must not be empty`);
  };
  const requireUrl = (value, label) => {
    requireText(value, label);
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`${label} must be a valid URL`);
    }
    requireValue(parsed.protocol === "https:", `${label} must use https`);
  };

  requireValue(data && typeof data === "object", "resume.json must contain an object");
  requireValue(isLocalized(data.site?.name), "site.name must contain en and zh");
  requireValue(isLocalized(data.site?.title), "site.title must contain en and zh");
  requireValue(typeof data.site?.email === "string" && data.site.email.includes("@"), "site.email is invalid");
  requireUrl(data.site.url, "site.url");
  requireUrl(data.site.authorProfile, "site.authorProfile");
  requireLocalizedText(data.site.location, "site.location");
  requireLocalizedText(data.site.availability, "site.availability");
  requireLocalizedText(data.site.role, "site.role");
  requireLocalizedText(data.hero?.greeting, "hero.greeting");
  requireLocalizedText(data.hero?.lead, "hero.lead");
  requireArray(data.hero?.intro, "hero.intro", { allowEmpty: false });
  requireArray(data.work, "work", { allowEmpty: false });

  data.work.forEach((group, groupIndex) => {
    const label = `work[${groupIndex}]`;
    requireLocalizedText(group.company, `${label}.company`);
    requireLocalizedText(group.meta, `${label}.meta`);
    requireValue(["grid", "wide", "internships"].includes(group.layout), `${label}.layout must be grid, wide, or internships`);
    if (group.layout === "internships") {
      requireLocalizedText(group.description, `${label}.description`);
      requireArray(group.companies, `${label}.companies`, { allowEmpty: false });
      group.companies.forEach((company, companyIndex) => {
        requireLocalizedText(company.name, `${label}.companies[${companyIndex}].name`);
        requireText(company.logo, `${label}.companies[${companyIndex}].logo`);
        requireText(company.logoKey, `${label}.companies[${companyIndex}].logoKey`);
      });
      return;
    }
    requireText(group.logo, `${label}.logo`);
    requireText(group.logoKey, `${label}.logoKey`);
    requireArray(group.projects, `${label}.projects`, { allowEmpty: false });

    group.projects.forEach((project, projectIndex) => {
      const projectLabel = `${label}.projects[${projectIndex}]`;
      requireLocalizedText(project.role, `${projectLabel}.role`);
      requireLocalizedText(project.title, `${projectLabel}.title`);
      requireLocalizedText(project.description, `${projectLabel}.description`);
      if (group.layout === "grid") {
        requireText(project.years, `${projectLabel}.years`);
        requireArray(project.results, `${projectLabel}.results`);
        project.results.forEach((result, resultIndex) => requireLocalizedText(result, `${projectLabel}.results[${resultIndex}]`));
        requireArray(project.tags, `${projectLabel}.tags`);
        if (project.link) {
          requireUrl(project.link.url, `${projectLabel}.link.url`);
          requireLocalizedText(project.link.label, `${projectLabel}.link.label`);
        }
      } else {
        requireText(project.metric?.value, `${projectLabel}.metric.value`);
        requireLocalizedText(project.metric?.label, `${projectLabel}.metric.label`);
      }
    });
  });

  requireArray(data.speaking?.events, "speaking.events");
  data.speaking.events.forEach((event, index) => {
    const label = `speaking.events[${index}]`;
    if (event.url) requireUrl(event.url, `${label}.url`);
    requireText(event.image?.src, `${label}.image.src`);
    requireText(event.image?.alt, `${label}.image.alt`);
    requireText(event.meta, `${label}.meta`);
    requireLocalizedText(event.role, `${label}.role`);
    requireLocalizedText(event.title, `${label}.title`);
    requireLocalizedText(event.label, `${label}.label`);
  });

  requireArray(data.speaking?.writing, "speaking.writing");
  data.speaking.writing.forEach((item, index) => {
    const label = `speaking.writing[${index}]`;
    requireText(item.type, `${label}.type`);
    requireUrl(item.url, `${label}.url`);
    requireLocalizedText(item.title, `${label}.title`);
    requireLocalizedText(item.meta, `${label}.meta`);
  });

  requireArray(data.background?.education, "background.education");
  requireArray(data.background?.recognition, "background.recognition");
  requireArray(data.background?.publications, "background.publications");
  requireArray(data.background?.skills, "background.skills");
  data.background.education.forEach((item, index) => {
    requireText(item.years, `background.education[${index}].years`);
    requireLocalizedText(item.school, `background.education[${index}].school`);
    requireLocalizedText(item.degree, `background.education[${index}].degree`);
  });
  data.background.recognition.forEach((item, index) => {
    requireText(item.year, `background.recognition[${index}].year`);
    requireLocalizedText(item.name, `background.recognition[${index}].name`);
  });
  data.background.publications.forEach((item, index) => {
    requireUrl(item.url, `background.publications[${index}].url`);
    requireLocalizedText(item.role, `background.publications[${index}].role`);
    requireText(item.title, `background.publications[${index}].title`);
    requireText(item.venue, `background.publications[${index}].venue`);
  });
  data.background.skills.forEach((skill, index) => requireText(skill, `background.skills[${index}]`));
  requireLocalizedText(data.contact?.title, "contact.title");
  requireLocalizedText(data.contact?.description, "contact.description");

  const assets = new Set();
  const visit = (value, key = "") => {
    if (Array.isArray(value)) return value.forEach((item) => visit(item, key));
    if (value && typeof value === "object") return Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
    if (typeof value === "string" && (key === "logo" || key === "src") && value.startsWith("assets/")) assets.add(value);
  };
  visit(data);

  for (const relativePath of assets) {
    const absolutePath = path.resolve(rootDirectory, relativePath);
    requireValue(absolutePath.startsWith(`${path.join(rootDirectory, "assets")}${path.sep}`), `Asset path escapes assets/: ${relativePath}`);
    try {
      const metadata = await stat(absolutePath);
      requireValue(metadata.isFile(), `Asset is not a file: ${relativePath}`);
    } catch {
      throw new Error(`Missing asset referenced by resume.json: ${relativePath}`);
    }
  }
}

function fillTemplate(template, data) {
  const replacements = {
    TITLE_EN_ATTR: escapeHtml(data.site.title.en),
    TITLE_ZH_ATTR: escapeHtml(data.site.title.zh),
    DESCRIPTION_ATTR: escapeHtml(data.site.description),
    SITE_URL_ATTR: escapeHtml(data.site.url),
    OG_DESCRIPTION_ATTR: escapeHtml(data.site.ogDescription),
    TITLE_EN: escapeHtml(data.site.title.en),
    BODY: renderBody(data),
  };

  const output = template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!(key in replacements)) throw new Error(`Unknown template token: ${match}`);
    return replacements[key];
  });
  requireValue(!/\{\{[A-Z_]+\}\}/.test(output), "Unresolved template token found");
  return output;
}

async function build() {
  const [rawData, template] = await Promise.all([
    readFile(dataPath, "utf8"),
    readFile(templatePath, "utf8"),
  ]);
  const data = JSON.parse(rawData);
  await validateData(data);
  const html = fillTemplate(template, data);

  requireValue(path.basename(outputDirectory) === "dist" && path.dirname(outputDirectory) === rootDirectory, "Refusing to clean an unexpected output path");
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDirectory, "index.html"), html, "utf8"),
    copyFile(path.join(rootDirectory, "styles.css"), path.join(outputDirectory, "styles.css")),
    copyFile(path.join(rootDirectory, "script.js"), path.join(outputDirectory, "script.js")),
    copyFile(path.join(rootDirectory, ".nojekyll"), path.join(outputDirectory, ".nojekyll")),
    cp(path.join(rootDirectory, "assets"), path.join(outputDirectory, "assets"), { recursive: true }),
  ]);

  console.log(`Built ${path.relative(rootDirectory, path.join(outputDirectory, "index.html"))} from ${path.relative(rootDirectory, dataPath)}`);
}

await build();
