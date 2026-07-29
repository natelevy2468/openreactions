# OpenReactions — Improvement Plan

Working toward ChemDraw-quality output with Marvin-like ease of use. This file
tracks ideas and status. Checked = done & verified.

## Priority focus (from Nathan, 2026-07-09)

### 1. Perfect molecule graphics (no visual defects)
The drawn structures must look clean and correct — this is the top priority.
- [ ] No accidental overlapping bonds (two bonds drawn on top of each other)
- [ ] No bond extensions / overshoot past a vertex or atom label
- [x] Double/triple bonds: even spacing, correct inner-line side, clean ends
- [x] Bonds stop cleanly at atom labels (no line poking through letters)
- [x] FIXED: ring double bond touching a heteroatom label (e.g. O in a pyran/
      pyrylium) was falling back to the symmetric two-equal-lines style instead of
      the offset inner line. Root cause: the bond is clipped back to clear the atom
      label, and findBondRing compared the *clipped* coords to the ring's full-length
      bond coords → no match → non-ring branch. Fix: renderDoubleBondByCase now takes
      a `geomBond` (untrimmed) for ALL topology decisions (ring membership, interior
      direction, substitution counts) and only draws with the clipped coords.
      Verified pyrylium + 2-aminopyrylium render all ring double bonds correctly;
      acyclic C=O carbonyl still correctly symmetric (no regression).
- [ ] Vertices merge cleanly when atoms land on top of each other (no doubles)
- [ ] Ring templates fuse to existing bonds without stray/duplicate segments
- [ ] Consistent bond length & angle after snapping
- [ ] Stereo (wedge/dash) render crisply and taper correctly

### 2. Undo/redo fully functional
- [x] Fixed off-by-one undo bug + added redo (session 1)
- [ ] Re-verify undo/redo across ALL operation types (draw bond, ring, atom label,
      charge, lone pair, arrow, arrow text, delete, move, paste)

### 3. Zoom in / zoom out control (bottom-right) — DONE
- [x] Add +/− zoom buttons (and a % / reset) near the Export button
- [x] Wheel zoom (plain=pan, ctrl/cmd+wheel=zoom toward cursor) drives same state
- [x] Zoom keeps the viewport center fixed; vector redraw stays crisp
- [x] Fixed accumulation bug: rapid +/− clicks now compound (were reading stale
      scale from the render closure → only ever advanced one step). Now go through
      applyZoom(computeRaw) which reads/writes scale+offset via refs synchronously.
- [x] Atom-input box, arrow-label overlay, and export crop all corrected for zoom.
- [x] Middle `%` button is now "Fit drawing to screen" (fitToContent): scales the
      whole structure to fit with margin (caps at 100%) and centers it. Empty
      canvas → resets to 100%.

## Done so far (earlier sessions)
- [x] Undo/redo rewrite + Redo button (was off-by-one; one undo deleted two acts)
- [x] Delete/Backspace removes selection
- [x] Expanded single-letter element quick-keys
- [x] Modularized toolbar into components/ToolButton.jsx + ToolPalette.jsx (~1k lines out)
- [x] Reagent/condition text on reaction arrows (double-click arrow)
- [x] Export crop includes arrow labels
- [x] Keyboard tool shortcuts (D/E/M/T/A/Q/R/L/G/J, 3–6, Esc) + About reference
- [x] Reaction "+" between reactants (fixed parseAtomInput + input filter)

## File-size reduction (the "7000-line file")
- [x] ToolPalette + ToolButton + CurvedArrowIcons extracted (earlier)
- [x] AboutPopup.jsx extracted (~113 lines out)
- [x] ExportPopup.jsx extracted (~216 lines out)
- [x] SettingsDropdown.jsx extracted (~232 lines out, purely presentational props)
- HexGridWithToolbar.jsx: 6048 → 5511 lines this session (all dialogs verified
  rendering identically via CDP; build + diag clean).
- [ ] Next candidates: drawCanvas (~1100 lines) and handleCanvasClick (~1200 lines)
      are the big logic blobs but close over lots of state → riskier, need a
      params/context strategy rather than a straight cut.

## Molecule info + bond cycling (2026-07-10)
- [x] "Info" button top-right → dropdown with molecular formula (subscripted),
      molecular weight, monoisotopic mass, heavy-atom count, ring count. Computed
      via OpenChemLib (graphToFormula in chemistry/exportStructure.js), lazily &
      live only while open. Verified: aspirin → C9H8O4, 180.16 g/mol, 13 atoms, 1 ring.
- [x] Draw-mode click on a bond now CYCLES order 1→2→3→1 (was only 1→2, dead-end).
      Matches ChemDraw/Marvin; misclicks recoverable without Undo. Verified 2→3→1→2.

## Visual-bug sweep results (2026-07-10) — all verified clean via SMILES import
- Ring double bonds adjacent to heteroatom (pyrylium, 2-aminopyrylium): FIXED, offset inner line.
- Fused rings (naphthalene): shared bond single, each double offsets to its own ring center. ✓
- Acyclic carbonyl C=O (acetone), carboxylate C(=O)O⁻ (acetate): symmetric equal lines + charge. ✓
- Triple bonds (nitrile CC#N, but-2-yne): center line full length, 2 flanking lines span the
  triple-bond segment, symmetric. ✓ (the "asymmetry" was just colinear single bonds extending it)
- Atom-label clipping: bonds stop cleanly before letters at every zoom. ✓

## Superatom / abbreviation groups (2026-07-10) — DONE
- [x] `chemistry/abbreviations.js`: ~55 common groups → SMILES fragments (attachment =
      fragment atom 0). Alkyl (Me/Et/iPr/tBu…), aryl (Ph/Bn/Tol), acyl (Ac/Bz/Boc/Cbz/
      Piv), sulfonyl (Ts/Ms/Tf), oxy (OMe/OEt/OAc/OtBu/OTs…), N (NH2/NMe2/NO2/N3/NHBoc…),
      C-groups (CN/CF3/CO2H/CO2Me…), S/Si (SMe/TMS/TBS). Case-insensitive + hyphen-tolerant lookup.
- [x] Expansion in `graphToOCLMolecule` (exportStructure.js): a labeled vertex whose text is
      a known abbreviation is replaced by its fragment atoms, parent bonds attach to atom 0,
      OCL drops the right implicit H. Benefits BOTH molecular formula/weight AND SMILES export.
- [x] Info-panel heavy-atom count now post-expansion (Ph counts as 6 C, not 1 vertex).
- [x] Atom input no longer force-uppercases (was breaking "OMe"→"OME"); capitalizes only the
      first letter, preserves the rest, and canonicalizes a recognized abbrev on commit ("ome"→"OMe").
- [x] About popup lists example abbreviations for discoverability.
- Verified: Ph→C6H6; Ph+CO2H→C7H6O2 (122.12); Ph+OMe→C7H8O; Ph+NO2→C6H5NO2; N+Boc→C5H11NO2;
      C+TMS→C4H12Si; on-canvas OMe label displays mixed-case & clips the bond cleanly.
- [ ] FUTURE: one-click "expand superatom to full structure" on canvas (needs 2D layout); a
      palette/menu of groups; contract-selection-to-superatom.

## Accounts + autosave + saved drawings (2026-07-29) — DONE, deployed
Google-Docs-style persistence. See README ("Accounts and saving") for the design and
SUPABASE_SETUP.md for the backend. Summary:
- [x] Sign in / create account (email+password, and Google — auto-detected from the
      project's enabled providers, so no flag to flip and no redeploy).
- [x] Autosave: local storage on every edit (crash net, and the only layer when signed
      out) + Supabase on a 1.2 s debounce. No save button anywhere.
- [x] Rows created lazily on first non-empty edit; pan/zoom never trigger a network
      write; newer-copy-wins on load only when content actually differs.
- [x] Editable document name + live save status in the header; `⌘S` flushes.
- [x] "My drawings" dropdown: switch / rename / duplicate / delete / new.
- [x] Homepage "Your drawings": six most recent with thumbnails, under Start Creating;
      offers to resume the local draft when signed out.
- [x] `?doc=<uuid>` addresses a drawing, `?new=1` forces a blank one.
- [x] FIXED (pre-existing): performVertexMerge deleted BOTH coincident vertices instead
      of one — dropping a ring template onto an identical one drained every vertex.
      Invisible before (bonds carry their own coords) but autosave made it permanent.
- [x] FIXED (pre-existing): single-letter tool shortcuts fired while typing in text
      fields; handleKeyDown now ignores events from inputs/textareas/contentEditable.
- [ ] FUTURE: share a drawing by link (needs a read policy for non-owners), folders or
      tags, per-drawing version history, "duplicate as template".

## Marvin/ChemDraw parity — gaps we DON'T have yet (for equation drawing)
Have: chain/ring drawing w/ 60° snap, ring templates, bond-order cycle, wedge/dash/wavy stereo,
charges, lone pairs, heteroatom labels w/ implicit H, reaction/equilibrium/curved arrows,
reagent+condition text on arrows, "+" separators, SMILES in/out, MW/formula, zoom, fit, undo/redo,
copy/paste, export PNG. Notable MISSING vs ChemDraw/Marvin:
- [ ] Superatom / abbreviation groups (Ph, Et, Bn, Boc, Ts, OMe…) that expand — big ease-of-use win.
- [ ] Rotate / flip a selection (and free-drag rotate handle).
- [ ] Bond length / global scale control; align & clean-up ("Clean Structure" / layout tidy).
- [ ] Charge auto-adjusts implicit H (e.g. N+ shows NH? currently manual).
- [ ] Query/generic features (R-groups, brackets/polymer, atom lists) — likely out of scope for equations.
- [ ] Templates palette beyond simple rings (functional groups, common scaffolds).
- [ ] Multi-page / larger scheme layout, numbering of structures.
- [ ] Text styling in labels (subscript/superscript in free text), and a one-click "+" tool button.
- [ ] Explicit lone-pair/radical toggles per ChemDraw; H-dot explicit hydrogens.

## Additional ideas (my backlog)
- [ ] One-click "+" toolbar button (Text tool works but isn't discoverable)
- [ ] Allow lowercase / multi-word free-text labels (input force-uppercases now)
- [ ] Multi-character element quick-entry on hovered vertex (Cl, Br)
- [ ] Fit-to-content / center-view button
- [ ] Extract popup dialogs (About/Settings/Export) to shrink main file further
- [ ] Snap-to-existing-atom highlight while drawing (clearer merge intent)
- [ ] Copy structure as SMILES already exists — surface it better

## Verification harness
Headless Chrome via CDP (see memory: openreactions-redraw-progress). Start dev
server, launch Chrome with --remote-debugging-port=9222, drive with scratchpad
scripts. Restart dev server after rapid edits (stale-module white screen).

For anything touching persistence, add two things: (1) a Node stand-in for
Supabase's auth + REST endpoints, so failure cases (unreachable server, email
confirmation required, provider on/off) can be forced on demand; (2) a **fresh
browser context per run** (`Target.createBrowserContext`) — reusing one profile lets
a leftover local draft corrupt the next run, which once looked convincingly like an
app bug. Inject the test config with `Object.defineProperty(..., writable:false)` or
the page's own supabase-config.js overwrites it.
