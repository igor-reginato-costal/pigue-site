// Project the spherical photograph onto a level, 90-degree camera view.
const panorama = document.querySelector('.method-pano');
if (panorama) {
  const photo = panorama.querySelector('img');
  const control = panorama.nextElementSibling;
  const slider = control.querySelector('input');
  function prepare() {
    const source = document.createElement('canvas');
    source.width = photo.naturalWidth;
    source.height = photo.naturalHeight;
    const sourceContext = source.getContext('2d');
    sourceContext.drawImage(photo, 0, 0);
    const pixels = new Uint32Array(sourceContext.getImageData(0, 0, source.width, source.height).data.buffer);
    const view = document.createElement('canvas');
    view.width = 840;
    view.height = 560;
    view.setAttribute('role', 'img');
    view.setAttribute('aria-label', photo.alt);
    const ctx = view.getContext('2d');
    const frame = ctx.createImageData(view.width, view.height);
    const output = new Uint32Array(frame.data.buffer);
    const rows = new Uint32Array(output.length);
    const columns = new Uint16Array(view.width);
    for (let x = 0; x < view.width; x++) {
      const rayX = (2*x + 1 - view.width) / view.width;
      columns[x] = Math.floor((0.5 + Math.atan(rayX)/(2*Math.PI))*source.width);
      for (let y = 0; y < view.height; y++) {
        const rayY = (2*y + 1 - view.height)/view.width;
        const latitude = Math.atan2(rayY, Math.hypot(1,rayX));
        rows[y*view.width+x] = Math.floor((0.5 + latitude/Math.PI)*source.height)*source.width;
      }
    }
    function draw() {
      const offset = Math.round(Number(slider.value)*source.width/360) + source.width;
      for (let x = 0; x < view.width; x++) {
        const column = (columns[x]+offset)%source.width;
        for (let i = x; i < output.length; i += view.width) output[i] = pixels[rows[i]+column];
      }
      ctx.putImageData(frame,0,0);
    }
    draw();
    photo.replaceWith(view);
    control.hidden = false;
    slider.addEventListener('input', draw);
  }
  if (photo.complete && photo.naturalWidth) prepare();
  else photo.addEventListener('load', prepare, {once:true});
}
