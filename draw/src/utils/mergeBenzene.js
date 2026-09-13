// Fuse a benzene preset without duplicating the shared edge or giving a
// fusion carbon two double bonds. Existing bond orders remain authoritative.
export function mergeBenzene(vertices, segments, ringVertices, ringBonds) {
  const same = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < .01;
  const mergedVertices = [...vertices];
  const canonical = ringVertices.map(v => {
    const found = mergedVertices.find(p => same(p, v));
    if (found) return found;
    mergedVertices.push(v);
    return v;
  });
  const ends = b => [{x:b.x1,y:b.y1}, {x:b.x2,y:b.y2}];
  const sameBond = (a,b) => {
    const [p,q]=ends(a),[r,s]=ends(b);
    return (same(p,r)&&same(q,s)) || (same(p,s)&&same(q,r));
  };
  const added = ringBonds.map((b,i) => ({...b,x1:canonical[i].x,y1:canonical[i].y,
    x2:canonical[(i+1)%6].x,y2:canonical[(i+1)%6].y,bondOrder:1}))
    .filter(b => !segments.some(s => sameBond(b,s)));
  const all = [...segments,...added];
  const incident = (b,v) => ends(b).some(p=>same(p,v));
  let best = 0, bestCount = -1;
  // Only six candidate edges: exhaustive matching is small and deterministic.
  for (let mask=0; mask < (1<<added.length); mask++) {
    const chosen=added.filter((_,i)=>mask & (1<<i));
    if (!canonical.every(v => {
      const bonds=all.filter(b=>incident(b,v));
      const extra=chosen.filter(b=>incident(b,v)).length;
      return bonds.filter(b=>(b.bondOrder||1)>1).length+extra<=1 &&
        bonds.reduce((sum,b)=>sum+(b.bondOrder||1),0)+extra<=4;
    })) continue;
    if(chosen.length>bestCount) {best=mask;bestCount=chosen.length;}
  }
  return {vertices:mergedVertices,segments:[...segments,...added.map((b,i)=>({...b,bondOrder:best & (1<<i)?2:1}))]};
}
