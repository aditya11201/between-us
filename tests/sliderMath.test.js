import test from "node:test";
import assert from "node:assert/strict";
import {
  clampSliderValue,
  snapSliderValue,
  getWheelSliderValue,
} from "../src/features/menubar/MenuBar/sliderMath.js";

test("clamps values to the slider range", () => {
  assert.equal(clampSliderValue(-10), 0);
  assert.equal(clampSliderValue(150), 100);
  assert.equal(clampSliderValue(40), 40);
});

test("snaps values to the configured step", () => {
  assert.equal(snapSliderValue(73, 0, 100, 5), 75);
  assert.equal(snapSliderValue(72, 0, 100, 5), 70);
});

test("wheel down decreases the value", () => {
  assert.equal(getWheelSliderValue(75, 10), 74);
});

test("wheel up increases the value", () => {
  assert.equal(getWheelSliderValue(75, -10), 76);
});

test("wheel values respect boundaries", () => {
  assert.equal(getWheelSliderValue(0, 10), 0);
  assert.equal(getWheelSliderValue(100, -10), 100);
});

test("wheel values respect step", () => {
  assert.equal(getWheelSliderValue(75, 10, 0, 100, 5), 70);
});
