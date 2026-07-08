# Feature implementation roadmap

This document describes **recommended order** and **concrete first steps** for evolving the OpenReactions draw tool toward the usability and depth of tools like ChemAxon Marvin—while staying focused on a **friendly, approachable** molecule builder.

It assumes the current stack: **React**, **Canvas** rendering (`HexGridWithToolbar.jsx` and related renderers), **vertices + segments** as the core graph, and **history/undo** where already implemented.

---

## Principles (apply to every phase)

1. **Separate “model” from “view”**  
   Long term, treat the molecular graph (atoms, bonds, orders, charges, stereo flags) as a **serializable data model**. Canvas coordinates are one projection of that model. Interchange formats (SMILES, Molfile) operate on the model, not on raw pixels.

2. **Add interchange before heavy cheminformatics**  
   Once you can round-trip **SMILES or Molfile**, you can lean on libraries for validation, layout, and name generation instead of building everything from scratch.

3. **Ship vertical slices**  
   For each feature: minimal UI → works end-to-end → polish. Avoid half-finished toolbars with no behavior.

4. **Measure “friendly”**  
   Time-to-first-structure, error clarity, and undo behavior matter as much as feature count.

---

## Phase order (summary)

| Order | Theme | Why this order |
|------|--------|----------------|
| 1 | **Templates & keyboard shortcuts** | Fast payoff; uses existing bond/vertex machinery; trains users. |
| 2 | **Stereochemistry (wedges, dashes, basics)** | Core organic drawing expectation; touches bond representation and rendering. |
| 3 | **SMILES / Molfile (and optional InChI) I/O** | Unlocks libraries, search, and collaboration; defines a stable “source of truth.” |
| 4 | **Chemistry checks & cleanup** | Makes the app feel “smart”; depends on having a clear model (helped by Phase 3). |
| 5 | **Export quality (SVG, high-res PNG, PDF)** | Publication and slides; often requested once drawing works. |
| 6 | **Reaction mapping & scheme polish** | Builds on arrows and structures; important for reaction-centric users. |
| 7 | **Query / Markush / R-groups** | Niche for teaching; critical for search/pharma—defer until audience needs it. |
| 8 | **Biomolecules / polymers** | Separate workflows; optional vertical. |
| 9 | **3D view or export** | Large effort; add when 2D workflow is solid. |

Below: **how to start** each phase in this codebase.

---

## Phase 1 — Templates & keyboard shortcuts

### Goals

- One-click **ring templates** (e.g. benzene, cyclohexane—you already have ring presets; extend and unify).
- **Chain tools** or repeated “add CH₂” style actions.
- **Keyboard map**: digit/letter → element, or shortcuts for common templates.

### How to begin

1. **Inventory** existing ring and bond code in `HexGridWithToolbar.jsx` and any `SnapUtils` / ring helpers. List what is already parameterized (radius, atom count).
2. **Define a `Template` type** (even if only in a new module):  
   `{ id, label, vertices: [...], segments: [...], defaultOffset }` in **world coordinates** or as **graph relative** positions then placed at click point.
3. **Placement flow**: user picks template → click on canvas → **merge** template vertices/segments into state, **snap** to grid if that is your convention, **push history** before mutate.
4. **Shortcuts**: a single `useEffect` or centralized `onKeyDown` that, in draw mode, maps keys to `insertTemplate('benzene')` without conflicting with existing shortcuts (document conflicts in the same file).

### Acceptance criteria

- [ ] At least 3 templates work with one click + place.
- [ ] Undo restores pre-template state.
- [ ] No duplicate vertices when placing adjacent to existing structure (optional follow-up: merge nearby vertices).

### Files likely involved

- `draw/src/HexGridWithToolbar.jsx` (toolbar, placement)
- New: `draw/src/templates/` or `draw/src/data/templates.js`

---

## Phase 2 — Stereochemistry

### Goals

- **Wedge** and **dashed** bonds (and “plain” single bond).
- Optional: **stereo “any”** or ambiguous center markers later.

### How to begin

1. **Extend segment/bond data** with `stereo: 'none' | 'wedge' | 'dash' | 'either'` (names flexible). Default `'none'` for backward compatibility.
2. **Rendering**: in `StereochemistryRenderer.js` or bond draw path, branch on `stereo` and draw filled wedge or dashed line; reuse existing line geometry.
3. **Interaction**: bond context menu or toolbar toggle “cycle stereo on selected bond”; or click bond + key (e.g. `w`).
4. **Export**: wedge/dash must appear in **Molfile** bond block when you add Phase 3; plan field mapping early.

### Acceptance criteria

- [ ] At least one wedge and one dashed bond render correctly after save/load in your internal format.
- [ ] Document how stereo maps to Molfile bond stereo when Phase 3 lands.

### Files likely involved

- `draw/src/rendering/StereochemistryRenderer.js`
- Bond creation / selection handlers in `HexGridWithToolbar.jsx`

---

## Phase 3 — SMILES / Molfile interchange

### Goals

- **Export** selection or full canvas to **SMILES** and **Molfile** (V2000 is fine to start).
- **Import** paste or file open: string → graph → your `vertices` / `segments` (and atoms map).

### How to begin

1. **Choose a library** (evaluate license and bundle size for browser):
   - **OpenChemLib** (Java port to JS exists), **RDKit** (WASM builds exist), **Ketcher**-style stacks, or lighter **smiles-only** parsers if Molfile is deferred.
2. **Implement a thin adapter** `graphToMolfile(graph)` / `molfileToGraph(text)` so the rest of the app does not depend on library internals.
3. **Canonical internal graph**: decide mapping from:
   - atoms: `vertexAtoms` + coordinates
   - bonds: order (single/double/triple/aromatic), stereo from Phase 2
4. **UI**: “Copy as SMILES”, “Paste SMILES” in toolbar or **Cmd+Shift+V**; show parse errors inline (friendly message).

### Risks

- Aromaticity and implicit H differ between tools; start with **Kekulé** export if needed, then improve.
- Large structures: test Web Worker for parse/layout if UI freezes.

### Acceptance criteria

- [ ] Round-trip a simple alkane and a simple aromatic ring through SMILES or Molfile with coordinates preserved within tolerance.
- [ ] Failed paste shows a clear error, does not corrupt state.

### New files

- `draw/src/chemistry/` — `smilesAdapter.js`, `molfileAdapter.js`, or wrappers around chosen library

---

## Phase 4 — Chemistry checks & 2D cleanup

### Goals

- **Valence warnings** (over/under valence), optional **charge** suggestions.
- **Clean layout**: redistribute coordinates (could call library “generate coords” from SMILES/Molfile as a first version).

### How to begin

1. After Phase 3, run the library’s **sanitization** or **valence check** on the graph or SMILES.
2. **Overlay**: non-modal warnings on atoms/bonds (color halo or sidebar list)—avoid blocking dialogs for every keystroke.
3. **Cleanup button**: “Tidy structure” → internal graph → library 2D coords → update `vertices` (and history).

### Acceptance criteria

- [ ] Obvious illegal valence is flagged.
- [ ] Cleanup improves collision-heavy drawings without destroying user intent (offer undo).

---

## Phase 5 — Export quality (SVG, PNG, PDF)

### Goals

- **Vector SVG** for slides and papers.
- **High-DPI PNG** (you already have export paths—unify and document resolution).
- **PDF** optional (often via print-to-PDF from browser or a small server step).

### How to begin

1. **SVG**: either serialize canvas paths / graph to SVG elements, or use **canvas → blob** approaches; for text labels, ensure fonts are embedded or outlined.
2. **Single entry point** `exportDiagram({ format, dpi })` used by toolbar and keyboard shortcut.

### Acceptance criteria

- [ ] SVG opens in Illustrator/Inkscape without broken text.
- [ ] PNG at 2× or 4× is crisp for projector use.

### Files likely involved

- `draw/src/utils/cleanExportCanvas.js` (extend)

---

## Phase 6 — Reaction mapping & scheme polish

### Goals

- **Atom map numbers** (1, 2, 3…) on reagents and products for reactions.
- Optional: **+** reagents, conditions line, multi-step arrow layout.

### How to begin

1. **Data model**: `mapNumber` on vertices (or per-reaction scope) when in “reaction mode.”
2. **Rendering**: small number near atom without colliding with labels.
3. **Export**: include mapping in reaction SMILES / RXN if library supports it.
4. Build on existing **arrows** and **selection** behavior.

### Acceptance criteria

- [ ] User can assign and clear map numbers on selected atoms.
- [ ] Copy/paste or export preserves mapping where format allows.

---

## Phase 7 — Query features & R-groups

### Goals

- **Generic atoms**, lists, counts (for substructure search).
- **R-group** labels and attachment points.

### How to begin

1. Only after **Phase 3** is stable—queries are a superset of graph representation.
2. Extend atom model with `queryType` / `elementList` per Marvin-like semantics.
3. **Rendering**: distinct style (e.g. “Q”, “M”, list in tooltip).
4. **Export**: SMILES with query extensions is limited; **Molfile query** or **SMARTS** may be the real target—coordinate with library.

### Note

Defer if your users are primarily students; prioritize Phases 1–4 first.

---

## Phase 8 — Biomolecules & polymers

### Goals

- Amino acid / nucleotide shortcuts, peptide bonds, repeating units.

### How to begin

1. **Template packs** (Phase 1) for each residue.
2. **Special bond rules** (backbone direction)—often easier as guided “insert next residue” wizard than free drawing.

---

## Phase 9 — 3D

### Goals

- Generate 3D coordinates from 2D, or viewer for conformer.

### How to begin

1. **RDKit / OCL** in WASM for embed or **server API** for heavy workloads.
2. **Separate view** (Three.js / Mol*) with clear “2D is source of truth” or explicit sync rules.

---

## Suggested sequencing of work in the repo

1. Create `docs/` decisions file or ADR when choosing cheminformatics library (Phase 3).
2. Extract **template** and **keyboard** modules from `HexGridWithToolbar.jsx` as they grow—file size is already a maintainability concern.
3. Add **feature flags** (e.g. `import.meta.env.VITE_ENABLE_SMILES`) so unfinished phases can merge safely.

---

## Quick reference: Marvin-like checklist

| Capability | Suggested phase |
|------------|-----------------|
| Ring/chain templates, hotkeys | 1 |
| Wedges / dashes | 2 |
| SMILES / Molfile I/O | 3 |
| Valence / cleanup | 4 |
| Print-quality export | 5 |
| Atom mapping | 6 |
| SMARTS / query / R-group | 7 |
| Peptides / polymers | 8 |
| 3D | 9 |

---

*Last updated for MVP follow-on planning. Adjust order if your primary users are informatics-heavy (move Phase 3 earlier) or education-heavy (extend Phases 1–2 before Phase 3).*
