import { BUCKET_NAME, deleteImageByUrl, supabase, uploadImage } from "/lib/supabase-browser.js";

const loginScreen = document.getElementById("login-screen");
const adminScreen = document.getElementById("admin-screen");
const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const logoutButton = document.getElementById("logout-button");

const settingsForm = document.getElementById("settings-form");
const settingsStatus = document.getElementById("settings-status");
const saveSettingsButton = document.getElementById("save-settings-button");
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
const cropState = new Map();

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

function updateColorValue(id) {
  document.getElementById(`${id}_value`).textContent = document.getElementById(id).value;
}

function getCropState(node) {
  return cropState.get(node) || { x: 50, y: 50, zoom: 100 };
}

function normalizedCrop(node) {
  const state = getCropState(node);
  return {
    x: Math.round(state.x),
    y: Math.round(state.y),
    zoom: Math.round(state.zoom)
  };
}

function applyCrop(node, nextState) {
  const merged = { ...getCropState(node), ...nextState };
  cropState.set(node, merged);
  node.style.backgroundPosition = `${merged.x}% ${merged.y}%`;
  node.style.backgroundSize = `${merged.zoom}%`;
}

function bindCropPreview(node) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let baseX = 50;
  let baseY = 50;

  node.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    const state = getCropState(node);
    baseX = state.x;
    baseY = state.y;
    node.setPointerCapture(event.pointerId);
  });

  node.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }

    const dx = ((event.clientX - startX) / Math.max(node.clientWidth, 1)) * 100;
    const dy = ((event.clientY - startY) / Math.max(node.clientHeight, 1)) * 100;
    const x = Math.max(0, Math.min(100, baseX - dx));
    const y = Math.max(0, Math.min(100, baseY - dy));
    applyCrop(node, { x, y });
  });

  node.addEventListener("pointerup", (event) => {
    dragging = false;
    node.releasePointerCapture(event.pointerId);
  });

  node.addEventListener("wheel", (event) => {
    event.preventDefault();
    const state = getCropState(node);
    const zoom = Math.max(100, Math.min(220, state.zoom + (event.deltaY > 0 ? -8 : 8)));
    applyCrop(node, { zoom });
  }, { passive: false });
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
}

function refreshStylePreview() {
  applySettingsTheme({
    base_color: document.getElementById("base_color").value,
    accent_color: document.getElementById("accent_color").value,
    secondary_color: document.getElementById("secondary_color").value,
    ink_color: document.getElementById("ink_color").value
  });

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

  fillSettings(settings || {});
  renderSections();
  renderPosts();
}

function fillSettings(settings) {
  document.getElementById("site_title").value = settings.site_title || "";
  document.getElementById("hero_kicker").value = settings.hero_kicker || "";
  document.getElementById("hero_title").value = settings.hero_title || "";
  document.getElementById("hero_text").value = settings.hero_text || "";
  document.getElementById("intro_left_title").value = settings.intro_left_title || "";
  document.getElementById("intro_left_text").value = settings.intro_left_text || "";
  document.getElementById("intro_right_title").value = settings.intro_right_title || "";
  document.getElementById("intro_right_text").value = settings.intro_right_text || "";
  document.getElementById("base_color").value = settings.base_color || "#f5eddc";
  document.getElementById("accent_color").value = settings.accent_color || "#caa35f";
  document.getElementById("secondary_color").value = settings.secondary_color || "#9eb8b2";
  document.getElementById("ink_color").value = settings.ink_color || "#33241b";

  settingsForm.dataset.heroImage = settings.hero_image || "";
  settingsForm.dataset.leftRailImage = settings.left_rail_image || "";
  settingsForm.dataset.rightRailImage = settings.right_rail_image || "";

  setPreviewImage(heroPreview, settings.hero_image || "");
  setPreviewImage(leftRailPreview, settings.left_rail_image || "");
  setPreviewImage(rightRailPreview, settings.right_rail_image || "");
  applyCrop(heroPreview, {
    x: Number(settings.hero_position_x ?? 50),
    y: Number(settings.hero_position_y ?? 50),
    zoom: Number(settings.hero_zoom ?? 100)
  });
  applyCrop(leftRailPreview, {
    x: Number(settings.left_rail_position_x ?? 50),
    y: Number(settings.left_rail_position_y ?? 50),
    zoom: Number(settings.left_rail_zoom ?? 100)
  });
  applyCrop(rightRailPreview, {
    x: Number(settings.right_rail_position_x ?? 50),
    y: Number(settings.right_rail_position_y ?? 50),
    zoom: Number(settings.right_rail_zoom ?? 100)
  });

  ["base_color", "accent_color", "secondary_color", "ink_color"].forEach(updateColorValue);
  refreshStylePreview();
}

function resetSectionForm() {
  sectionForm.reset();
  document.getElementById("section_id").value = "";
  document.getElementById("section_order").value = "1";
}

function resetPostForm() {
  postForm.reset();
  document.getElementById("post_id").value = "";
  postForm.dataset.mainImage = "";
  postForm.dataset.extraImage1 = "";
  postForm.dataset.extraImage2 = "";
  setPreviewImage(postMainPreview, "");
  setPreviewImage(postExtra1Preview, "");
  setPreviewImage(postExtra2Preview, "");
  applyCrop(postMainPreview, { x: 50, y: 50, zoom: 100 });
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
    fragment.querySelector(".entity-kicker").textContent = `Aparece en posicion ${section.sort_order}`;
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

      postForm.dataset.mainImage = post.image_url || "";
      postForm.dataset.extraImage1 = post.image_url_2 || "";
      postForm.dataset.extraImage2 = post.image_url_3 || "";
      setPreviewImage(postMainPreview, post.image_url || "");
      setPreviewImage(postExtra1Preview, post.image_url_2 || "");
      setPreviewImage(postExtra2Preview, post.image_url_3 || "");
      applyCrop(postMainPreview, {
        x: Number(post.image_position_x ?? 50),
        y: Number(post.image_position_y ?? 50),
        zoom: Number(post.image_zoom ?? 100)
      });

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
    applyCrop(previewNode, { x: 50, y: 50, zoom: 100 });
  });
}

async function removeStoredImage(url, statusNode) {
  if (!url) {
    return;
  }

  try {
    await deleteImageByUrl(url);
    setStatus(statusNode, "Imagen eliminada del storage.");
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

[
  "site_title",
  "hero_kicker",
  "hero_title",
  "hero_text",
  "intro_left_title",
  "intro_left_text",
  "intro_right_title",
  "intro_right_text",
  "base_color",
  "accent_color",
  "secondary_color",
  "ink_color"
].forEach((id) => document.getElementById(id).addEventListener("input", () => {
  if (id.endsWith("_color")) {
    updateColorValue(id);
  }
  refreshStylePreview();
}));

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveSettingsButton.disabled = true;
  saveSettingsButton.textContent = "Guardando apariencia...";

  try {
    const heroImage = await maybeUpload("hero_upload", "hero", settingsStatus, heroPreview)
      || settingsForm.dataset.heroImage || "";
    const leftRailImageUrl = await maybeUpload("left_rail_upload", "rails", settingsStatus, leftRailPreview)
      || settingsForm.dataset.leftRailImage || "";
    const rightRailImageUrl = await maybeUpload("right_rail_upload", "rails", settingsStatus, rightRailPreview)
      || settingsForm.dataset.rightRailImage || "";

    const heroCrop = normalizedCrop(heroPreview);
    const leftCrop = normalizedCrop(leftRailPreview);
    const rightCrop = normalizedCrop(rightRailPreview);

    const payload = {
      id: 1,
      site_title: document.getElementById("site_title").value.trim(),
      hero_kicker: document.getElementById("hero_kicker").value.trim(),
      hero_title: document.getElementById("hero_title").value.trim(),
      hero_text: document.getElementById("hero_text").value.trim(),
      intro_left_title: document.getElementById("intro_left_title").value.trim(),
      intro_left_text: document.getElementById("intro_left_text").value.trim(),
      intro_right_title: document.getElementById("intro_right_title").value.trim(),
      intro_right_text: document.getElementById("intro_right_text").value.trim(),
      base_color: document.getElementById("base_color").value,
      accent_color: document.getElementById("accent_color").value,
      secondary_color: document.getElementById("secondary_color").value,
      ink_color: document.getElementById("ink_color").value,
      hero_image: heroImage,
      hero_position_x: heroCrop.x,
      hero_position_y: heroCrop.y,
      hero_zoom: heroCrop.zoom,
      left_rail_image: leftRailImageUrl,
      left_rail_position_x: leftCrop.x,
      left_rail_position_y: leftCrop.y,
      left_rail_zoom: leftCrop.zoom,
      right_rail_image: rightRailImageUrl,
      right_rail_position_x: rightCrop.x,
      right_rail_position_y: rightCrop.y,
      right_rail_zoom: rightCrop.zoom
    };

    const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "id" });
    if (error) {
      throw error;
    }

    settingsForm.dataset.heroImage = heroImage;
    settingsForm.dataset.leftRailImage = leftRailImageUrl;
    settingsForm.dataset.rightRailImage = rightRailImageUrl;
    applySettingsTheme(payload);
    setStatus(settingsStatus, `Apariencia guardada. Bucket: ${BUCKET_NAME}`);
    saveSettingsButton.textContent = "Listo";
  } catch (error) {
    setStatus(settingsStatus, error.message);
    saveSettingsButton.textContent = "Guardar apariencia";
  } finally {
    saveSettingsButton.disabled = false;
    if (saveSettingsButton.textContent === "Listo") {
      window.setTimeout(() => {
        saveSettingsButton.textContent = "Guardar apariencia";
      }, 1800);
    }
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
    sort_order: Number(document.getElementById("section_order").value || 1)
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
    const mainCrop = normalizedCrop(postMainPreview);

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
      image_position_x: mainCrop.x,
      image_position_y: mainCrop.y,
      image_zoom: mainCrop.zoom,
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

document.getElementById("remove_hero_image").addEventListener("click", async () => {
  await removeStoredImage(settingsForm.dataset.heroImage, settingsStatus);
  settingsForm.dataset.heroImage = "";
  setPreviewImage(heroPreview, "");
  applyCrop(heroPreview, { x: 50, y: 50, zoom: 100 });
  setStatus(settingsStatus, "Portada quitada. Guarda apariencia para reflejar el cambio.");
});

document.getElementById("remove_left_rail").addEventListener("click", async () => {
  await removeStoredImage(settingsForm.dataset.leftRailImage, settingsStatus);
  settingsForm.dataset.leftRailImage = "";
  setPreviewImage(leftRailPreview, "");
  applyCrop(leftRailPreview, { x: 50, y: 50, zoom: 100 });
  setStatus(settingsStatus, "Imagen izquierda quitada. Guarda apariencia para reflejar el cambio.");
});

document.getElementById("remove_right_rail").addEventListener("click", async () => {
  await removeStoredImage(settingsForm.dataset.rightRailImage, settingsStatus);
  settingsForm.dataset.rightRailImage = "";
  setPreviewImage(rightRailPreview, "");
  applyCrop(rightRailPreview, { x: 50, y: 50, zoom: 100 });
  setStatus(settingsStatus, "Imagen derecha quitada. Guarda apariencia para reflejar el cambio.");
});

document.getElementById("remove_post_image").addEventListener("click", async () => {
  await removeStoredImage(postForm.dataset.mainImage, postStatus);
  postForm.dataset.mainImage = "";
  setPreviewImage(postMainPreview, "");
  applyCrop(postMainPreview, { x: 50, y: 50, zoom: 100 });
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

bindLocalPreview("hero_upload", heroPreview);
bindLocalPreview("left_rail_upload", leftRailPreview);
bindLocalPreview("right_rail_upload", rightRailPreview);
bindLocalPreview("post_upload", postMainPreview);
bindLocalPreview("post_upload_2", postExtra1Preview);
bindLocalPreview("post_upload_3", postExtra2Preview);

bindCropPreview(heroPreview);
bindCropPreview(leftRailPreview);
bindCropPreview(rightRailPreview);
bindCropPreview(postMainPreview);

requireSession();
