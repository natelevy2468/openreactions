# Reaction animation documents

The animation workspace is a separate document type, reachable from **New → Animation**
on the homepage at `/animate/`, the **Animations** library, or **File → Create animation from drawing**.
It uses the existing Supabase `drawings.data` JSON payload with `kind: "animation"`.
No database migration is required. Existing drawing payloads remain drawing documents.
Local recovery, cloud autosave, and ownership policies are shared with the editor.

## First workflow

1. Create an animation and choose **Carbonyl example**, import a saved drawing,
   or import SMILES. Use **Move starting species** to arrange reactants.
2. Choose **Reacting species** and click the attacking molecule.
3. Choose **Connect electron flow**. Select a lone pair (or its atom) or a bond,
   then its destination atom or bond. Identifier dropdowns provide the same explicit
   connections. For the example, **Use example arrows** sets these up.
4. **Propose next structure** applies the complete set of arrows simultaneously.
   Check the proposed bonds, lone pairs, and formal charges; preview with Play or
   the scrubber, then **Accept intermediate** or return to the arrows.
5. Repeat for the next step. The example includes addition to methyl acetate by
   hydroxide and subsequent carbonyl reformation with methoxide departure.
6. Select a saved step and Play. Playback pauses briefly at each intermediate and
   continues through the sequence. Speed is adjustable; the scrubber controls a
   single step. Export the complete sequence as GIF or WebM video, or save an
   editable animation JSON file.

The proposed product is electron bookkeeping, not a prediction that a reaction is
favorable. In the example, acid/base equilibration after elimination is a further
step and is not silently performed. Proton transfers require their own arrows.

## Model and boundaries

Atoms keep stable IDs, element, coordinates, formal charge, and explicit counts
of implicit hydrogens. Bonds keep endpoint IDs and bond orders. Accepted steps
store their connected electron flows and proposed resulting scene. A draft step
is autosaved, but an unaccepted proposed intermediate is not treated as accepted.

Supported flows are two-electron lone-pair → atom (new bond), lone-pair → attached
bond (increase bond order), and bond → one of its own atoms (decrease/delete bond).
Formal-charge updates occur simultaneously. Valence and electron availability
checks reject inconsistent steps. Selected attacking species move rigidly toward
the electrophile; detached leaving groups move away. Renderer transitions are
illustrative 2D motion, not atomistic dynamics or computed trajectories.

The initial release supports H/C/N/O/halogen mechanisms. Radicals, metals,
collapsed abbreviations, and unsupported valences must be resolved before import.
Stereochemical bonds are rejected on import rather than silently losing their meaning. Stereochemical outcome prediction, arbitrary bond-to-bond pericyclic arrows, and
3D dynamics are outside this implementation. Saved step geometry is locked;
Undo steps before changing the initial arrangement. JSON imports replace the
current animation and can be undone.

## Validation

- Unit tests verify the two-step example, stable atom IDs, conserved formal charge
  and electron-pair count, valence rejection, and imported hydroxide hydrogens.
- The mock-cloud browser harness checks animation load/update and local recovery.
- Browser integration checks proposal versus acceptance, two saved steps, reload,
  playback, actual GIF/WebM bytes, and the separate homepage library.
- `gifenc` is loaded only for GIF export. Video export uses browser MediaRecorder;
  browsers without WebM support report that GIF export is available instead.
