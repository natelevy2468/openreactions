// Diagnostic overlays are deliberately separate from chemical drawing/export data.
export function renderChemistryIssues(ctx, issues, offset) {
  ctx.save();
  issues.forEach((issue,index) => {
    const targets=(issue.targets || []).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(!targets.length) return;
    ctx.strokeStyle='#9b51e0';ctx.lineWidth=2.5;
    targets.forEach(p=>{
      ctx.beginPath();ctx.arc(p.x+offset.x,p.y+offset.y,17,0,Math.PI*2);ctx.stroke();
    });
    const p=targets[0],x=p.x+offset.x+19,y=p.y+offset.y-19;
    ctx.fillStyle='#7650c5';ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(String(index+1),x,y);
  });
  ctx.restore();
}
