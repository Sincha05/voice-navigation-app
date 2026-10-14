const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { DEMO_CENTER } = require("./sampleBuilding");
const { calculateIndoorRoute } = require("./routeEngine");

describe("indoor routeEngine", () => {
  it("finds a ground-floor route", () => {
    const route = calculateIndoorRoute(DEMO_CENTER, "main_entrance", "restroom_g");
    assert.equal(route.status, "success");
    assert.ok(route.nodeIds.includes("reception"));
    assert.ok(route.steps.length > 0);
  });

  it("finds a multi-floor route via stairs", () => {
    const route = calculateIndoorRoute(DEMO_CENTER, "reception", "lab_1", {
      preferAccessible: false
    });
    assert.equal(route.status, "success");
    assert.ok(route.nodeIds.includes("staircase_g") || route.nodeIds.includes("staircase_1"));
    const hasTransition = route.steps.some((s) => s.type === "floor_transition");
    assert.ok(hasTransition);
  });

  it("prefers elevator when accessible routing is enabled", () => {
    const route = calculateIndoorRoute(DEMO_CENTER, "reception", "room_101", {
      preferAccessible: true
    });
    assert.equal(route.status, "success");
    assert.ok(route.nodeIds.includes("elevator_g"));
    assert.ok(route.nodeIds.includes("elevator_1"));
  });

  it("rejects same start and destination", () => {
    const route = calculateIndoorRoute(DEMO_CENTER, "reception", "reception");
    assert.equal(route.status, "error");
    assert.equal(route.code, "SAME_LOCATION");
  });

  it("rejects unknown locations", () => {
    const route = calculateIndoorRoute(DEMO_CENTER, "reception", "missing_room");
    assert.equal(route.status, "error");
  });
});
