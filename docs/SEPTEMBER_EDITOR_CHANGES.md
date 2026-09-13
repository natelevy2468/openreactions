# Editor changes from Openreactions_prompt.md

Implemented locally, September 13, 2026. The original instruction file is unchanged.

| Request | Implementation | Regression coverage |
| --- | --- | --- |
| Tidy changes orientation | Align invented coordinates to the original component; correct wedge direction if coordinate alignment reflects geometry. | Rotated benzene retains its orientation and center; tetrahedral and double-bond stereochemistry survive cleanup across rotations. |
| Allow imperfect geometry | Tools → Free placement retains drawn bond lengths and angles. Tidy remains an explicit action. | Browser draws a deliberately nonstandard bond and checks its exact displacement. |
| Easier selection | A click on either an atom or bond selects its connected molecule. | Browser selects a ring by a bond midpoint. |
| Copy/paste | Update selected coordinates throughout dragging, copy current bonds, and use shared ring/stereo/text rendering in the paste preview. | Browser drag, copy, paste, undo, and redo preserve geometry, bond orders, atom labels, and charges. |
| Lone pairs and long labels | Position electrons outside measured displayed labels; include label extents in the positioning cache. Remove opaque rounded label masks and trim bond geometry. | Long-label rendering and electron-clearance checks. |
| Fused ring double bonds | Prefer the conjugated six-membered ring for the interior stroke when a bond belongs to multiple rings. | Fused five-/six-membered ring test, repeated after translation. |
| Equilibrium arrow handles | Rendering, hit-testing, resizing, and movement use center-based endpoints. Small handles appear on relevant arrows only. | Rotated forward/equilibrium endpoint tests plus browser equilibrium resizing and movement. |
| Molecule-specific Info | Inspect one bond-connected component, defaulting to the latest created/interacted molecule. Canvas clicks switch the highlighted component while Info stays open. | Browser switches between methanol and ethane, checks individual weights and unchanged bonds. |
| Contact | About links to sick96096@gmail.com. | Browser checks the email and absence of the phone number. |
| Smaller menus | Tools contains arrangement, cleanup, validation, and free placement. File contains chemical exchange and fragments. Settings has General and History tabs. Export contains PDF/SVG alongside PNG; bottom controls stay aligned. | Menu, History, SVG, and PNG browser checks; screenshot inspection. |
| Toolbar and elements | Four shallow/medium CW/CCW arrow shortcuts sit beside a caret opening all six full-tip and six single-electron fishhook arrows; element picker contains 118 symbols searchable by symbol/atomic number, with shortcut reminders. | Browser checks all 118 elements, four arrow shortcuts, twelve expanded choices, and fishhook drawing/save/reload/copy. Unit tests check matching curve geometry and half-tip rendering, including SVG. |

## Verification

```sh
npm run build
cd draw
npm run test:chemistry
npm run test:browser
```

The chemistry command includes the rendering/geometry regression tests. The browser
suite uses isolated local fixtures and does not change real accounts or drawings.
The screenshots are saved to the temporary folder printed by that suite.
