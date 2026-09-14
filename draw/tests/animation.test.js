import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyAnimation,carbonylExample,exampleFlows,proposeStep,lonePairCount,components} from '../src/animation/model.js';
import {normalizeDoc,contentFingerprint,isDocEmpty} from '../src/lib/docModel.js';
import {drawingToScene} from '../src/animation/importDrawing.js';
import {graphToDrawing} from '../src/chemistry/graphToDrawing.js';
import {smilesToGraph} from '../src/chemistry/importStructure.js';
import {frameAt} from '../src/animation/export.js';

test('carbonyl addition and elimination conserve atoms, formal charge, and electron pairs',()=>{
  const initial=carbonylExample(),copy=JSON.stringify(initial),added=proposeStep(initial,exampleFlows(0),['O3']).scene;
  assert.equal(JSON.stringify(initial),copy,'Proposal mutated starting structure');
  assert.deepEqual(added.atoms.map(a=>a.id),initial.atoms.map(a=>a.id));
  assert.equal(added.atoms.find(a=>a.id==='O1').charge,-1);assert.equal(lonePairCount(added,'O1'),3);
  assert.equal(added.atoms.find(a=>a.id==='O3').charge,0);assert.equal(lonePairCount(added,'O3'),2);
  assert.equal(added.bonds.find(b=>b.id==='B1').order,1);
  assert(added.bonds.some(b=>[b.from,b.to].includes('O3')));
  assert.equal(components(added).length,1);
  const end=proposeStep(added,exampleFlows(1),[]).scene;
  assert.equal(end.bonds.find(b=>b.id==='B1').order,2);assert(!end.bonds.some(b=>b.id==='B3'));
  assert.equal(end.atoms.find(a=>a.id==='O2').charge,-1);assert.equal(end.atoms.find(a=>a.id==='O1').charge,0);
  assert.equal(components(end).length,2);
  for(const scene of [initial,added,end]){
    assert.equal(scene.atoms.reduce((n,a)=>n+a.charge,0),-1);
    assert.equal(scene.bonds.reduce((n,b)=>n+b.order,0)+scene.atoms.reduce((n,a)=>n+lonePairCount(scene,a.id),0),12);
  }
});
test('incomplete carbonyl attack and impossible electron sources are rejected',()=>{
  assert.throws(()=>proposeStep(carbonylExample(),[exampleFlows()[0]],['O3']),/valence/);
  assert.throws(()=>proposeStep(carbonylExample(),[{source:{kind:'pair',id:'C1'},target:{kind:'atom',id:'O3'}}]),/lone pairs/);
  assert.throws(()=>proposeStep(carbonylExample(),[{source:{kind:'bond',id:'B1'},target:{kind:'atom',id:'O3'}}]),/own atoms/);
});
test('animation payloads normalize, fingerprint and round-trip without losing steps or IDs',()=>{
  const doc={...emptyAnimation(),initial:carbonylExample(),steps:[{id:'step1',flows:exampleFlows(),after:proposeStep(carbonylExample(),exampleFlows(),['O3']).scene}],draftFlows:[],reactingIds:[]};
  assert(!isDocEmpty(doc));assert(isDocEmpty(emptyAnimation()));
  assert.deepEqual(normalizeDoc(JSON.parse(JSON.stringify(doc))),doc);
  const edited=structuredClone(doc);edited.steps[0].after.atoms[0].charge=1;
  assert.notEqual(contentFingerprint(doc),contentFingerprint(edited));
  assert.equal(frameAt(doc,0).progress,0);assert.equal(frameAt(doc,6.5).progress,1);
});
test('drawing import preserves proton counts and formal charges for animation',async()=>{
  const scene=await drawingToScene(graphToDrawing(await smilesToGraph('CC(=O)OC.[OH-]')));
  const oxygen=scene.atoms.find(a=>a.element==='O'&&a.charge===-1);
  assert.equal(oxygen.hydrogens,1);assert.equal(lonePairCount(scene,oxygen.id),3);
  assert.equal(components(scene).length,2);
});

test('step compilation derives every starting structure and rejects stale downstream products',async()=>{
  const {compileSequence,prepareAnimation,newStep,completedAnimation}=await import('../src/animation/sequence.js');
  const doc=prepareAnimation({...emptyAnimation(),initial:carbonylExample()});
  doc.steps[0].flows=exampleFlows(0);doc.steps[0].reactingIds=['O3'];
  doc.steps.push({...newStep(1),flows:exampleFlows(1)});
  const compiled=compileSequence(doc.initial,doc.steps);
  assert.deepEqual(compiled[1].before,compiled[0].after);
  assert.equal(compiled[1].before.atoms.find(a=>a.id==='O1').charge,-1);
  assert.equal(compiled[1].before.bonds.filter(b=>b.from==='C1'||b.to==='C1').length,4);
  const saved=completedAnimation(doc);
  saved.steps[0].flows.pop();
  const invalid=compileSequence(saved.initial,saved.steps);
  assert.equal(invalid[1].before,null);assert.equal(invalid[1].after,null);
  assert.throws(()=>completedAnimation(saved),/Step 1/);
});
test('starting-structure editor roundtrip preserves atom and bond identities',async()=>{
  const {sceneToDrawing}=await import('../src/animation/sceneDrawing.js');
  const scene=carbonylExample();
  const result=await drawingToScene(sceneToDrawing(scene),scene);
  assert.deepEqual(new Set(result.atoms.map(a=>a.id)),new Set(scene.atoms.map(a=>a.id)));
  assert.deepEqual(new Set(result.bonds.map(a=>a.id)),new Set(scene.bonds.map(a=>a.id)));
  assert.equal(result.atoms.find(a=>a.id==='O3').hydrogens,1);
});
test('shared drawing renderer receives two dots for every chemical lone pair',async()=>{
  const {sceneToDrawing}=await import('../src/animation/sceneDrawing.js');
  const {calculateSmartPositioning}=await import('../src/utils/LonePairPositioning.js');
  const initial=carbonylExample(),intermediate=proposeStep(initial,exampleFlows(0),['O3']).scene;
  for(const scene of [initial,intermediate,proposeStep(intermediate,exampleFlows(1)).scene]){
    const drawing=sceneToDrawing(scene);
    for(const atom of scene.atoms){
      const data=drawing.vertexAtoms[`${atom.x.toFixed(2)},${atom.y.toFixed(2)}`];
      const electrons=2*lonePairCount(scene,atom.id);
      assert.equal(data?.lonePairs||0,electrons);
      if(data){const layout=calculateSmartPositioning(atom,drawing.segments,drawing.vertexAtoms,data.lonePairs,data.charge);
        assert.equal(layout.lonePairPositions.reduce((sum,p)=>sum+p.dotCount,0),electrons);}
    }
  }
});
