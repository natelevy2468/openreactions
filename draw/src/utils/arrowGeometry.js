/** Straight arrows store their center, including equilibrium and resonance arrows. */
export function straightArrowEndpoints(arrow) {
  const dx = Math.cos(arrow.angle || 0) * (arrow.length || 80) / 2;
  const dy = Math.sin(arrow.angle || 0) * (arrow.length || 80) / 2;
  return { start: { x: arrow.x - dx, y: arrow.y - dy }, end: { x: arrow.x + dx, y: arrow.y + dy } };
}
export function resizeStraightArrow(arrow, part, point) {
  const { start, end } = straightArrowEndpoints(arrow);
  const a = part === 'start' ? point : start, b = part === 'end' ? point : end;
  if (Math.hypot(b.x - a.x, b.y - a.y) < 12) return arrow;
  return { ...arrow, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, length: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x) };
}
