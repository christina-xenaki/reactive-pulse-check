// Responsibility: computing the two independent axes — cost of speaking and
// cost of staying quiet (SPEC.md section C) — from the given answers using
// config's axisWeights, banding each via bandBoundaries, and mapping the
// band pair to a recommended level via levelMatrix. Levels 6 and 7 are never
// reached by this arithmetic — they come from overrides.js.
