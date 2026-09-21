# SDD ledger — plan: docs/superpowers/plans/2026-09-20-dunhuang-run.md

Execution mode: Native inline implementation selected by the user on 2026-09-20.

Ruling: The repository had an unborn `master` branch and sandboxed `.git` metadata, so a linked worktree could not be created before an initial commit. Work proceeds in the user-authorized `codex/dunhuang-run` branch in the current directory; cost if wrong: concurrent edits in this directory require manual coordination.

Pre-flight: Task 1 produces renderer/state/loop interfaces; Tasks 2–8 consume them through `main.js`. Task 2 produces `TrackGraph.evalTrack(s)` and `Runner`; Tasks 4–6 consume them for placement and collision. Task 3 produces action events consumed by Task 4. Task 4 produces collision events and score state consumed by Tasks 5 and 7. Task 5 produces power-up/pursuer state consumed by Tasks 7 and 8. No type/signature conflicts found because the plan delegates exact interfaces to each task's implementation.

Design context: `DESIGN.md` is the canonical visual specification. `src/art/Palette.js` and the CSS variables in `index.html` will mirror its color tokens.

Task 1: complete — static shell, renderer, state machine, fixed-step loop and visible runtime errors are implemented.
Task 1: Ruling: Added `src/art/Palette.js` during P1 because the binding specification forbids colors outside `Palette.js`, while the P1 scene requires color for fog, lights and road; cost if wrong: Task 6 only needs to extend, not relocate, the canonical palette.
Task 1: Verification note: an early browser-control attempt exited before browser selection with an environment-level sandbox error (`unbound variable: | TIOCSTI`); a later in-app Browser smoke run against the CDN r169 build (`main.js?v=20260920-8`) loaded with empty logs and completed `MENU → PLAYING → PAUSED → PLAYING` plus restart. The earlier note is retained as history, not as an unresolved runtime blocker.
Task 2: complete — pooled arc-length track, road mesh, lane marks, rails, runner and camera are implemented.
Task 2: Ruling: TrackGraph's zero-heading forward X can be JavaScript `-0`; tests use a geometric tolerance rather than strict signed-zero equality. Cost if wrong: no visual or gameplay difference, but strict sign assertions would create false failures.
Task 3: complete — keyboard, touch and mouse gesture input plus buffered runner actions are implemented.
Task 4: complete — solvable obstacle groups, collision tolerance, score and high-score persistence are implemented.
Task 5: complete — pursuer economy, pickup spawning, magnet/shield/boost state and clean spawner reset are implemented.
Task 6: complete — procedural textures, palette, lane/rail props, pursuer and pickup visuals plus reusable decoration pool are implemented.
Task 7: complete — HUD, menu/pause/result screens, particles, mute-safe SFX and pentatonic ambient loop are implemented.
Task 8: complete for MVP — automated suite is green, local-browser smoke test passes, and sustained low FPS reduces pixel ratio then disables shadows. Five-minute device profiling remains a release hardening activity rather than a blocker for this prototype.
Final review: reviewer found no Critical issues. GAP hazards now span all lanes, forbid adjacent unjumpable runs, are checked by track collision without duplicate penalties; pursuer roar and faster danger heartbeat are wired to the <6m threshold and stopped outside PLAYING; pursuit speed recovery, result high-score/new-record feedback, acceptance evidence and runtime dependency cache versions are covered by tests. Deferred release hardening/polish: real desktop/mobile FPS, draw-call, triangle and memory measurements; 0.9s pursuer pounce/slow-motion result transition; menu orbit camera; richer named obstacle geometry and exact noise/LFO SFX layers.
