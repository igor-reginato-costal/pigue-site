const cover = document.querySelector(".cover");
const canvas = cover.querySelector("canvas");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
let drawMetal;
let cursorAngle = null;
let angle = 0;
let phase = 0;
let frame = 0;
let previousTime = 0;
let inView = true;

function requestDraw() {
  if (!frame && !document.hidden && inView) frame = requestAnimationFrame(render);
}

function render(now) {
  frame = 0;
  const dt = Math.min((now - previousTime) / 1000, .08);
  previousTime = now;
  if (cursorAngle === null && !reduced.matches) phase += dt * Math.PI / 6.5;
  const target = reduced.matches ? 0 : cursorAngle ?? .12 + .32 * Math.sin(phase);
  const difference = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
  angle += reduced.matches ? difference : difference * (1 - Math.exp(-35 * dt));
  if (drawMetal) drawMetal(angle);
  else cover.style.setProperty("--lamp", (90 + angle * 180 / Math.PI) + "deg");
  if (!reduced.matches && (cursorAngle === null || Math.abs(difference) > .001)) requestDraw();
}

cover.addEventListener("pointermove", event => {
  if (reduced.matches || !finePointer.matches || event.pointerType === "touch") return;
  const rect = cover.getBoundingClientRect();
  const plateHeight = Math.max(rect.width / 1.5, rect.height);
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2 + .026 * plateHeight;
  if (Math.hypot(x, y) < 12) return;
  cursorAngle = Math.atan2(y, x);
  requestDraw();
});
function releaseLight() {
  cursorAngle = null;
  requestDraw();
}
cover.addEventListener("pointerleave", releaseLight);
reduced.addEventListener("change", releaseLight);
document.addEventListener("visibilitychange", requestDraw);
new ResizeObserver(requestDraw).observe(cover);
new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  if (inView) requestDraw();
}).observe(cover);

async function prepareMetal() {
  const gl = canvas.getContext("webgl", {alpha:false, antialias:false, depth:false});
  if (!gl) return;
  const normal = new Image();
  normal.src = new URL("relevo.png", import.meta.url).href;
  const [fragment] = await Promise.all([
    fetch(new URL("metal.frag", import.meta.url)).then(r => { if (!r.ok) throw Error("Shader indisponível"); return r.text(); }),
    normal.decode()
  ]);
  const program = gl.createProgram();
  function attach(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
  }
  attach(gl.VERTEX_SHADER, `attribute vec2 pos; varying vec2 uv;
    void main(){ uv=pos*vec2(.5,-.5)+.5; gl_Position=vec4(pos,0.,1.); }`);
  attach(gl.FRAGMENT_SHADER, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program,"pos");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,normal);
  for (const wrap of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,wrap,gl.CLAMP_TO_EDGE);
  for (const filter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,filter,gl.LINEAR);
  const crop = gl.getUniformLocation(program,"crop");
  const pixel = gl.getUniformLocation(program,"pixel");
  const light = gl.getUniformLocation(program,"axis");
  drawMetal = a => {
    const scale = Math.min(devicePixelRatio, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0,0,w,h);
    const cropX = Math.min(1,w/h/1.5), cropY = Math.min(1,h/w*1.5);
    gl.uniform2f(crop,cropX,cropY);
    gl.uniform2f(pixel,cropX/w,cropY/h);
    gl.uniform2f(light,Math.cos(a),Math.sin(a));
    gl.drawArrays(gl.TRIANGLES,0,3);
  };
  cover.classList.add("lit");
  requestDraw();
}
function startMetal() {
  prepareMetal().catch(error => console.warn("Iluminação alternativa da capa:",error));
}
canvas.addEventListener("webglcontextlost", event => {
  event.preventDefault();
  drawMetal = null;
  cover.classList.remove("lit");
  requestDraw();
});
canvas.addEventListener("webglcontextrestored", startMetal);
startMetal();
requestDraw();
