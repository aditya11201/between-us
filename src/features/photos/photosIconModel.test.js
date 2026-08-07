import test from "node:test";
import assert from "node:assert/strict";
import { PHOTOS_ICON_PETALS } from "./photosIconModel.js";

test("Photos icon keeps the supplied eight-petal palette", () => {
  assert.deepEqual(PHOTOS_ICON_PETALS, [
    { angle: 0, from: "#ff9f0a", to: "#ff6a00" },
    { angle: 45, from: "#ffe14d", to: "#f5c400" },
    { angle: 90, from: "#c9e265", to: "#7ac70c" },
    { angle: 135, from: "#4fce7c", to: "#0f9d58" },
    { angle: 180, from: "#4fc3f7", to: "#1078d2" },
    { angle: 225, from: "#a89bea", to: "#7b3fd0" },
    { angle: 270, from: "#ff6fd8", to: "#e0189c" },
    { angle: 315, from: "#ff7a7a", to: "#ec2b3f" },
  ]);
});
