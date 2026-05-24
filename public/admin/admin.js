import { BUCKET_NAME, supabase, uploadImage } from "/lib/supabase-browser.js";

const loginScreen = document.getElementById("login-screen");
const adminScreen = document.getElementById("admin-screen");
const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const logoutButton = document.getElementById("logout-button");

const settingsForm = document.getElementById("settings-form");
const settingsStatus = document.getElementById("settings-status");

const sectionForm = document.getElementById("section-form");
const sectionStatus = document.getElementById("section-status");
const sectionList = document.getElementById("sections-list");
const clearSectionButton = document.getElementById("clear-section");

const postForm = document.getElementById("post-form");
const postStatus = document.getElementById("post-status");
const postsList = document.getElementById("posts-list");
const clearPostButton = document.getElementById("clear-post");
const entityTemplate = document.getElementById("entity-item-template");
const postSectionSelect = document.getElementById("post_section_id");

let sections = [];
let posts = [];

function setStatus(node, message) {
  node.textContent = message;
}

function showAdmin() {
  loginScreen.classList.add("hidden");
  adminScreen.classList.remove("hidden");
}

function showLogin() {
  adminScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}

function applySettingsTheme(settings) {
  if (!settings) {
    return;
  }

  const root = document.documentElement;
  root.style.setProperty("--bg", settings.base_color || "#f5eddc");
  root.style.setProperty("--accent", settings.accent_color || "#caa35f");
  root.style.setProperty("--secondary", settings.secondary_color || "#9eb8b2");
  root.style.setProperty("--ink", settings.ink_color || "#33241b");
  root.style.setProperty("--site-bg-image", `url("${settings.background_image || "/history-hero.svg"}")`);
}

async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    showAdmin();
    await bootstrapAdmin();
    return;
  }
  showLogin();
}

async function bootstrapAdmin() {
  const [{ data: settings }, { data: sectionRows }, { data: postRows }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("sections").select("*").order("sort_order", { ascending: true }),
    supabase.from("posts").select("*").order("featured", { ascending: false }).order("created_at", { ascending: false })
  ]);

  sections = sectionRows || [];
  posts = postRows || [];

  fillSettings(settings);
  applySettingsTheme(settings);
  renderSections();
  renderPosts();
}

function fillSettings(settings) {
  const defaults = settings || {};
  document.getElementById("site_title").value = defaults.site_title || "";
  document.getElementById("hero_kicker").value = defaults.hero_kicker || "";
  document.getElementById("hero_title").value = defaults.hero_title || "";
  document.getElementById("hero_text").value = defaults.hero_text || "";
  document.getElementById("base_color").value = defaults.base_color || "#f5eddc";
  document.getElementById("accent_color").value = defaults.accent_color || "#caa35f";
  document.getElementById("secondary_color").value = defaults.secondary_color || "#9eb8b2";
  document.getElementById("ink_color").value = defaults.ink_color || "#33241b";
  document.getElementById("background_image").value = defaults.background_image || "";
  document.getElementById("hero_image").value = defaults.hero_image || "";
}

function resetSectionForm() {
  sectionForm.reset();
  document.getElementById("section_id").value = "";
  document.getElementById("section_order").value = "0";
}

function resetPostForm() {
  postForm.reset();
  document.getElementById("post_id").value = "";
}

function renderSections() {
  sectionList.innerHTML = "";
  postSectionSelect.innerHTML = "";

  if (!sections.length) {
    sectionList.innerHTML = '<div class="empty-state">Crea primero una seccion para organizar el menu inicial.</div>';
  }

  sections.forEach((section) => {
    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = `${section.name} (${section.slug})`;
    postSectionSelect.appendChild(option);

    const fragment = entityTemplate.content.cloneNode(true);
    fragment.querySelector(".entity-kicker").textContent = `Orden ${section.sort_order}`;
    fragment.querySelector(".entity-title").textContent = section.name;
    fragment.querySelector(".entity-summary").textContent = section.description;

    fragment.querySelector(".entity-edit").addEventListener("click", () => {
      document.getElementById("section_id").value = section.id;
      document.getElementById("section_name").value = section.name;
      document.getElementById("section_description").value = section.description;
      document.getElementById("section_slug").value = section.slug;
      document.getElementById("section_order").value = section.sort_order;
    });

    fragment.querySelector(".entity-delete").addEventListener("click", async () => {
      const { error } = await supabase.from("sections").delete().eq("id", section.id);
      if (error) {
        setStatus(sectionStatus, error.message);
        return;
      }
      await bootstrapAdmin();
      setStatus(sectionStatus, "Seccion eliminada.");
    });

    sectionList.appendChild(fragment);
  });
}

function renderPosts() {
  postsList.innerHTML = "";

  if (!posts.length) {
    postsList.innerHTML = '<div class="empty-state">Todavia no hay articulos cargados.</div>';
    return;
  }

  posts.forEach((post) => {
    const section = sections.find((item) => item.id === post.section_id);
    const fragment = entityTemplate.content.cloneNode(true);
    fragment.querySelector(".entity-kicker").textContent = `${post.display_date} · ${section?.name || "Sin seccion"}`;
    fragment.querySelector(".entity-title").textContent = post.title;
    fragment.querySelector(".entity-summary").textContent = post.summary;

    fragment.querySelector(".entity-edit").addEventListener("click", () => {
      document.getElementById("post_id").value = post.id;
      document.getElementById("post_title").value = post.title;
      document.getElementById("post_summary").value = post.summary;
      document.getElementById("post_date").value = post.display_date;
      document.getElementById("post_source").value = post.source || "";
      document.getElementById("post_section_id").value = post.section_id;
      document.getElementById("post_era").value = post.era || "";
      document.getElementById("post_image").value = post.image_url || "";
      document.getElementById("post_content").value = post.content;
      document.getElementById("post_featured").checked = Boolean(post.featured);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    fragment.querySelector(".entity-delete").addEventListener("click", async () => {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) {
        setStatus(postStatus, error.message);
        return;
      }
      await bootstrapAdmin();
      setStatus(postStatus, "Articulo eliminado.");
    });

    postsList.appendChild(fragment);
  });
}

async function maybeUpload(fileInputId, targetInputId, folder, statusNode) {
  const file = document.getElementById(fileInputId).files?.[0];
  if (!file) {
    return document.getElementById(targetInputId).value.trim();
  }

  setStatus(statusNode, "Subiendo imagen...");
  const url = await uploadImage(file, folder);
  document.getElementById(targetInputId).value = url;
  return url;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setStatus(loginStatus, error.message);
    return;
  }

  loginForm.reset();
  setStatus(loginStatus, "");
  showAdmin();
  await bootstrapAdmin();
});

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showLogin();
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const backgroundImage = await maybeUpload("background_upload", "background_image", "backgrounds", settingsStatus);
    const heroImage = await maybeUpload("hero_upload", "hero_image", "hero", settingsStatus);
    const payload = {
      id: 1,
      site_title: document.getElementById("site_title").value.trim(),
      hero_kicker: document.getElementById("hero_kicker").value.trim(),
      hero_title: document.getElementById("hero_title").value.trim(),
      hero_text: document.getElementById("hero_text").value.trim(),
      base_color: document.getElementById("base_color").value,
      accent_color: document.getElementById("accent_color").value,
      secondary_color: document.getElementById("secondary_color").value,
      ink_color: document.getElementById("ink_color").value,
      background_image: backgroundImage,
      hero_image: heroImage
    };

    const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "id" });
    if (error) {
      throw error;
    }

    applySettingsTheme(payload);
    setStatus(settingsStatus, `Apariencia guardada. Bucket: ${BUCKET_NAME}`);
  } catch (error) {
    setStatus(settingsStatus, error.message);
  }
});

sectionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    id: document.getElementById("section_id").value || undefined,
    name: document.getElementById("section_name").value.trim(),
    description: document.getElementById("section_description").value.trim(),
    slug: (document.getElementById("section_slug").value.trim() || document.getElementById("section_name").value.trim())
      .toLowerCase()
      .replace(/\s+/g, "-"),
    sort_order: Number(document.getElementById("section_order").value || 0)
  };

  const { error } = await supabase.from("sections").upsert(payload);
  if (error) {
    setStatus(sectionStatus, error.message);
    return;
  }

  resetSectionForm();
  await bootstrapAdmin();
  setStatus(sectionStatus, "Seccion guardada.");
});

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const imageUrl = await maybeUpload("post_upload", "post_image", "posts", postStatus);
    const payload = {
      id: document.getElementById("post_id").value || undefined,
      title: document.getElementById("post_title").value.trim(),
      summary: document.getElementById("post_summary").value.trim(),
      display_date: document.getElementById("post_date").value.trim(),
      source: document.getElementById("post_source").value.trim(),
      section_id: document.getElementById("post_section_id").value,
      era: document.getElementById("post_era").value.trim(),
      image_url: imageUrl,
      content: document.getElementById("post_content").value.trim(),
      featured: document.getElementById("post_featured").checked
    };

    const { error } = await supabase.from("posts").upsert(payload);
    if (error) {
      throw error;
    }

    resetPostForm();
    await bootstrapAdmin();
    setStatus(postStatus, "Articulo guardado.");
  } catch (error) {
    setStatus(postStatus, error.message);
  }
});

clearSectionButton.addEventListener("click", resetSectionForm);
clearPostButton.addEventListener("click", resetPostForm);

requireSession();
