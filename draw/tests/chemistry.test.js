import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOCL } from '../src/chemistry/ocl.js';
import { smilesToGraph } from '../src/chemistry/importStructure.js';
import { graphToSmiles } from '../src/chemistry/exportStructure.js';
import { buildMoleculeGraph, splitComponents } from '../src/chemistry/moleculeGraph.js';

for (const smiles of ['N[C@@H](C)C(=O)O', 'N[C@H](C)C(=O)O', 'F/C=C/F', 'F/C=C\\F', 'C[C@H](O)[C@@H](N)C(=O)O']) {
  test(`stereochemistry survives canvas round trip: ${smiles}`, async () => {
    const OCL = await loadOCL();
    const imported = await smilesToGraph(smiles);
    const vertices = imported.atoms.map(a => ({ x: +a.x.toFixed(2), y: +a.y.toFixed(2) }));
    const segments = imported.bonds.map(b => ({ x1: vertices[b.from].x, y1: vertices[b.from].y, x2: vertices[b.to].x, y2: vertices[b.to].y, bondOrder: b.order, bondType: b.bondType }));
    const vertexAtoms = Object.fromEntries(imported.atoms.map((a, i) => [`${vertices[i].x.toFixed(2)},${vertices[i].y.toFixed(2)}`, { symbol: a.element, charge: a.charge }]));
    const graph = buildMoleculeGraph({ vertices, segments, vertexAtoms });
    const { smiles: actual } = await graphToSmiles(splitComponents(graph)[0]);
    assert.equal(OCL.Molecule.fromSmiles(actual).getIDCode(), OCL.Molecule.fromSmiles(smiles).getIDCode());
  });
}

import { tidyStructure } from '../src/chemistry/tidyStructure.js';
test('tidy regularizes bonds and retains stereochemistry, labels, and reaction arrows', async () => {
  const OCL = await loadOCL();
  const input = 'N[C@@H](C)C(=O)O';
  const g = await smilesToGraph(input);
  const vertices = g.atoms.map(a => ({ x: +(a.x * 1.7 + 300).toFixed(2), y: +(a.y * 0.8 + 250).toFixed(2) }));
  const doc = { vertices, segments: g.bonds.map(b => ({ x1: vertices[b.from].x, y1: vertices[b.from].y, x2: vertices[b.to].x, y2: vertices[b.to].y, bondOrder: b.order, bondType: b.bondType })), vertexAtoms: Object.fromEntries(g.atoms.map((a, i) => [`${vertices[i].x.toFixed(2)},${vertices[i].y.toFixed(2)}`, { symbol: a.element, charge: a.charge }])), arrows: [{ type: 'forward', x: 700, y: 250 }], newmanInstances: [] };
  const result = await tidyStructure(doc);
  assert.deepEqual(result.arrows, doc.arrows);
  assert.equal(result.vertices.length, doc.vertices.length);
  for (const b of result.segments) assert(Math.abs(Math.hypot(b.x2 - b.x1, b.y2 - b.y1) - 60) < 0.1);
  const { smiles } = await graphToSmiles(buildMoleculeGraph(result));
  assert.equal(OCL.Molecule.fromSmiles(smiles).getIDCode(), OCL.Molecule.fromSmiles(input).getIDCode());
});

import { transformSelection, alignReaction } from '../src/utils/arrangeDocument.js';
test('rotation and reflection retain atom metadata and stereochemical identity', async () => {
  const OCL = await loadOCL();
  const input = 'N[C@@H](C)C(=O)O';
  const g = await smilesToGraph(input);
  const vertices = g.atoms.map(a => ({ x: +a.x.toFixed(2), y: +a.y.toFixed(2) }));
  const doc = { vertices, segments: g.bonds.map(b => ({ x1: vertices[b.from].x, y1: vertices[b.from].y, x2: vertices[b.to].x, y2: vertices[b.to].y, bondOrder: b.order, bondType: b.bondType })), vertexAtoms: Object.fromEntries(g.atoms.map((a, i) => [`${vertices[i].x.toFixed(2)},${vertices[i].y.toFixed(2)}`, { symbol: a.element, charge: a.charge }])), arrows: [] };
  const selected = new Set(vertices.map(v => `${v.x.toFixed(2)},${v.y.toFixed(2)}`));
  for (const action of ['rotate-left', 'rotate-right', 'flip-horizontal', 'flip-vertical']) {
    const result = transformSelection(doc, selected, action);
    const { smiles } = await graphToSmiles(buildMoleculeGraph(result));
    assert.equal(OCL.Molecule.fromSmiles(smiles).getIDCode(), OCL.Molecule.fromSmiles(input).getIDCode());
  }
});
test('reaction alignment moves whole molecules and centers the arrow', () => {
  const doc = { vertices: [{ x: 0, y: 10 }, { x: 60, y: 10 }, { x: 400, y: 90 }, { x: 460, y: 90 }], segments: [{ x1: 0, y1: 10, x2: 60, y2: 10, bondOrder: 1 }, { x1: 400, y1: 90, x2: 460, y2: 90, bondOrder: 1 }], vertexAtoms: {}, arrows: [{ x: 200, y: 40, length: 80, angle: 0 }] };
  const result = alignReaction(doc, 'space');
  assert.equal(result.vertices[0].y, result.vertices[2].y);
  assert(Math.abs(result.arrows[0].y - result.vertices[0].y) < 0.01);
  assert.equal(result.vertices[1].x - result.vertices[0].x, 60);
  assert.equal(result.arrows[0].x - 40 - result.vertices[1].x, 90);
});

import { validateStructure } from '../src/chemistry/validateStructure.js';
import { importChemicalFile, exportChemicalFile } from '../src/chemistry/fileFormats.js';
test('chemical checks flag overbonded carbon but accept ammonium', async () => {
  const graph = { atoms: [{ element: 'C', charge: 0 }, ...Array.from({ length: 5 }, () => ({ element: 'F', charge: 0 }))], bonds: Array.from({ length: 5 }, (_, i) => ({ from: 0, to: i + 1, order: 1 })) };
  assert((await validateStructure(graph)).some(i => i.message.includes('exceeds')));
  assert.equal((await validateStructure(await smilesToGraph('[NH4+]'))).length, 0);
});
test('MOL, SDF, and RXN export/import preserve structure counts', async () => {
  const doc = { vertices: [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 300, y: 0 }, { x: 360, y: 0 }], segments: [{ x1: 0, y1: 0, x2: 60, y2: 0, bondOrder: 1 }, { x1: 300, y1: 0, x2: 360, y2: 0, bondOrder: 1 }], vertexAtoms: {}, arrows: [{ type: 'forward', x: 180, y: 0, angle: 0 }] };
  for (const extension of ['mol', 'sdf', 'rxn']) {
    const text = await exportChemicalFile(doc, extension);
    const graph = await importChemicalFile(text, 'test.' + extension);
    assert.equal(graph.atoms.length, 4);
    assert.equal(graph.bonds.length, 2);
    assert.equal(graph.arrows.length, extension === 'rxn' ? 1 : 0);
  }
});

import { contractAbbreviation } from '../src/chemistry/contractAbbreviation.js';
import { graphToDrawing } from '../src/chemistry/graphToDrawing.js';
test('contracting benzene to Ph preserves chemistry and rejects incorrect abbreviations', async () => {
  const doc = { ...graphToDrawing(await smilesToGraph('c1ccccc1')), arrows: [] };
  const selected = new Set(doc.vertices.map(v => `${v.x.toFixed(2)},${v.y.toFixed(2)}`));
  const next = await contractAbbreviation(doc, selected, 'Ph');
  assert.equal(next.vertices.length, 1);
  assert.equal(Object.values(next.vertexAtoms)[0].symbol, 'Ph');
  await assert.rejects(() => contractAbbreviation(doc, selected, 'Me'), /does not match/);
});

for (const input of ['[13CH3]CO', '[CH3]']) {
  test(`isotopes and radicals survive drawing and MOL exchange: ${input}`, async () => {
    const OCL = await loadOCL();
    const doc = graphToDrawing(await smilesToGraph(input));
    const original = OCL.Molecule.fromSmiles(input).getIDCode();
    const roundTrip = await graphToSmiles(buildMoleculeGraph(doc));
    assert.equal(OCL.Molecule.fromSmiles(roundTrip.smiles).getIDCode(), original);
    const mol = await exportChemicalFile(doc, 'mol');
    const imported = await importChemicalFile(mol, 'structure.mol');
    const result = await graphToSmiles(buildMoleculeGraph(graphToDrawing(imported)));
    assert.equal(OCL.Molecule.fromSmiles(result.smiles).getIDCode(), original);
  });
}
