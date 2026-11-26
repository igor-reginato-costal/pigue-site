const english = document.documentElement.lang === "en";
function copy(portuguese, englishText) {
  return english ? englishText : portuguese;
}
function preferenceLabel(value) {
  return english ? (window.piguePreferenceLabels?.[value] || value) : value;
}
for (const link of document.querySelectorAll(".language-switch")) {
  link.search = location.search;
  link.hash = location.hash;
  link.addEventListener("click", () => { link.hash = location.hash; });
}
const mast = document.querySelector(".mast");
if (mast && typeof ResizeObserver === "function") {
  new ResizeObserver(() => {
    document.documentElement.style.setProperty("--mast-space", mast.offsetHeight + "px");
  }).observe(mast);
}
const mastMenu = mast?.querySelector(".mast-menu");
mastMenu?.addEventListener("click", event => {
  if (event.target.closest("a")) mastMenu.open = false;
});

const cover = document.querySelector(".entry-cover");
if (cover) {
  const pointerMotion = matchMedia("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)");
  cover.addEventListener("pointermove", event => {
    if (!pointerMotion.matches || event.pointerType === "touch") return;
    const bounds = cover.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    cover.style.setProperty("--cover-x", (-40 * x).toFixed(1) + "px");
    cover.style.setProperty("--cover-y", (-32 * y).toFixed(1) + "px");
    cover.style.setProperty("--light-x", (42 * x).toFixed(1) + "%");
    cover.style.setProperty("--light-y", (36 * y).toFixed(1) + "%");
  });
  cover.addEventListener("pointerleave", () => {
    cover.style.removeProperty("--cover-x");
    cover.style.removeProperty("--cover-y");
    cover.style.removeProperty("--light-x");
    cover.style.removeProperty("--light-y");
  });
}

const sampleDialog = document.querySelector(".sample-dialog");
if (sampleDialog && typeof sampleDialog.showModal === "function") {
  const detail = sampleDialog.querySelector(".sample-window");
  const largeImage = detail.querySelector("img");
  const scales = sampleDialog.querySelectorAll("[data-scale]");
  function setScale(scale) {
    const centerX = (detail.scrollLeft + detail.clientWidth / 2) / (detail.scrollWidth || 1);
    const centerY = (detail.scrollTop + detail.clientHeight / 2) / (detail.scrollHeight || 1);
    detail.style.setProperty("--texture-zoom", scale);
    scales.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.scale === scale)));
    detail.scrollTo(centerX * detail.scrollWidth - detail.clientWidth / 2,
      centerY * detail.scrollHeight - detail.clientHeight / 2);
  }
  sampleDialog.closest("section").addEventListener("click", event => {
    const link = event.target.closest(".sample-open");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const caption = link.closest("figure").querySelector("figcaption");
    sampleDialog.querySelector("h3").textContent = caption.querySelector("h3").textContent;
    sampleDialog.querySelector(".sample-dialog-foot p").textContent = caption.querySelector("p").textContent;
    largeImage.alt = link.querySelector("img").alt;
    largeImage.src = link.href;
    sampleDialog.showModal();
    setScale("1");
    detail.scrollTo(0, 0);
  });
  scales.forEach(button => {
    button.addEventListener("click", () => setScale(button.dataset.scale));
  });
  sampleDialog.querySelector(".sample-close").addEventListener("click", () => sampleDialog.close());
}

const visitKey = "pigue.visita.v1";
const paintTones = { "Frias": 4, "Quentes": 10, "Neutras": 1, "Contrastes profundos": 7 };
function readVisit(fallback = null) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(visitKey));
    if (!saved || !["imovel","estilo","nome"].every(k => typeof saved[k] === "string") || !Array.isArray(saved.paletas)) return null;
    if (saved.imovel === "Apartamento") saved.imovel = "Apartamento na cidade";
    return saved;
  } catch { return fallback; }
}
let visit = readVisit();

const dialog = document.getElementById("visit-dialog");
if (dialog && typeof dialog.showModal === "function") {
  const panel = document.getElementById("residencias");
  const title = panel.querySelector("h2");
  const intro = panel.querySelector(".selection-intro");
  const grid = panel.querySelector(".featured-pair");
  const originals = Array.from(grid.children);
  const originalIntro = intro.textContent;
  const originalTitle = title.textContent;
  const cards = Array.from(panel.querySelectorAll("template.visit-card"));
  const references = Array.from(panel.querySelectorAll("template.visit-reference"));
  const arrival = document.querySelector(".arrival-scene");
  const arrivalTitle = arrival.querySelector("h1");
  const arrivalLink = arrival.querySelector("a");
  const caption = document.querySelector(".arrival-caption");
  const originalArrival = {image:arrival.querySelector("img"), title:arrivalTitle.textContent,
    href:arrivalLink.getAttribute("href"), linkText:arrivalLink.textContent, caption:caption.textContent};
  function showArrival(card) {
    const project = card?.content;
    const image = project ? project.querySelector(".project-image img").cloneNode(false) : originalArrival.image;
    image.sizes = "100vw";
    image.loading = "eager";
    arrival.querySelector("img").replaceWith(image);
    arrivalTitle.textContent = project ? project.querySelector("h3").textContent : originalArrival.title;
    const isReference = card?.classList.contains("visit-reference");
    arrivalLink.href = isReference ? "#residencias" : project?.querySelector(".project-image").href || originalArrival.href;
    arrivalLink.textContent = isReference ? copy("Explorar a referência", "Explore this design") : originalArrival.linkText;
    caption.textContent = project ? project.querySelector(".kicker").textContent : originalArrival.caption;
  }
  const preferences = document.getElementById("visit-form");
  const choices = Array.from(preferences.querySelectorAll("[data-choice]"));
  const steps = Array.from(preferences.querySelectorAll(".visit-step"));
  const back = preferences.querySelector("[data-back]");
  const addPalette = panel.querySelector("[data-add-palette]");
  const setName = panel.querySelector("[data-visit-name]");
  const skip = preferences.querySelector("[data-skip]");
  let firstStep = 0;
  let draft;
  let step = 0;
  function studiesFor(property, style = "Todos") {
    const projects = cards.filter(({dataset}) =>
      (property === "Todos" || [dataset.kind, dataset.setting, dataset.use].includes(property)) &&
      (style === "Todos" || dataset.style === style));
    if (projects.length) return projects;
    return references.filter(({dataset}) =>
      (property === "Todos" || dataset.kind === property) && (style === "Todos" || dataset.style === style));
  }
  function prepareStyles() {
    const strip = steps[1].querySelector(".visit-options");
    const options = [];
    for (const choice of choices.filter(item => item.dataset.choice === "estilo")) {
      const style = choice.value;
      const frame = choice.querySelector(".visit-picture");
      const examples = style === "Todos"
        ? options.slice(0, 3).map(option => option.querySelector("img"))
        : studiesFor(draft.imovel, style).slice(0, 1).map(card => card.content.querySelector(".project-image img"));
      if (!examples.length) continue;
      const images = examples.map(example => {
        const image = example.cloneNode(false);
        image.sizes = examples.length === 1 ? "(max-width: 650px) 44vw, 480px" : "(max-width: 650px) 15vw, 160px";
        image.alt = "";
        return image;
      });
      frame.replaceChildren(...images);
      options.push(choice);
    }
    strip.replaceChildren(...options);
  }
  function showStep(index) {
    step = index;
    if (index === 1) prepareStyles();
    steps.forEach((page, i) => { page.hidden = i !== index; });
    back.hidden = index === firstStep;
    skip.hidden = index !== 2 || firstStep !== 0;
    for (const choice of choices) {
      const key = choice.dataset.choice;
      const selected = key === "paleta"
        ? (draft.paletas?.includes(choice.value) || (draft.paletas?.length === 0 && choice.value === "Todas"))
        : draft[key] === choice.value;
      choice.setAttribute("aria-pressed", String(selected));
    }
    dialog.scrollTop = 0;
    if (dialog.open) steps[index].querySelector("legend").focus({preventScroll:true});
  }
  back.addEventListener("click", () => showStep(step - 1));
  const clear = panel.querySelector("[data-clear-visit]");
  const edit = panel.querySelector("[data-open-visit]");
  const links = document.getElementById("visit-palettes");
  const paletteSamples = new Map(choices
    .filter(choice => choice.dataset.choice === "paleta" && choice.value !== "Todas")
    .map(choice => [choice.value, choice.querySelector(".visit-tones")]));
  const palettePreview = document.getElementById("paleta-da-visita");
  function showPalette(palette) {
    const samples = paletteSamples.get(palette);
    palettePreview.hidden = !samples;
    if (samples) {
      palettePreview.querySelector("figcaption").textContent = copy("Sua paleta · ", "Your palette · ") + preferenceLabel(palette);
      palettePreview.querySelector("div").replaceChildren(samples.cloneNode(true));
    }
    document.getElementById("tom-" + (paintTones[palette] ?? 1)).checked = true;
  }
  function storeVisit(value) {
    visit = value;
    try {
      if (value) sessionStorage.setItem(visitKey, JSON.stringify(value));
      else sessionStorage.removeItem(visitKey);
    } catch { /* O estado da página continua disponível nesta visita. */ }
  }
  function showSelection() {
    links.replaceChildren();
    clear.hidden = !visit;
    addPalette.hidden = !visit;
    setName.hidden = !visit;
    setName.textContent = visit?.nome ? copy("Alterar meu nome", "Change my name") : copy("Adicionar meu nome", "Add my name");
    edit.textContent = visit ? copy("Rever minhas escolhas", "Review my choices") : copy("Escolher minhas preferências", "Choose my preferences");
    if (!visit) {
      showPalette(null);
      showArrival(null);
      title.textContent = originalTitle;
      intro.textContent = originalIntro;
      grid.replaceChildren(...originals);
      return;
    }
    title.textContent = copy("sua seleção de residências", "your selection of homes");
    if (visit.nome) {
      const name = document.createElement("span");
      name.className = "visitor-text";
      name.textContent = visit.nome;
      title.prepend(name, ", ");
    }
    const selection = studiesFor(visit.imovel, visit.estilo);
    showArrival(visit.imovel === "Todos" && visit.estilo === "Todos" ? null : selection[0]);
    const criteria = [visit.imovel,visit.estilo].filter(v => v !== "Todos").map(preferenceLabel).join(" · ");
    intro.textContent = selection.length ? (criteria || copy("Todos os imóveis e estilos.", "All homes and styles.")) :
      copy("Ainda não há um estudo para essa combinação. Você pode rever suas escolhas.", "We haven’t explored that combination yet. You can change your choices.");
    grid.replaceChildren(...selection.map(c => c.content.cloneNode(true)));
    const tones = visit.paletas.filter(p => paletteSamples.has(p));
    for (const palette of tones) {
      const link = document.createElement("a");
      link.className = "text-link";
      link.href = "#paleta-da-visita";
      link.textContent = copy("Paleta: ", "Palette: ") + preferenceLabel(palette);
      link.addEventListener("click", () => showPalette(palette));
      links.append(link);
    }
    showPalette(tones[0]);
  }
  function clearVisit() {
    storeVisit(null);
    showSelection();
  }
  function openVisit(start, previous = null) {
    draft = previous ? {...previous, paletas:[...previous.paletas]} : {imovel:null, estilo:null, paletas:null, nome:""};
    firstStep = start;
    preferences.elements.primeiro_nome.value = draft.nome;
    dialog.showModal();
    showStep(start);
  }
  for (const opener of document.querySelectorAll("[data-open-visit]")) {
    opener.hidden = false;
    opener.addEventListener("click", () => openVisit(0, visit));
  }
  addPalette.addEventListener("click", () => openVisit(2, visit));
  setName.addEventListener("click", () => openVisit(3, visit));
  function finishVisit() {
    storeVisit(draft);
    showSelection();
    dialog.close();
    location.hash = "residencias";
    panel.focus();
  }
  for (const choice of choices) {
    choice.addEventListener("click", () => {
      const key = choice.dataset.choice;
      if (key === "paleta") {
        const tones = firstStep === 2 ? draft.paletas : [];
        draft.paletas = choice.value === "Todas" ? [] : [...new Set([...tones, choice.value])];
        finishVisit();
      } else {
        draft[key] = choice.value;
        if (key === "imovel" && draft.estilo && !studiesFor(draft.imovel, draft.estilo).length) draft.estilo = null;
        showStep(step + 1);
      }
    });
  }
  preferences.addEventListener("submit", event => {
    event.preventDefault();
    if (step !== 3) return;
    draft.nome = preferences.elements.primeiro_nome.value.trim();
    finishVisit();
  });
  skip.addEventListener("click", () => {
    draft.paletas = [];
    finishVisit();
  });
  preferences.querySelector("[data-exit]").addEventListener("click", () => dialog.close());
  clear.addEventListener("click", () => { clearVisit(); edit.focus(); });
  // Preferências anteriores podiam combinar um imóvel com um estilo de outra tipologia.
  if (visit && !studiesFor(visit.imovel, visit.estilo).length) {
    storeVisit(studiesFor(visit.imovel).length ? {...visit, estilo:"Todos"} : null);
  }
  window.addEventListener("pageshow", event => {
    if (event.persisted) {
      visit = readVisit(visit);
      showSelection();
    }
  });
  showSelection();
  if (visit && !location.hash) {
    history.replaceState(null, "", "#residencias");
    panel.scrollIntoView();
    panel.focus({preventScroll:true});
  }
}

const form = document.getElementById("contact-form");
if (form) {
  form.hidden = false;
  const address = form.dataset.address;
  const feedback = document.getElementById("status");
  const consent = form.querySelector('[name="incluir_visita"]');
  const study = form.elements.estudo;
  const requestedStudy = new URLSearchParams(location.search).get("estudo");
  if (requestedStudy && Array.from(study.options).some(option => option.value === requestedStudy)) {
    study.value = requestedStudy;
  }
  if (visit && consent) consent.closest("label").hidden = false;
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    visit = readVisit(visit);
    consent.checked = false;
    consent.closest("label").hidden = !visit;
  });
  function message() {
    const fields = new FormData(form);
    const name = fields.get("nome").trim();
    const stage = fields.get("momento");
    const note = fields.get("mensagem").trim();
    const selected = visit && consent?.checked ?
      [visit.nome && !name ? visit.nome : "", ...[visit.imovel, visit.estilo, ...visit.paletas].filter(v => v !== "Todos").map(preferenceLabel)].filter(v => v && v !== "Todos").join(" · ") : "";
    const reference = study.value && copy("Gostaria de conversar sobre o estudo ", "I’d like to discuss the design study ") + study.selectedOptions[0].textContent + ".";
    return [copy("Olá, equipe Piguê.", "Hello, Piguê team."), name && copy("Meu nome é ", "My name is ") + name + ".", stage, reference, selected && copy("Minhas preferências: ", "My preferences: ") + selected, note]
      .filter(Boolean).join("\n\n");
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    const body = encodeURIComponent(message());
    window.location.href = "mailto:" + address + "?subject=" + encodeURIComponent(copy("Primeira conversa com a Piguê", "My project inquiry for Piguê")) + "&body=" + body;
    feedback.textContent = copy("Revise e envie pelo seu aplicativo de e-mail. Você também pode copiar a mensagem e usar seu webmail.", "Review and send the draft in your email app. You can also copy it into your webmail.");
  });
  document.getElementById("copy").addEventListener("click", async () => {
    const body = message();
    try {
      await navigator.clipboard.writeText(body);
      feedback.textContent = copy("Mensagem copiada. Cole no seu e-mail para ", "Message copied. Paste it into an email to ") + address + ".";
    } catch {
      const draft = document.createElement("span");
      draft.className = "visitor-text";
      draft.textContent = body;
      feedback.replaceChildren(draft, copy(". destinatário: ", " · Send to ") + address);
    }
  });
}

function initStyleCarousel(gallery) {
  const catalog = Array.from(gallery.querySelectorAll(".style-slide"));
  const controls = gallery.querySelector(".style-controls");
  const categories = controls.querySelectorAll("[data-category]");
  const select = controls.querySelector("select");
  const toggle = controls.querySelector(".style-play");
  const paging = gallery.querySelector(".style-paging");
  const counter = paging.querySelector(".style-count");
  const arrows = gallery.querySelector(".style-arrows");
  const status = gallery.querySelector("[role=status]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stage = gallery.querySelector(".style-stage");
  let slides = [];
  let playing = !reducedMotion.matches;
  let visible = false;
  let index = 0;
  let timer;

  function schedule() {
    window.clearTimeout(timer);
    if (playing && visible && !document.hidden) {
      timer = window.setTimeout(() => show(index + 1), 8000);
    }
  }

  function setPlaying(value) {
    playing = value;
    toggle.textContent = playing ? copy("Pausar carrossel", "Pause slideshow") : copy("Reproduzir carrossel", "Play slideshow");
    schedule();
  }

  function show(next, manual = false) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.setAttribute("aria-hidden", String(i !== index)));
    select.selectedIndex = index;
    counter.textContent = (index + 1) + copy(" de ", " of ") + slides.length;
    if (manual) {
      setPlaying(false);
      status.textContent = select.options[index].text + copy(", estilo ", ", style ") + (index + 1) + copy(" de ", " of ") + slides.length;
    }
    schedule();
  }

  function chooseCategory(button) {
    const previousStyle = slides[index]?.dataset.style;
    const category = button.dataset.category;
    categories.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    slides = catalog.filter(slide => slide.dataset.category === category);
    catalog.forEach(slide => {
      slide.hidden = slide.dataset.category !== category;
      if (slide.hidden) slide.setAttribute("aria-hidden", "true");
    });
    select.replaceChildren(...slides.map((slide, i) => new Option(slide.dataset.style, i)));
    const match = slides.findIndex(slide => slide.dataset.style === previousStyle);
    show(Math.max(0, match));
  }

  categories.forEach(button => {
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-pressed") === "true") return;
      chooseCategory(button);
      status.textContent = button.textContent + ", " + select.options[index].text + copy(", estilo ", ", style ") + (index + 1) + copy(" de ", " of ") + slides.length;
    });
  });
  arrows.querySelectorAll("[data-step]").forEach(button => {
    button.addEventListener("click", () => show(index + Number(button.dataset.step), true));
  });
  toggle.addEventListener("click", () => setPlaying(!playing));
  select.addEventListener("pointerdown", () => setPlaying(false));
  select.addEventListener("change", () => show(select.selectedIndex, true));
  gallery.addEventListener("focusin", event => {
    if (event.target.matches(":focus-visible")) setPlaying(false);
  });
  document.addEventListener("visibilitychange", schedule);
  reducedMotion.addEventListener("change", () => setPlaying(false));
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }).observe(stage);

  chooseCategory(categories[0]);
  setPlaying(playing);
  gallery.classList.add("is-carousel");
  gallery.setAttribute("aria-roledescription", copy("carrossel", "carousel"));
  controls.hidden = false;
  paging.hidden = false;
  arrows.hidden = false;
}

const styleGallery = document.querySelector("#estilos.style-gallery");
if (styleGallery) initStyleCarousel(styleGallery);

const footerMap = document.querySelector(".footer-map");
if (footerMap) {
  document.addEventListener("click", event => {
    if (footerMap.open && (!footerMap.contains(event.target) || event.target.closest("a"))) {
      footerMap.open = false;
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && footerMap.open) {
      footerMap.open = false;
      footerMap.querySelector("summary").focus();
    }
  });
}


const brandRail = document.querySelector(".brand-rail");
if (brandRail) {
  const viewport = brandRail.querySelector(".brand-window");
  const list = viewport.querySelector("ul");
  const originals = Array.from(list.children);
  for (const item of originals) {
    const copy = item.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    for (const link of copy.querySelectorAll("a")) link.tabIndex = -1;
    list.append(copy);
  }
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = matchMedia("(hover: hover)");
  const pixelsPerSecond = 13;
  let motion;
  let cycleWidth = 0;
  let visible = false;
  let interacting = false;
  let resumeTimer;

  function pause() {
    if (!motion) return;
    const offset = ((motion.currentTime || 0) * pixelsPerSecond / 1000) % cycleWidth;
    motion.cancel();
    motion = null;
    viewport.scrollLeft = offset;
  }

  function updateMotion() {
    if (!visible || document.hidden || reduceMotion.matches || interacting ||
        (canHover.matches && brandRail.matches(":hover")) || brandRail.matches(":focus-within")) {
      pause();
      return;
    }
    if (motion || !cycleWidth) return;
    const offset = viewport.scrollLeft % cycleWidth;
    viewport.scrollLeft = 0;
    motion = list.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(-${cycleWidth}px)` }],
      { duration: cycleWidth * 1000 / pixelsPerSecond, iterations: Infinity, easing: "linear" }
    );
    motion.currentTime = offset * 1000 / pixelsPerSecond;
  }

  function hold() {
    clearTimeout(resumeTimer);
    interacting = true;
    pause();
  }
  function release() {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { interacting = false; updateMotion(); }, 1200);
  }
  function scrollBrands(direction) {
    if (!cycleWidth) return;
    hold();
    let left = viewport.scrollLeft % cycleWidth;
    if (direction < 0 && left < viewport.clientWidth - 1) left += cycleWidth;
    viewport.scrollLeft = left;
    viewport.scrollTo({ left: left + direction * viewport.clientWidth,
      behavior: reduceMotion.matches ? "instant" : "smooth" });
    release();
  }
  for (const button of brandRail.querySelectorAll("button")) {
    button.hidden = false;
    button.addEventListener("click", () => scrollBrands(Number(button.dataset.step)));
  }
  viewport.addEventListener("keydown", event => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    scrollBrands(event.key === "ArrowRight" ? 1 : -1);
  });
  brandRail.addEventListener("pointerenter", updateMotion);
  brandRail.addEventListener("pointerleave", updateMotion);
  brandRail.addEventListener("focusin", pause);
  brandRail.addEventListener("focusout", () => requestAnimationFrame(updateMotion));
  viewport.addEventListener("pointerdown", hold);
  window.addEventListener("pointerup", () => { if (interacting) release(); });
  viewport.addEventListener("pointercancel", release);
  viewport.addEventListener("wheel", () => { hold(); release(); }, { passive: true });
  viewport.addEventListener("scroll", () => { if (interacting) release(); }, { passive: true });
  document.addEventListener("visibilitychange", updateMotion);
  reduceMotion.addEventListener("change", updateMotion);
  new ResizeObserver(() => {
    pause();
    cycleWidth = list.children[originals.length].getBoundingClientRect().left -
      list.firstElementChild.getBoundingClientRect().left;
    updateMotion();
  }).observe(viewport);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateMotion();
  }).observe(brandRail);
}

