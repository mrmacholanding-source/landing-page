import { supabase } from "/lib/supabase-browser.js";

const heroContainer = document.getElementById("hero");
const heroTemplate = document.getElementById("hero-template");
const navContainer = document.getElementById("main-nav");
const timelineContainer = document.getElementById("timeline-menu");
const postsGrid = document.getElementById("posts-grid");
const postTemplate = document.getElementById("post-template");
const sectionFilter = document.getElementById("section-filter");
const postsTitle = document.getElementById("posts-title");

let state = {
  settings: null,
  sections: [],
  posts: [],
  activeSection: "all"
};

function applyTheme(settings) {
  if (!settings) {
    return;
  }

  const root = document.documentElement;
  root.style.setProperty("--bg", settings.base_color || "#f5eddc");
  root.style.setProperty("--accent", settings.accent_color || "#caa35f");
  root.style.setProperty("--secondary", settings.secondary_color || "#9eb8b2");
  root.style.setProperty("--ink", settings.ink_color || "#33241b");
  root.style.setProperty("--site-bg-image", `url("${settings.background_image || "/history-hero.svg"}")`);
  root.style.setProperty("--hero-image", `url("${settings.hero_image || settings.background_image || "/history-hero.svg"}")`);
  document.title = settings.site_title || "Archivo de Historia | Biblioteca Viva";
}

function renderHero(settings) {
  const fragment = heroTemplate.content.cloneNode(true);
  fragment.querySelector(".hero-kicker").textContent = settings.hero_kicker || "Archivo editorial";
  fragment.querySelector(".hero-title").textContent = settings.hero_title || settings.site_title || "Biblioteca Viva";
  fragment.querySelector(".hero-text").textContent = settings.hero_text || "";

  const heroImage = fragment.querySelector(".hero-image");
  heroImage.src = settings.hero_image || settings.background_image || "/history-hero.svg";
  heroImage.alt = settings.hero_title || "Portada historica";

  heroContainer.innerHTML = "";
  heroContainer.appendChild(fragment);
}

function renderSections(sections) {
  navContainer.innerHTML = "";
  timelineContainer.innerHTML = "";
  sectionFilter.innerHTML = '<option value="all">Todas las secciones</option>';

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = `timeline-pill ${state.activeSection === "all" ? "is-active" : ""}`;
  allButton.textContent = "Todo el archivo";
  allButton.addEventListener("click", () => setActiveSection("all"));
  timelineContainer.appendChild(allButton);

  sections.forEach((section) => {
    const navLink = document.createElement("button");
    navLink.type = "button";
    navLink.className = `nav-link ${state.activeSection === section.id ? "is-active" : ""}`;
    navLink.textContent = section.name;
    navLink.addEventListener("click", () => setActiveSection(section.id));
    navContainer.appendChild(navLink);

    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `timeline-pill ${state.activeSection === section.id ? "is-active" : ""}`;
    pill.textContent = `${section.name} · ${section.description}`;
    pill.addEventListener("click", () => setActiveSection(section.id));
    timelineContainer.appendChild(pill);

    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = section.name;
    sectionFilter.appendChild(option);
  });

  sectionFilter.value = state.activeSection;
}

function renderPosts() {
  const filtered = state.activeSection === "all"
    ? state.posts
    : state.posts.filter((post) => post.section_id === state.activeSection);

  const currentSection = state.sections.find((section) => section.id === state.activeSection);
  postsTitle.textContent = currentSection ? currentSection.name : "Archivo principal";

  postsGrid.innerHTML = "";

  if (!filtered.length) {
    postsGrid.innerHTML = '<div class="empty-state">Todavia no hay articulos en esta seccion.</div>';
    return;
  }

  filtered.forEach((post) => {
    const fragment = postTemplate.content.cloneNode(true);
    const image = fragment.querySelector(".post-media");
    image.src = post.image_url || state.settings?.background_image || "/history-hero.svg";
    image.alt = post.title;
    fragment.querySelector(".post-era").textContent = post.era || "Archivo";
    fragment.querySelector(".post-date").textContent = post.display_date;
    fragment.querySelector(".post-title").textContent = post.title;
    fragment.querySelector(".post-summary").textContent = post.summary;
    fragment.querySelector(".post-content").textContent = post.content;
    fragment.querySelector(".post-source").textContent = post.source ? `Fuente: ${post.source}` : "Fuente no especificada";
    postsGrid.appendChild(fragment);
  });
}

function setActiveSection(sectionId) {
  state.activeSection = sectionId;
  renderSections(state.sections);
  renderPosts();
}

async function loadSite() {
  const [{ data: settings }, { data: sections }, { data: posts }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("sections").select("*").order("sort_order", { ascending: true }),
    supabase.from("posts").select("*").order("featured", { ascending: false }).order("created_at", { ascending: false })
  ]);

  state.settings = settings || {
    site_title: "Biblioteca Viva de Historia",
    hero_title: "Biblioteca Viva de Historia",
    hero_text: "Archivo visual y editorial para historia, libros, revistas y fuentes.",
    hero_kicker: "Archivo editorial"
  };
  state.sections = sections || [];
  state.posts = posts || [];

  applyTheme(state.settings);
  renderHero(state.settings);
  renderSections(state.sections);
  renderPosts();
}

sectionFilter.addEventListener("change", (event) => {
  setActiveSection(event.target.value);
});

loadSite().catch(() => {
  postsGrid.innerHTML = '<div class="empty-state">Falta configurar Supabase o cargar datos iniciales.</div>';
});
