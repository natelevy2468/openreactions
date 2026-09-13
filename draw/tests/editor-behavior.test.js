import test from 'node:test';
import assert from 'node:assert/strict';
import { straightArrowEndpoints, resizeStraightArrow } from '../src/utils/arrowGeometry.js';
import { findHoveredArrowIndex, detectArrowPart } from '../src/utils/hitTest.js';
import { smilesToGraph } from '../src/chemistry/importStructure.js';
import { graphToDrawing } from '../src/chemistry/graphToDrawing.js';
import { tidyStructure } from '../src/chemistry/tidyStructure.js';
import { detectAllRingsEnhanced } from '../src/rendering/RingDetectionUtils.js';
import { findBondRing } from '../src/rendering/DoubleBondRenderer.js';
import { renderAtomText } from '../src/rendering/TextRenderer.js';
import { renderAllLonePairsAndCharges } from '../src/rendering/LonePairRenderer.js';
for (const type of ['forward','equilibrium']) test(`${type}: endpoints match hit targets and resizing anchors the opposite end`, () => {
  for (const angle of [0,Math.PI/3,-Math.PI/2]) {
    const arrow={type,x:200,y:100,length:160,angle};
    const {start,end}=straightArrowEndpoints(arrow);
    assert.equal(findHoveredArrowIndex([arrow],start.x,start.y),0);
    assert.equal(detectArrowPart([arrow],0,start.x,start.y),'start');
    assert.equal(detectArrowPart([arrow],0,end.x,end.y),'end');
    assert.equal(detectArrowPart([arrow],0,200,100),'middle');
    const next=straightArrowEndpoints(resizeStraightArrow(arrow,'start',{x:start.x-33,y:start.y+17}));
    assert(Math.hypot(next.end.x-end.x,next.end.y-end.y)<1e-8);
  }
  assert.equal(findHoveredArrowIndex([{type,x:200,y:100,length:160,angle:0}],350,100),null);
});
test('tidy retains orientation and center of an already regular rotated structure', async () => {
  const graph=await smilesToGraph('c1ccccc1'),theta=.73;
  graph.atoms=graph.atoms.map(a=>({...a,x:400+a.x*Math.cos(theta)-a.y*Math.sin(theta),y:300+a.x*Math.sin(theta)+a.y*Math.cos(theta)}));
  const doc={...graphToDrawing(graph),arrows:[],newmanInstances:[]},result=await tidyStructure(doc);
  doc.vertices.forEach((v,i)=>assert(Math.hypot(v.x-result.vertices[i].x,v.y-result.vertices[i].y)<.15));
});
test('benzene gets interior double bonds over a fused five-membered ring, also after translation', async () => {
  const doc=graphToDrawing(await smilesToGraph('c1ccc2CCCc2c1'));
  for (const delta of [0,333.137]) {
    const vertices=doc.vertices.map(v=>({x:v.x+delta,y:v.y+delta}));
    const bonds=doc.segments.map(b=>({...b,x1:b.x1+delta,y1:b.y1+delta,x2:b.x2+delta,y2:b.y2+delta}));
    const rings=detectAllRingsEnhanced(bonds,vertices);
    const benzene=rings.find(r=>r.bonds.length===6 && r.bonds.filter(b=>b.bondOrder===2).length===3);
    assert(benzene, 'Benzene ring recognized');
    benzene.bonds.filter(b=>b.bondOrder===2).forEach(b=>assert.equal(findBondRing(b,rings).bonds.length,6));
  }
});
function context() {
  const circles=[];
  return {circles,font:'26px Arial',measureText(text){return {width:text.length*parseFloat(this.font)*.6};},fillText(){},beginPath(){},fill(){},stroke(){},arc(x,y,r){circles.push({x,y,r});},roundRect(){throw new Error('Opaque halo rendered');}};
}
test('long labels have no opaque mask and electron spacing follows displayed label width', () => {
  const ctx=context(),vertex={x:100,y:100},key='100.00,100.00';
  renderAtomText(ctx,vertex,{symbol:'NH2'},{x:0,y:0},{atoms:'#000'});
  const render=symbol=>{ctx.circles.length=0;renderAllLonePairsAndCharges(ctx,[vertex],[],{[key]:{symbol,lonePairs:8}},{x:0,y:0},{bonds:'#000'});return ctx.circles.map(c=>({...c}));};
  const short=render('N'),long=render('NH2');
  assert(long.length>0);
  assert(Math.max(...long.map(c=>Math.abs(c.x-100)))>Math.max(...short.map(c=>Math.abs(c.x-100))));
});

import { graphToSmiles } from '../src/chemistry/exportStructure.js';
import { buildMoleculeGraph } from '../src/chemistry/moleculeGraph.js';
import { loadOCL } from '../src/chemistry/ocl.js';
test('orientation-preserving tidy retains stereochemistry across rotations', async () => {
  const OCL=await loadOCL();
  for (const smiles of ['N[C@@H](C)C(=O)O','N[C@H](C)C(=O)O','F/C=C/F','F/C=C\\F']) {
    for (const angle of [.2,1.7,3.8]) {
      const graph=await smilesToGraph(smiles);
      graph.atoms=graph.atoms.map(a=>({...a,x:a.x*Math.cos(angle)-a.y*Math.sin(angle),y:a.x*Math.sin(angle)+a.y*Math.cos(angle)}));
      const doc=await tidyStructure({...graphToDrawing(graph),arrows:[]});
      const actual=await graphToSmiles(buildMoleculeGraph(doc));
      assert.equal(OCL.Molecule.fromSmiles(actual.smiles).getIDCode(),OCL.Molecule.fromSmiles(smiles).getIDCode());
    }
  }
});

import { CURVE_PRESETS, createCurvedArrow } from '../src/utils/curvedArrowPresets.js';
import { renderCurvedArrow } from '../src/rendering/ArrowRenderer.js';
import { SvgContext } from '../src/rendering/SvgContext.js';
test('all six fishhooks retain the matching curve and have exactly half the arrowhead area', () => {
  const record=arrow=>{const paths=[];let path;const ctx={beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},quadraticCurveTo(...coords){path.push(coords);},stroke(){paths.push(path);},closePath(){},fill(){paths.push(path);}};renderCurvedArrow(ctx,arrow,{x:0,y:0},{bonds:'#000'});return paths;};
  const area=points=>Math.abs(points.reduce((n,p,i)=>{const q=points[(i+1)%points.length];return n+p[0]*q[1]-p[1]*q[0];},0))/2;
  CURVE_PRESETS.forEach(p=>{
    const pair=createCurvedArrow(p.mode,{x:50,y:80},{x:210,y:115});
    const single=createCurvedArrow('fishhook-'+p.mode,{x:50,y:80},{x:210,y:115});
    const full=record(pair),half=record(single);
    assert.deepEqual(full[0],half[0]);
    assert(Math.abs(area(half[1])/area(full[1])-.5)<1e-9);
    assert.equal(JSON.parse(JSON.stringify(single)).electrons,1);
    const ctx=new SvgContext({measureText:()=>({width:0})});
    renderCurvedArrow(ctx,single,{x:0,y:0},{bonds:'#000'});
    assert(ctx.toSvg({x:0,y:0,width:300,height:200}).includes('<path'));
  });
});
test('new clockwise and counterclockwise presets have matching shallow, medium, and deep curvature', () => {
  for(let i=0;i<3;i++) {
    const a=createCurvedArrow('curve'+i,{x:0,y:0},{x:100,y:0});
    const b=createCurvedArrow('curve'+(i+3),{x:0,y:0},{x:100,y:0});
    assert.equal(a.controlOffset,-b.controlOffset);
  }
});

import { mergeBenzene } from '../src/utils/mergeBenzene.js';
test('benzene fusion reuses shared edges and respects carbon valence on all six sides', () => {
  const ring=(x,y)=>{
    const vertices=Array.from({length:6},(_,i)=>({x:x+60*Math.cos(Math.PI/6+i*Math.PI/3),y:y+60*Math.sin(Math.PI/6+i*Math.PI/3)}));
    return {vertices,segments:vertices.map((v,i)=>({x1:v.x,y1:v.y,x2:vertices[(i+1)%6].x,y2:vertices[(i+1)%6].y,bondOrder:i%2?1:2}))};
  };
  const first=ring(300,300);
  for(let i=0;i<6;i++) {
    const b=first.segments[i],second=ring(b.x1+b.x2-300,b.y1+b.y2-300);
    const fused=mergeBenzene(first.vertices,first.segments,second.vertices,second.segments);
    assert.equal(fused.vertices.length,10);
    assert.equal(fused.segments.length,11);
    assert.equal(fused.segments.filter(b=>b.bondOrder===2).length,5);
    for(const v of fused.vertices) {
      const incident=fused.segments.filter(b=>Math.hypot(b.x1-v.x,b.y1-v.y)<.01||Math.hypot(b.x2-v.x,b.y2-v.y)<.01);
      assert(incident.reduce((n,b)=>n+b.bondOrder,0)<=4);
      assert(incident.filter(b=>b.bondOrder===2).length<=1);
    }
    const rings=detectAllRingsEnhanced(fused.segments,fused.vertices).filter(r=>r.bonds.length===6);
    assert.equal(rings.length,2);
    assert(rings.every(r=>r.bonds.filter(b=>b.bondOrder===2).length<=3));
    const repeated=mergeBenzene(fused.vertices,fused.segments,second.vertices,second.segments);
    assert.deepEqual(repeated,fused);
  }
});

import { validateStructure } from '../src/chemistry/validateStructure.js';

import { renderChemistryIssues } from '../src/rendering/ChemistryIssueRenderer.js';
test('chemistry diagnostics locate only the offending atom and clear after correction', async () => {
  const vertices=[{x:100,y:100},...Array.from({length:5},(_,i)=>({x:100+60*Math.cos(i*2*Math.PI/5),y:100+60*Math.sin(i*2*Math.PI/5)})),{x:500,y:500}];
  const segments=vertices.slice(1,6).map(v=>({x1:100,y1:100,x2:v.x,y2:v.y,bondOrder:1}));
  const issues=await validateStructure(buildMoleculeGraph({vertices,segments}));
  assert.equal(issues.length,1);assert.deepEqual(issues[0].targets,[{x:100,y:100,key:'100.00,100.00'}]);
  const arcs=[],texts=[];
  const ctx={save(){},restore(){},beginPath(){},stroke(){},fill(){},arc(...a){arcs.push(a)},fillText(...a){texts.push(a)}};
  renderChemistryIssues(ctx,issues,{x:20,y:30});
  assert.deepEqual(arcs[0].slice(0,3),[120,130,17]);assert.equal(texts[0][0],'1');
  assert.equal((await validateStructure(buildMoleculeGraph({vertices,segments:segments.slice(0,4)}))).length,0);
});

import { readFileSync } from 'node:fs';
import { calculatePartialCharges } from '../src/chemistry/partialCharges.js';
import { chargeSites } from '../src/rendering/ChargeAura.js';
const chargeFixtures=JSON.parse(readFileSync(new URL('./fixtures/partial-charges.json',import.meta.url)));
test('partial charges match independent RDKit fixtures and conserve molecular charge including hydrogens', async()=>{
  for(const graph of chargeFixtures.molecules){
    const parts=await calculatePartialCharges(graph);
    for(const part of parts){
      assert(!part.unavailable,`${graph.smiles}: ${part.unavailable}`);
      for(const atom of part.atoms){
        const ref=graph.atoms.find(a=>a.key===atom.key);
        assert(Math.abs(atom.atomCharge-ref.reference)<1e-8,graph.smiles);
        assert(Math.abs(atom.hydrogenCharge-ref.referenceH)<1e-8,graph.smiles);
      }
      const total=chargeSites(part).reduce((sum,a)=>sum+a.charge,0);
      assert(Math.abs(total-graph.atoms.reduce((sum,a)=>sum+a.charge,0))<1e-8,graph.smiles);
    }
  }
});
test('charge model separates unsupported molecules from neutral molecules and handles isolated ions',async()=>{
  const graph={atoms:[{key:'a',x:0,y:0,element:'Na',charge:1},{key:'b',x:200,y:0,element:'Fe',charge:0}],bonds:[]};
  const parts=await calculatePartialCharges(graph);
  assert.equal(parts[0].atoms[0].charge,1);assert(!parts[0].unavailable);assert(parts[1].unavailable);
});
test('charge view retains carbonyl polarity, carboxylate equivalence, and polar water regions',async()=>{
  const get=async smiles=>(await calculatePartialCharges(chargeFixtures.molecules.find(g=>g.smiles===smiles)))[0];
  const acetone=await get('CC(=O)C');
  const oxygen=acetone.atoms.findIndex(a=>a.element==='O');
  const bond=acetone.bonds.find(b=>b.from===oxygen||b.to===oxygen);
  assert(acetone.atoms[oxygen].atomCharge<0);
  assert(acetone.atoms[bond.from===oxygen?bond.to:bond.from].atomCharge>0);
  const acetate=(await get('CC(=O)[O-]')).atoms.filter(a=>a.element==='O');
  assert(Math.abs(acetate[0].atomCharge-acetate[1].atomCharge)<1e-8);
  const water=chargeSites(await get('O'));
  assert(water.some(a=>a.charge<0)&&water.some(a=>a.charge>0));
});

import { joinDoubleRail } from '../src/rendering/DoubleBondRenderer.js';
test('carbonyl double rails meet their adjacent branches at every rotation',()=>{
  for(const angle of [0,.4,1.7,Math.PI]){
    const rotate=p=>({x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle)});
    const branches=[rotate({x:60,y:30}),rotate({x:-60,y:30})];
    const segments=branches.map(p=>({x1:0,y1:0,x2:p.x,y2:p.y,bondOrder:1}));
    for(const side of [-1,1]){
      const actual=joinDoubleRail(rotate({x:5*side,y:0}),{x:0,y:0},rotate({x:0,y:-60}),segments);
      const expected=rotate({x:5*side,y:2.5});
      assert(Math.hypot(actual.x-expected.x,actual.y-expected.y)<1e-8);
    }
  }
});

import { chargeKernel } from '../src/rendering/ChargeAura.js';
test('charge surface has bounded influence and distant positive sites cannot tint a negative region',()=>{
  assert.equal(chargeKernel(48**2),0);assert.equal(chargeKernel(70**2),0);
  assert(chargeKernel(10**2)>chargeKernel(30**2));
  const local=chargeKernel(20**2)**2,remote=chargeKernel(60**2)**2;
  assert.equal((-.7*local+remote)/(local+remote),-.7);
});
