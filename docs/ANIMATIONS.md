# Reaction animation documents

The animation workspace is a separate document type, reachable from **New → Animation**
on the homepage at `/animate/`, the **Animations** library, or **File → Create animation from drawing**.
It uses the existing Supabase `drawings.data` JSON payload with `kind: "animation"`.
No database migration is required. Existing drawing payloads remain drawing documents.
Local recovery, cloud autosave, and ownership policies are shared with the editor.

## Step editor workflow

1. Create an animation. The left toolbar is the **same drawing toolbar**, backed
   by the existing drawing editor. Draw molecules directly in the first gray box.
   Starting-structure imports and the carbonyl example are under **Steps** on the right.
2. Use curved arrows from the drawing toolbar to draw each electron movement.
   Start on an atom's lone pair or a bond, and end on the receiving atom or bond.
   Arrow endpoints are resolved to stable chemical identities when continuing.
3. **Next step** checks the complete mechanism and puts its recommended product
   in a new editable box. For the carbonyl example this is the tetrahedral
   intermediate with a negatively charged oxygen. Draw the next arrows there.
4. Click a box or the right-hand step list to edit. Drawing tools, selection,
   erase, labels, lone pairs, charges, Undo and Redo work on the selected box.
   Later starting structures can be repositioned but their chemical connectivity
   and charges must match the previous product. **Use recommended structure**
   restores that product if it has been changed inconsistently.
5. **Complete animation** resolves all drawn arrows, validates every intermediate,
   removes the boxes, and immediately plays the reaction centered on white.
   Pause, speed and scrubbing remain at the bottom. **Stop** returns to the boxes.
6. **File** exports GIF, WebM video, or editable animation JSON. **View** toggles
   playback identifiers. Drawn drafts are autosaved even before their arrows are
   finished. The embedded drawing editor has no independent document persistence;
   all box contents belong to the animation document.

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
3D dynamics are outside this implementation. Later boxes are editable, with a continuity check before advancing or playing. JSON imports replace the
current animation and can be undone.

## Validation

- Unit tests verify the two-step example, stable atom IDs, conserved formal charge
  and electron-pair count, valence rejection, and imported hydroxide hydrogens.
- The mock-cloud browser harness checks animation load/update and local recovery.
- Browser integration checks manual arrow attachment, sequential step creation,
  invalidation after upstream edits, direct in-box drawing, reload, visible automatic
  playback and Stop, actual GIF/WebM bytes, and the separate homepage library.
- `gifenc` is loaded only for GIF export. Video export uses browser MediaRecorder;
  browsers without WebM support report that GIF export is available instead.
