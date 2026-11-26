const cover = document.querySelector(".cover");
const dial = cover.querySelector(".dial");
const pointerMotion = matchMedia("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)");
let sweep = 0;
let tilt = 0;

// Opposite highlights share an axis. Use its nearest angle across the 180° seam.
function aimAt(angle) {
  tilt = angle + 180 * Math.round((tilt - angle) / 180);
  dial.style.setProperty("--tilt", tilt.toFixed(2) + "deg");
}

cover.addEventListener("pointermove", event => {
  if (!pointerMotion.matches || event.pointerType === "touch") return;
  const bounds = dial.getBoundingClientRect();
  const textureHeight = Math.max(bounds.height, bounds.width * 2 / 3);
  const x = event.clientX - (bounds.left + bounds.width / 2);
  const y = event.clientY - (bounds.top + bounds.height / 2 - .027 * textureHeight);
  if (Math.hypot(x, y) < 12) return;
  if (!dial.classList.contains("tracking")) {
    dial.classList.add("tracking");
    sweep = parseFloat(getComputedStyle(dial, "::after").getPropertyValue("--sweep")) || 0;
  }
  aimAt(Math.atan2(y, x) * 180 / Math.PI - sweep);
});

function resetTilt() {
  dial.classList.remove("tracking");
  aimAt(0);
}
cover.addEventListener("pointerleave", resetTilt);
pointerMotion.addEventListener("change", resetTilt);
