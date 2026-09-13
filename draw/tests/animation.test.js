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
