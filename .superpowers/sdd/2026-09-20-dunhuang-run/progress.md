# SDD ledger — plan: docs/superpowers/plans/2026-09-20-dunhuang-run.md

Execution mode: Native inline implementation selected by the user on 2026-09-20.

Ruling: The repository had an unborn `master` branch and sandboxed `.git` metadata, so a linked worktree could not be created before an initial commit. Work proceeds in the user-authorized `codex/dunhuang-run` branch in the current directory; cost if wrong: concurrent edits in this directory require manual coordination.

Pre-flight: Task 1 produces renderer/state/loop interfaces; Tasks 2–8 consume them through `main.js`. Task 2 produces `TrackGraph.evalTrack(s)` and `Runner`; Tasks 4–6 consume them for placement and collision. Task 3 produces action events consumed by Task 4. Task 4 produces collision events and score state consumed by Tasks 5 and 7. Task 5 produces power-up/pursuer state consumed by Tasks 7 and 8. No type/signature conflicts found because the plan delegates exact interfaces to each task's implementation.

Design context: `DESIGN.md` is the canonical visual specification. `src/art/Palette.js` and the CSS variables in `index.html` will mirror its color tokens.

Task 1: complete — static shell, renderer, state machine, fixed-step loop and visible runtime errors are implemented.
Task 1: Ruling: Added `src/art/Palette.js` during P1 because the binding specification forbids colors outside `Palette.js`, while the P1 scene requires color for fog, lights and road; cost if wrong: Task 6 only needs to extend, not relocate, the canonical palette.
Task 1: Verification note: Node browser-control kernel exits before browser selection with an environment-level sandbox error (`unbound variable: | TIOCSTI`). Local HTTP reachability, syntax checks, static DOM requirements and all Node tests pass; cost if wrong: a CDN/WebGL runtime error may remain until browser control becomes available.
Task 2: complete — pooled arc-length track, road mesh, lane marks, rails, runner and camera are implemented.
Task 2: Ruling: TrackGraph's zero-heading forward X can be JavaScript `-0`; tests use a geometric tolerance rather than strict signed-zero equality. Cost if wrong: no visual or gameplay difference, but strict sign assertions would create false failures.
Task 3: complete — keyboard, touch and mouse gesture input plus buffered runner actions are implemented.
Task 4: complete — solvable obstacle groups, collision tolerance, score and high-score persistence are implemented.
Task 5: complete — pursuer economy, pickup spawning, magnet/shield/boost state and clean spawner reset are implemented.
Task 6: complete — procedural textures, palette, lane/rail props, pursuer and pickup visuals plus reusable decoration pool are implemented.
Task 7: complete — HUD, menu/pause/result screens, particles, mute-safe SFX and pentatonic ambient loop are implemented.
Task 8: complete for MVP — automated suite is green, local-browser smoke test passes, and sustained low FPS reduces pixel ratio then disables shadows. Five-minute device profiling remains a release hardening activity rather than a blocker for this prototype.
