import { configure } from "mobx";

// enforceActions is the load-bearing constraint and stays on everywhere.
// The three "outside a reactive context" warnings exist to catch a missing
// observer() wrapper in the actual app; they're not relevant to a unit test
// that reads a controller's fields directly, so they're dev-only *and*
// skipped under Vitest.
const strictReactivityWarnings = import.meta.env.DEV && !import.meta.env.TEST;

configure({
  enforceActions: "always",
  computedRequiresReaction: strictReactivityWarnings,
  reactionRequiresObservable: strictReactivityWarnings,
  observableRequiresReaction: strictReactivityWarnings,
});
