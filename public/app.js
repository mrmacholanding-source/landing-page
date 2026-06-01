import { supabase } from "/lib/supabase-browser.js";

const heroContainer = document.getElementById("hero");
const navContainer = document.getElementById("main-nav");
const timelineContainer = document.getElementById("timeline-menu");
const postsGrid = document.getElementById("posts-grid");
const postTemplate = document.getElementById("post-template");
const sectionFilter = document.getElementById("section-filter");
const postsTitle = document.getElementById("posts-title");
const leftRailImage = document.getElementById("left-rail-image");
const rightRailImage = document.getElementById("right-rail-image");
const brandTitle = document.getElementById("brand-title");
const brandKicker = document.getElementById("brand-kicker");
const introLeftLabel = document.getElementById("intro-left-label");
const introLeftTitle = document.getElementById("intro-left-title");
const introLeftText = document.getElementById("intro-left-text");
const introRightLabel = document.getElementById("intro-right-label");
const introRightTitle = document.getElementById("intro-right-title");
const introRightText = document.getElementById("intro-right-text");

let state = {
  settings: null,
  sections: [],
  posts: [],
  activeSection: "all"
};

function safeSplitGallery(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNumber(value, fallback = 50) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function applyTheme(settings) {
  const fallbackLeftTitle = "Un blog para libros, revistas, fuentes y memoria historica";
  const fallbackLeftText = "Este espacio organiza articulos, referencias e imagenes en una experiencia visual clara, adaptable a telefono y computador, con un aire de manuscrito iluminado pero lenguaje contemporaneo.";
  const fallbackRightTitle = "Recorridos por edades, fechas y temas";
  const fallbackRightText = "El menu inicial puede ordenar el contenido por periodos historicos, civilizaciones, siglos o temas editoriales, todo editable desde el panel de administracion.";

  if (!settings) {
    return;
  }

  const root = document.documentElement;
  root.style.setProperty("--bg", settings.base_color || "#f5eddc");
  root.style.setProperty("--accent", settings.accent_color || "#caa35f");
  root.style.setProperty("--secondary", settings.secondary_color || "#9eb8b2");
  root.style.setProperty("--ink", settings.ink_color || "#33241b");
  root.style.setProperty("--site-bg-image", `url("${settings.background_image || "/history-hero.svg"}")`);
  root.style.setProperty("--hero-image", `url("${settings.hero_image || "/history-hero.svg"}")`);

  document.title = settings.site_title || "Archivo de Historia | Biblioteca Viva";
  brandTitle.textContent = settings.site_title || "Biblioteca Viva de Historia";
  brandKicker.textContent = settings.hero_kicker || "Archivo editorial";
  introLeftLabel.textContent = settings.intro_left_label || "Proposito";
  introLeftTitle.textContent = settings.intro_left_title || fallbackLeftTitle;
  introLeftText.textContent = settings.intro_left_text || fallbackLeftText;
  introRightLabel.textContent = settings.intro_right_label || "Exploracion";
  introRightTitle.textContent = settings.intro_right_title || fallbackRightTitle;
  introRightText.textContent = settings.intro_right_text || fallbackRightText;

  const leftRail = settings.left_rail_image || "/history-hero.svg";
  const rightRail = settings.right_rail_image || "/history-hero.svg";
  leftRailImage.src = leftRail;
  rightRailImage.src = rightRail;
  leftRailImage.style.objectPosition = `${toNumber(settings.left_rail_position_x)}% ${toNumber(settings.left_rail_position_y)}%`;
  rightRailImage.style.objectPosition = `${toNumber(settings.right_rail_position_x)}% ${toNumber(settings.right_rail_position_y)}%`;
  leftRailImage.style.transform = `scale(${toNumber(settings.left_rail_zoom, 100) / 100})`;
  rightRailImage.style.transform = `scale(${toNumber(settings.right_rail_zoom, 100) / 100})`;
}

function renderHero(settings) {
  const heroImage = settings.hero_image || "/history-hero.svg";
  const heroX = toNumber(settings.hero_position_x);
  const heroY = toNumber(settings.hero_position_y);
  const heroZoom = toNumber(settings.hero_zoom, 100) / 100;

  heroContainer.innerHTML = `
    <div class="hero-layout">
      <div class="hero-copy">
        <p class="eyebrow hero-kicker">${settings.hero_kicker || "Archivo editorial"}</p>
        <h1 class="hero-title">${settings.hero_title || settings.site_title || "Biblioteca Viva"}</h1>
        <p class="hero-text">${settings.hero_text || ""}</p>
      </div>
      <div class="hero-visual">
        <img
          class="hero-image"
          src="${heroImage}"
          alt="${settings.hero_title || "Portada historica"}"
          style="object-position:${heroX}% ${heroY}%; transform:scale(${heroZoom});"
        >
      </div>
    </div>
  `;
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
    pill.textContent = `${section.name} - ${section.description}`;
    pill.addEventListener("click", () => setActiveSection(section.id));
    timelineContainer.appendChild(pill);

    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = section.name;
    sectionFilter.appendChild(option);
  });

  sectionFilter.value = state.activeSection;
}

function createParagraphs(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderPostGallery(container, urls) {
  container.innerHTML = "";

  if (!urls.length) {
    container.classList.add("hidden");
    return;
  }

  urls.forEach((url, index) => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = `Imagen complementaria ${index + 1}`;
    img.className = "post-gallery-image";
    container.appendChild(img);
  });

  container.classList.remove("hidden");
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
    const collapsed = fragment.querySelector(".post-content-collapsed");
    const full = fragment.querySelector(".post-content-full");
    const toggle = fragment.querySelector(".post-toggle");
    const gallery = fragment.querySelector(".post-gallery");
    const galleryUrls = safeSplitGallery(post.gallery_urls);
    const contentText = String(post.content || "");
    const collapsedText = contentText.length > 180 ? `${contentText.slice(0, 180).trim()}...` : contentText;
    const imageX = toNumber(post.image_position_x);
    const imageY = toNumber(post.image_position_y);
    const imageZoom = toNumber(post.image_zoom, 100) / 100;

    image.src = post.image_url || "/history-hero.svg";
    image.alt = post.title;
    image.style.objectPosition = `${imageX}% ${imageY}%`;
    image.style.transform = `scale(${imageZoom})`;
    fragment.querySelector(".post-era").textContent = post.era || "Archivo";
    fragment.querySelector(".post-date").textContent = post.display_date;
    fragment.querySelector(".post-title").textContent = post.title;
    fragment.querySelector(".post-summary").textContent = post.summary;
    collapsed.textContent = collapsedText;
    full.innerHTML = createParagraphs(contentText);
    fragment.querySelector(".post-source").textContent = post.source ? `Fuente: ${post.source}` : "Fuente no especificada";

    renderPostGallery(gallery, galleryUrls);

    if (contentText.length <= 180 && galleryUrls.length === 0) {
      toggle.classList.add("hidden");
    } else {
      toggle.addEventListener("click", () => {
        const isOpen = !full.classList.contains("hidden");
        full.classList.toggle("hidden", isOpen);
        gallery.classList.toggle("hidden", isOpen || galleryUrls.length === 0);
        collapsed.classList.toggle("hidden", !isOpen);
        toggle.textContent = isOpen ? "Ver texto completo" : "Ocultar texto";
      });
    }

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

  state.settings = settings || {};
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
