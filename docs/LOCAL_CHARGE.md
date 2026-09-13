# Local charge view

The View → Local charge toggle adds a translucent red–neutral–blue aura behind
molecules. Red means negative partial charge, blue positive. It updates after edits,
uses the same fixed color scale for every molecule (saturating at ±0.5 e), and does
not enter saved chemical data or image/vector exports.

## Calculation

Browser-side Gasteiger–Marsili partial equalization of orbital electronegativities
(PEOE), 12 iterations, using RDKit's published parameters. OpenChemLib supplies
ring perception and implicit hydrogen counts. Bonding environments determine atom
types. Equivalent terminal heteroatoms share formal-charge seeds for carboxylate
and nitro resonance. Every component conserves its total formal charge. Calculations
stay on the device.

Supported parameterization: H, C, N, O, F, Cl, Br, I in supported bonding environments,
plus isolated formally charged ions. Unsupported elements in bonded structures,
radicals, custom labels, collapsed abbreviations, and invalid valence receive a
clearly marked unavailable outline, not a claimed neutral charge prediction.

This is an empirical 2D partial-charge visualization, not a quantum calculation,
electron-density map, or 3D electrostatic potential surface. Charges depend on the
drawn protonation and resonance state. No solvent, pH, conformer, or polarization
calculation is performed. Extended conjugation is approximate. Formal charge and
partial atomic charge need not have the same sign.

## Rendering

Compact-support blending creates continuous local regions on a fixed charge scale, with a bounded contour and a translucent fill. Each site has zero influence beyond 48 drawing units (the standard bond is 60 units); more localized color weights suppress distant charge tinting. Achromatic height-field lighting creates rounded highlights and shaded edges without changing charge signs. A linear color response keeps small charges near neutral, with gradual transitions between negative and positive regions.
Implicit hydrogen charges use illustrative nearby 2D sites in free angles; these
are visualization positions, not predicted geometry. Consequently a neutral polar
molecule can still have both red and blue areas. Layers are rasterized only when
charges change and reused during pan/zoom. Structure strokes remain above the aura.

## Validation and sources

`draw/tests/fixtures/partial-charges.json` contains independently computed reference
values from RDKit 2026.03.6. Tests compare both atom and implicit-hydrogen charges
within 1e-8 e for 25 fixtures, including carbonyls, C–F, acetate, ammonium, quaternary
ammonium, nitro, amide, aromatic molecules, nitrile, chloride, and water. Tests also
check total charge and unsupported components. Browser tests exercise multiple
molecules, visible red/blue regions, and toggling without modifying chemical data.

- [RDKit partial-charge API](https://www.rdkit.org/docs/source/rdkit.Chem.rdPartialCharges.html)
- [RDKit algorithm](https://github.com/rdkit/rdkit/blob/master/Code/GraphMol/PartialCharges/GasteigerCharges.cpp)
- [RDKit parameters](https://github.com/rdkit/rdkit/blob/master/Code/GraphMol/PartialCharges/GasteigerParams.cpp)
- Gasteiger & Marsili, Tetrahedron 36 (1980), 3219–3228, DOI: 10.1016/0040-4020(80)80168-2.

The adapted algorithm/parameters retain the BSD-3-Clause notice distributed at
`draw/public/licenses/rdkit.txt` (built site: `/draw/licenses/rdkit.txt`).

## Fluorine versus hydroxyl audit

Independent RDKit 2026.03.6 calculations agree with the browser implementation
within 1e-8 e on all 25 reference structures, including these added comparisons:

| Environment | Atom | Gasteiger charge (e) |
| --- | --- | ---: |
| Methanol, CO | O | −0.399630 |
| Fluoroethane, CCF | F | −0.251413 |
| HO–CH₂–CH₂–F, OCCF | O | −0.393661 |
| HO–CH₂–CH₂–F, OCCF | F | −0.248581 |
| Fluoride, [F-] | F | −1.000000 |
| Hydroxide, [OH-] | O | −0.869681 |

Thus an OH oxygen being more negative than bonded fluorine is consistent with this
model. Electronegativity does not directly set the plotted color. Partial charges
are model-dependent estimates, and numerical agreement with RDKit validates the
implementation, not universal physical accuracy or an experimental charge value.
Lighting and nearby-site interpolation also affect apparent surface brightness.

A standalone neutral F receives one implicit H (HF), not a fluoride charge. A
standalone neutral O receives two implicit H atoms (water). Explicit negative
formal charges are required for fluoride/hydroxide; an arbitrary text label OH
is not a substitute for a chemically specified atom and charge.

Regenerate the reference data with `draw/scripts/verify-charge-reference.py` in a
Python environment containing RDKit, then run `npm run test:chemistry` in `draw`.
RDKit is only a test dependency here; the browser runs the validated JS adaptation.
