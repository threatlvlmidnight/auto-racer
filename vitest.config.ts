import { defineConfig } from "vitest/config";

// Per plan.md Constraints: src/simulation must be testable with no DOM/canvas.
// This config intentionally does NOT set a jsdom/browser environment —
// if a simulation test ever needs one, that's a sign it has leaked a
// presentation-layer dependency it shouldn't have.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
