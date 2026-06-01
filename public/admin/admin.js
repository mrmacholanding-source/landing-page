import { BUCKET_NAME, deleteImageByUrl, supabase, uploadImage } from "/lib/supabase-browser.js";

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

const previewKicker = document.getElementById("preview_kicker");
const previewTitle = document.getElementById("preview_title");
const previewText = document.getElementById("preview_text");
const heroPreview = document.getElementById("hero_preview");
const leftRailPreview = document.getElementById("left_rail_preview");
const rightRailPreview = document.getElementById("right_rail_preview");
const postMainPreview = document.getElementById("post_main_preview");
const postExtra1Preview = document.getElementById("post_extra_1_preview");
const postExtra2Preview = document.getElementById("post_extra_2_preview");

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

function setPreviewImage(node, url) {
  node.style.backgroundImage = url ? `url("${url}")` : "none";
  node.classList.toggle("is-empty", !url);
}

function percentValue(id, fallback = 50) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) ? value : fallback;
}

function updateColorValue(id) {
  document.getElementById(`${id}_value`).textContent = document.getElementById(id).value;
}

function updatePreviewPosition(node, x, y) {
  node.style.backgroundPosition = `${x}% ${y}%`;
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

function refreshStylePreview() {
  const base = document.getElementById("base_color").value;
  const accent = document.getElementById("accent_color").value;
  const secondary = document.getElementById("secondary_color").value;
  const ink = document.getElementById("ink_color").value;

  document.documentElement.style.setProperty("--bg", base);
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--secondary", secondary);
  document.documentElement.style.setProperty("--ink", ink);

  previewKicker.textContent = document.getElementById("hero_kicker").value || "Archivo editorial";
  previewTitle.textContent = document.getElementById("hero_title").value || "Biblioteca Viva de Historia";
  previewText.textContent = document.getElementById("hero_text").value || "Archivo visual y editorial para historia, libros, revistas y fuentes.";
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
  document.getElementById("left_rail_position").value = defaults.left_rail_position ?? 50;
  document.getElementById("right_rail_position").value = defaults.right_rail_position ?? 50;
  document.getElementById("hero_position_x").value = defaults.hero_position_x ?? 50;
  document.getElementById("hero_position_y").value = defaults.hero_position_y ?? 50;

  settingsForm.dataset.backgroundImage = defaults.background_image || "";
  settingsForm.dataset.heroImage = defaults.hero_image || "";
  settingsForm.dataset.leftRailImage = defaults.left_rail_image || "";
  settingsForm.dataset.rightRailImage = defaults.right_rail_image || "";

  setPreviewImage(heroPreview, defaults.hero_image || "");
  setPreviewImage(leftRailPreview, defaults.left_rail_image || "");
  setPreviewImage(rightRailPreview, defaults.right_rail_image || "");
  updatePreviewPosition(heroPreview, defaults.hero_position_x ?? 50, defaults.hero_position_y ?? 50);
  updatePreviewPosition(leftRailPreview, 50, defaults.left_rail_position ?? 50);
  updatePreviewPosition(rightRailPreview, 50, defaults.right_rail_position ?? 50);

  ["base_color", "accent_color", "secondary_color", "ink_color"].forEach(updateColorValue);
  refreshStylePreview();
}

function resetSectionForm() {
  sectionForm.reset();
  document.getElementById("section_id").value = "";
  document.getElementById("section_order").value = "0";
}

function resetPostForm() {
  postForm.reset();
  document.getElementById("post_id").value = "";
  document.getElementById("post_position_x").value = 50;
  document.getElementById("post_position_y").value = 50;
  postForm.dataset.mainImage = "";
  postForm.dataset.extraImage1 = "";
  postForm.dataset.extraImage2 = "";
  setPreviewImage(postMainPreview, "");
  setPreviewImage(postExtra1Preview, "");
  setPreviewImage(postExtra2Preview, "");
  updatePreviewPosition(postMainPreview, 50, 50);
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
    fragment.querySelector(".entity-kicker").textContent = `${post.display_date} - ${section?.name || "Sin seccion"}`;
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
      document.getElementById("post_content").value = post.content;
      document.getElementById("post_featured").checked = Boolean(post.featured);
      document.getElementById("post_position_x").value = post.image_position_x ?? 50;
      document.getElementById("post_position_y").value = post.image_position_y ?? 50;

      postForm.dataset.mainImage = post.image_url || "";
      postForm.dataset.extraImage1 = post.image_url_2 || "";
      postForm.dataset.extraImage2 = post.image_url_3 || "";
      setPreviewImage(postMainPreview, post.image_url || "");
      setPreviewImage(postExtra1Preview, post.image_url_2 || "");
      setPreviewImage(postExtra2Preview, post.image_url_3 || "");
      updatePreviewPosition(postMainPreview, post.image_position_x ?? 50, post.image_position_y ?? 50);

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

async function maybeUpload(fileInputId, folder, statusNode, previewNode) {
  const file = document.getElementById(fileInputId).files?.[0];
  if (!file) {
    return null;
  }

  setStatus(statusNode, "Subiendo imagen...");
  const url = await uploadImage(file, folder);
  setPreviewImage(previewNode, url);
  return url;
}

function bindLocalPreview(fileInputId, previewNode) {
  document.getElementById(fileInputId).addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreviewImage(previewNode, localUrl);
  });
}

async function removeStoredImage(url, statusNode) {
  if (!url) {
    return;
  }

  try {
    await deleteImageByUrl(url);
    setStatus(statusNode, "Imagen eliminada.");
  } catch (error) {
    setStatus(statusNode, `No se pudo eliminar la imagen del storage: ${error.message}`);
  }
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

["site_title", "hero_kicker", "hero_title", "hero_text", "base_color", "accent_color", "secondary_color", "ink_color"]
  .forEach((id) => document.getElementById(id).addEventListener("input", () => {
    if (id.endsWith("_color")) {
      updateColorValue(id);
    }
    refreshStylePreview();
  }));

document.getElementById("hero_position_x").addEventListener("input", () => {
  updatePreviewPosition(heroPreview, percentValue("hero_position_x"), percentValue("hero_position_y"));
});
document.getElementById("hero_position_y").addEventListener("input", () => {
  updatePreviewPosition(heroPreview, percentValue("hero_position_x"), percentValue("hero_position_y"));
});
document.getElementById("left_rail_position").addEventListener("input", () => {
  updatePreviewPosition(leftRailPreview, 50, percentValue("left_rail_position"));
});
document.getElementById("right_rail_position").addEventListener("input", () => {
  updatePreviewPosition(rightRailPreview, 50, percentValue("right_rail_position"));
});
document.getElementById("post_position_x").addEventListener("input", () => {
  updatePreviewPosition(postMainPreview, percentValue("post_position_x"), percentValue("post_position_y"));
});
document.getElementById("post_position_y").addEventListener("input", () => {
  updatePreviewPosition(postMainPreview, percentValue("post_position_x"), percentValue("post_position_y"));
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const backgroundImage = await maybeUpload("background_upload", "backgrounds", settingsStatus, heroPreview)
      || settingsForm.dataset.backgroundImage || "";
    const heroImage = await maybeUpload("hero_upload", "hero", settingsStatus, heroPreview)
      || settingsForm.dataset.heroImage || "";
    const leftRailImageUrl = await maybeUpload("left_rail_upload", "rails", settingsStatus, leftRailPreview)
      || settingsForm.dataset.leftRailImage || "";
    const rightRailImageUrl = await maybeUpload("right_rail_upload", "rails", settingsStatus, rightRailPreview)
      || settingsForm.dataset.rightRailImage || "";

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
      hero_image: heroImage,
      hero_position_x: percentValue("hero_position_x"),
      hero_position_y: percentValue("hero_position_y"),
      left_rail_image: leftRailImageUrl,
      right_rail_image: rightRailImageUrl,
      left_rail_position: percentValue("left_rail_position"),
      right_rail_position: percentValue("right_rail_position")
    };

    const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "id" });
    if (error) {
      throw error;
    }

    settingsForm.dataset.backgroundImage = backgroundImage;
    settingsForm.dataset.heroImage = heroImage;
    settingsForm.dataset.leftRailImage = leftRailImageUrl;
    settingsForm.dataset.rightRailImage = rightRailImageUrl;
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
    const imageUrl = await maybeUpload("post_upload", "posts", postStatus, postMainPreview)
      || postForm.dataset.mainImage || "";
    const imageUrl2 = await maybeUpload("post_upload_2", "posts", postStatus, postExtra1Preview)
      || postForm.dataset.extraImage1 || "";
    const imageUrl3 = await maybeUpload("post_upload_3", "posts", postStatus, postExtra2Preview)
      || postForm.dataset.extraImage2 || "";

    const payload = {
      id: document.getElementById("post_id").value || undefined,
      title: document.getElementById("post_title").value.trim(),
      summary: document.getElementById("post_summary").value.trim(),
      display_date: document.getElementById("post_date").value.trim(),
      source: document.getElementById("post_source").value.trim(),
      section_id: document.getElementById("post_section_id").value,
      era: document.getElementById("post_era").value.trim(),
      image_url: imageUrl,
      image_url_2: imageUrl2,
      image_url_3: imageUrl3,
      gallery_urls: [imageUrl2, imageUrl3].filter(Boolean).join(","),
      image_position_x: percentValue("post_position_x"),
      image_position_y: percentValue("post_position_y"),
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

document.getElementById("remove_background_image").addEventListener("click", async () => {
  await removeStoredImage(settingsForm.dataset.backgroundImage, settingsStatus);
  settingsForm.dataset.backgroundImage = "";
  setStatus(settingsStatus, "Fondo general quitado. Guarda apariencia para reflejar el cambio.");
});

document.getElementById("remove_hero_image").addEventListener("click", async () => {
  await removeStoredImage(settingsForm.dataset.heroImage, settingsStatus);
  settingsForm.dataset.heroImage = "";
  setPreviewImage(heroPreview, "");
  setStatus(settingsStatus, "Portada quitada. Guarda apariencia para reflejar el cambio.");
});

document.getElementById("remove_left_rail").addEventListener("click", async () => {
  await removeStoredImage(settingsForm.dataset.leftRailImage, settingsStatus);
  settingsForm.dataset.leftRailImage = "";
  setPreviewImage(leftRailPreview, "");
  setStatus(settingsStatus, "Imagen izquierda quitada. Guarda apariencia para reflejar el cambio.");
});

document.getElementById("remove_right_rail").addEventListener("click", async () => {
  await removeStoredImage(settingsForm.dataset.rightRailImage, settingsStatus);
  settingsForm.dataset.rightRailImage = "";
  setPreviewImage(rightRailPreview, "");
  setStatus(settingsStatus, "Imagen derecha quitada. Guarda apariencia para reflejar el cambio.");
});

document.getElementById("remove_post_image").addEventListener("click", async () => {
  await removeStoredImage(postForm.dataset.mainImage, postStatus);
  postForm.dataset.mainImage = "";
  setPreviewImage(postMainPreview, "");
  setStatus(postStatus, "Imagen principal quitada. Guarda el articulo para reflejar el cambio.");
});

document.getElementById("remove_post_image_2").addEventListener("click", async () => {
  await removeStoredImage(postForm.dataset.extraImage1, postStatus);
  postForm.dataset.extraImage1 = "";
  setPreviewImage(postExtra1Preview, "");
  setStatus(postStatus, "Imagen de apoyo 1 quitada. Guarda el articulo para reflejar el cambio.");
});

document.getElementById("remove_post_image_3").addEventListener("click", async () => {
  await removeStoredImage(postForm.dataset.extraImage2, postStatus);
  postForm.dataset.extraImage2 = "";
  setPreviewImage(postExtra2Preview, "");
  setStatus(postStatus, "Imagen de apoyo 2 quitada. Guarda el articulo para reflejar el cambio.");
});

bindLocalPreview("background_upload", heroPreview);
bindLocalPreview("hero_upload", heroPreview);
bindLocalPreview("left_rail_upload", leftRailPreview);
bindLocalPreview("right_rail_upload", rightRailPreview);
bindLocalPreview("post_upload", postMainPreview);
bindLocalPreview("post_upload_2", postExtra1Preview);
bindLocalPreview("post_upload_3", postExtra2Preview);

requireSession();
