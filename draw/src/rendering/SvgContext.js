const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

/** Canvas subset used by our renderers, recorded as editable SVG geometry. */
export class SvgContext {
  constructor(measureContext) {
    this.measureContext = measureContext; this.elements = []; this.stack = []; this.path = '';
    this.state = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', font: '12px Arial', textAlign: 'start', textBaseline: 'alphabetic', transform: 'matrix(1 0 0 1 0 0)', dash: [] };
    for (const name of Object.keys(this.state)) Object.defineProperty(this, name, { get: () => this.state[name], set: value => { this.state[name] = value; } });
  }
  save() { this.stack.push({ ...this.state }); }
  restore() { if (this.stack.length) this.state = this.stack.pop(); }
  setTransform(a, b, c, d, e, f) { this.state.transform = `matrix(${a} ${b} ${c} ${d} ${e} ${f})`; }
  setLineDash(dash) { this.state.dash = [...dash]; }
  clearRect() { this.elements = []; }
  beginPath() { this.path = ''; }
  closePath() { this.path += ' Z'; }
  moveTo(x, y) { this.path += ` M${x} ${y}`; }
  lineTo(x, y) { this.path += ` L${x} ${y}`; }
  quadraticCurveTo(cx, cy, x, y) { this.path += ` Q${cx} ${cy} ${x} ${y}`; }
  arc(x, y, radius, start, end, anticlockwise = false) {
    const full = Math.abs(end - start) >= 2 * Math.PI - 1e-8;
    const sweep = anticlockwise ? 0 : 1;
    const sx = x + radius * Math.cos(start), sy = y + radius * Math.sin(start);
    this.path += `${this.path ? ' L' : ' M'}${sx} ${sy}`;
    if (full) {
      this.path += ` A${radius} ${radius} 0 1 ${sweep} ${x - radius * Math.cos(start)} ${y - radius * Math.sin(start)} A${radius} ${radius} 0 1 ${sweep} ${sx} ${sy}`;
    } else {
      const span = ((anticlockwise ? start - end : end - start) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      this.path += ` A${radius} ${radius} 0 ${span > Math.PI ? 1 : 0} ${sweep} ${x + radius * Math.cos(end)} ${y + radius * Math.sin(end)}`;
    }
  }
  roundRect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
  attributes(fill) { return `transform="${this.state.transform}" fill="${fill ? escape(this.fillStyle) : 'none'}" stroke="${fill ? 'none' : escape(this.strokeStyle)}" stroke-width="${this.lineWidth}" stroke-linecap="${this.lineCap}" stroke-linejoin="${this.lineJoin}" stroke-dasharray="${this.state.dash.join(' ')}"`; }
  fill() { this.elements.push(`<path d="${this.path}" ${this.attributes(true)}/>`); }
  stroke() { this.elements.push(`<path d="${this.path}" ${this.attributes(false)}/>`); }
  fillRect(x, y, w, h) { this.elements.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${this.attributes(true)}/>`); }
  strokeRect(x, y, w, h) { this.elements.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${this.attributes(false)}/>`); }
  measureText(text) { this.measureContext.font = this.font; return this.measureContext.measureText(text); }
  fillText(text, x, y) {
    const anchor = this.textAlign === 'center' ? 'middle' : ['right', 'end'].includes(this.textAlign) ? 'end' : 'start';
    const baseline = ({ middle: 'central', top: 'text-before-edge', bottom: 'text-after-edge', hanging: 'hanging' })[this.textBaseline] || 'alphabetic';
    this.elements.push(`<text x="${x}" y="${y}" transform="${this.state.transform}" fill="${escape(this.fillStyle)}" style="font:${escape(this.font)}" text-anchor="${anchor}" dominant-baseline="${baseline}">${escape(text)}</text>`);
  }
  toSvg(bounds) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">${this.elements.join('')}</svg>`; }
}
