export function clampSliderValue(value, min = 0, max = 100) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return min;

  return Math.min(max, Math.max(min, numeric));
}

export function snapSliderValue(value, min = 0, max = 100, step = 1) {
  const clamped = clampSliderValue(value, min, max);
  const numericStep = Number(step);

  if (!Number.isFinite(numericStep) || numericStep <= 0) {
    return clamped;
  }

  const snapped =
    min + Math.round((clamped - min) / numericStep) * numericStep;

  return clampSliderValue(snapped, min, max);
}

export function getWheelSliderValue(
  value,
  deltaY,
  min = 0,
  max = 100,
  step = 1
) {
  const current = snapSliderValue(value, min, max, step);
  const delta = Number(deltaY);

  if (!Number.isFinite(delta) || delta === 0) {
    return current;
  }

  return snapSliderValue(
    current - Math.sign(delta) * step,
    min,
    max,
    step
  );
}
