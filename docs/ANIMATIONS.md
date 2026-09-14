# Reaction animation documents

The animation workspace is a separate document type, reachable from **New → Animation**
on the homepage at `/animate/`, the **Animations** library, or **File → Create animation from drawing**.
It uses the existing Supabase `drawings.data` JSON payload with `kind: "animation"`.
No database migration is required. Existing drawing payloads remain drawing documents.
Local recovery, cloud autosave, and ownership policies are shared with the editor.

## Step editor workflow

1. Create an animation. **Draw molecules** opens the existing drawing tools;
   **Use these molecules** returns to the reaction. Saved drawings, SMILES, and
   the carbonyl example are also available.
2. Each gray canvas is one step. Click a lone pair (or its atom) or a bond,
   then the destination atom or bond. Add all electron movements for the step.
   Intermolecular attacks automatically select the donor fragment for motion;
   **Reacting species** lets you adjust this selection.
3. **Next step** calculates the product and uses it as the next starting structure.
   The carbonyl example's second box contains the tetrahedral intermediate and
   negatively charged oxygen. **Use example arrows** is available for both steps.
4. Click a box or the right-hand step list to edit arrows and step names.
   Upstream edits recompute the entire sequence; invalid steps block later
   structures and playback. Starting molecules can be edited with the drawing
   tools, preserving atom/bond identities where retained, or repositioned with
   **Move species**. Undo/Redo includes these edits.
5. **Complete animation** validates every step, switches to a white canvas, and
   immediately plays the full sequence. Pause, adjustable speed, and a sequence
   scrubber are on the bottom bar. **Stop** returns to the gray step editor.
6. **File** exports GIF, WebM video, or editable animation JSON. **View** toggles
   identifiers. Incomplete authoring steps are autosaved and can be reopened.

The proposed product is electron bookkeeping, not a prediction that a reaction is
favorable. In the example, acid/base equilibration after elimination is a further
step and is not silently performed. Proton transfers require their own arrows.

## Model and boundaries

Atoms keep stable IDs, element, coordinates, formal charge, and explicit counts
of implicit hydrogens. Bonds keep endpoint IDs and bond orders. Steps store their connected electron flows and a cached resulting scene. On load
and on every edit, the compiler derives starting structures from the previous
product. A cached product is never trusted for playback. Incomplete steps have
null products and are still autosaved. Older draft-arrow payloads are migrated
into editable step boxes.

Supported flows are two-electron lone-pair → atom (new bond), lone-pair → attached
bond (increase bond order), and bond → one of its own atoms (decrease/delete bond).
Formal-charge updates occur simultaneously. Valence and electron availability
checks reject inconsistent steps. Selected attacking species move rigidly toward
the electrophile; detached leaving groups move away. Renderer transitions are
illustrative 2D motion, not atomistic dynamics or computed trajectories.

The initial release supports H/C/N/O/halogen mechanisms. Radicals, metals,
collapsed abbreviations, and unsupported valences must be resolved before import.
Stereochemical bonds are rejected on import rather than silently losing their meaning. Stereochemical outcome prediction, arbitrary bond-to-bond pericyclic arrows, and
3D dynamics are outside this implementation. Later starting structures cannot be independently edited, so their chemistry
always matches the previous product. JSON imports replace the
current animation and can be undone.

## Validation

- Unit tests verify the two-step example, stable atom IDs, conserved formal charge
  and electron-pair count, valence rejection, and imported hydroxide hydrogens.
- The mock-cloud browser harness checks animation load/update and local recovery.
- Browser integration checks manual arrow attachment, sequential step creation,
  invalidation after upstream edits, drawing-tool integration, reload, automatic
  playback and Stop, actual GIF/WebM bytes, and the separate homepage library.
- `gifenc` is loaded only for GIF export. Video export uses browser MediaRecorder;
  browsers without WebM support report that GIF export is available instead.
