"""Regenerate independent charge fixtures using Python RDKit; not an app dependency.
Run: /path/to/rdkit/python draw/scripts/verify-charge-reference.py
"""
import json
from pathlib import Path
from rdkit import Chem, rdBase
from rdkit.Chem import AllChem

path = Path(__file__).resolve().parents[1] / 'tests/fixtures/partial-charges.json'
previous = json.loads(path.read_text())
fixtures = []
for entry in previous['molecules']:
    smiles = entry['smiles']
    molecule = Chem.MolFromSmiles(smiles)
    AllChem.Compute2DCoords(molecule)
    AllChem.ComputeGasteigerCharges(molecule, nIter=12, throwOnParamFailure=True)
    atoms = []
    for atom in molecule.GetAtoms():
        point = molecule.GetConformer().GetAtomPosition(atom.GetIdx())
        x, y = point.x * 40, point.y * 40
        atoms.append(dict(key=f'{x:.2f},{y:.2f}', x=x, y=y,
                          element=atom.GetSymbol(), charge=atom.GetFormalCharge(),
                          reference=float(atom.GetProp('_GasteigerCharge')),
                          referenceH=float(atom.GetProp('_GasteigerHCharge'))))
    Chem.Kekulize(molecule)
    bonds = [{'from': b.GetBeginAtomIdx(), 'to': b.GetEndAtomIdx(),
              'order': int(b.GetBondTypeAsDouble())} for b in molecule.GetBonds()]
    fixtures.append(dict(smiles=smiles, atoms=atoms, bonds=bonds))
path.write_text(json.dumps(dict(rdkit=rdBase.rdkitVersion, molecules=fixtures), indent=2) + '\n')
print(f'Generated {len(fixtures)} reference structures with RDKit {rdBase.rdkitVersion}.')
