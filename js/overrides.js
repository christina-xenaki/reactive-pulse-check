// Responsibility: evaluating overrides against the given answers — safety
// (SPEC.md F.1), always-on regimes (F.2), individual identifiability (F.3),
// other overrides (F.4), and sector overrides from config (F.6) — and
// reporting when one has overridden the two-axis arithmetic entirely.
//
// The safety override (F.1) belongs in this file as code, never in config.
// It must never be made editable, reweighted or switched off — see
// SPEC.md F.1 for why. That override is not implemented yet: this is a
// structural scaffold, and decision logic is built in its own session
// (CLAUDE.md). When it is implemented, the comment marking it as
// deliberate and non-configurable must live at the point of implementation.
