// Hidden hydrogens receive illustrative 2D sites in the largest free angle.
// These positions visualize the charge model, not predicted molecular geometry.
export function chargeSites(part) {
  if(part.unavailable)return part.atoms.map(a=>({...a,charge:0}));
  return part.atoms.flatMap((a,index)=>{
    const sites=[{...a,charge:a.atomCharge}];
    if(!a.hydrogens)return sites;
    const angles=part.bonds.filter(b=>b.from===index||b.to===index).map(b=>{
      const p=part.atoms[b.from===index?b.to:b.from];return (Math.atan2(p.y-a.y,p.x-a.x)+2*Math.PI)%(2*Math.PI);
    }).sort((a,b)=>a-b);
    let start=0,gap=2*Math.PI;
    if(angles.length){gap=0;angles.forEach((angle,i)=>{const size=(i+1<angles.length?angles[i+1]:angles[0]+2*Math.PI)-angle;if(size>gap){start=angle;gap=size;}});}
    for(let i=0;i<a.hydrogens;i++){
      const angle=angles.length?start+gap*(i+1)/(a.hydrogens+1):2*Math.PI*i/a.hydrogens;
      sites.push({x:a.x+34*Math.cos(angle),y:a.y+34*Math.sin(angle),charge:a.hydrogenCharge/a.hydrogens});
    }
    return sites;
  });
}
// Compact support prevents remote sites from coloring the surface around an ion.
export function chargeKernel(distanceSquared) {
  const t=Math.max(0,1-distanceSquared/(48*48));
  return t*t*t;
}
// Pre-render once per calculation; panning and zooming reuse the raster layer.
export function createChargeAura(parts) {
  return parts.map(part=>{
    const atoms=chargeSites(part);if(!atoms.length)return null;
    const pad=50,x=Math.min(...atoms.map(a=>a.x))-pad,y=Math.min(...atoms.map(a=>a.y))-pad;
    const width=Math.max(...atoms.map(a=>a.x))-x+pad,height=Math.max(...atoms.map(a=>a.y))-y+pad;
    const step=Math.max(.75,width/1000,height/1000),w=Math.ceil(width/step),h=Math.ceil(height/step);
    const weights=new Float32Array(w*h),chargeWeights=new Float32Array(w*h),values=new Float32Array(w*h);
    atoms.forEach(a=>{
      const cx=(a.x-x)/step,cy=(a.y-y)/step,r=pad/step;
      for(let j=Math.max(0,Math.floor(cy-r));j<Math.min(h,Math.ceil(cy+r));j++) for(let i=Math.max(0,Math.floor(cx-r));i<Math.min(w,Math.ceil(cx+r));i++){
        const d2=((i-cx)**2+(j-cy)**2)*step*step;
        if(d2>pad*pad)continue;
        const weight=chargeKernel(d2),idx=j*w+i;
        const colorWeight=weight**1.5;
        weights[idx]+=weight;chargeWeights[idx]+=colorWeight;values[idx]+=colorWeight*(a.charge||0);
      }
    });
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(w,h);
    const heights=Float32Array.from(weights,v=>Math.sqrt(Math.max(0,v-.10)));
    for(let i=0;i<weights.length;i++) {
      const coverage=Math.max(0,Math.min(1,(weights[i]-.10)/.025));
      if(!coverage)continue;
      const value=part.unavailable?0:Math.max(-1,Math.min(1,values[i]/chargeWeights[i]/.5));
      const neutral=[235,232,243],color=value<0?[235,46,76]:[65,102,235],t=Math.abs(value);
      // A height-field normal supplies achromatic light and shade, never a
      // second charge color. Structure strokes are drawn above this surface.
      const col=i%w,row=Math.floor(i/w);
      const nx=-(heights[i+(col<w-1?1:0)]-heights[i-(col>0?1:0)])*18/step;
      const ny=-(heights[i+(row<h-1?w:0)]-heights[i-(row>0?w:0)])*18/step;
      const length=Math.hypot(nx,ny,1);
      const light=Math.max(0,(-.45*nx-.55*ny+.70)/length);
      const highlight=.28*Math.pow(Math.max(0,(-.25*nx-.30*ny+.92)/length),18);
      for(let c=0;c<3;c++){
        const base=neutral[c]+(color[c]-neutral[c])*t;
        pixels.data[4*i+c]=base*(.72+.28*light)*(1-highlight)+255*highlight;
      }
      pixels.data[4*i+3]=.80*coverage*255;
    }
    ctx.putImageData(pixels,0,0);
    return {canvas,x,y,width,height,unavailable:part.unavailable,atom:atoms[0]};
  }).filter(Boolean);
}
export function renderChargeAura(ctx,layers,offset) {
  ctx.save();
  layers.forEach(layer=>{
    ctx.drawImage(layer.canvas,layer.x+offset.x,layer.y+offset.y,layer.width,layer.height);
    if(layer.unavailable){
      ctx.strokeStyle='#887a9c';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
      ctx.strokeRect(layer.x+offset.x+35,layer.y+offset.y+35,layer.width-70,layer.height-70);
      ctx.setLineDash([]);ctx.fillStyle='#887a9c';ctx.font='12px sans-serif';
      ctx.fillText('Charge unavailable',layer.x+offset.x+35,layer.y+offset.y+28);
    }
  });
  ctx.restore();
}
