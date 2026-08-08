import React, { useRef, useCallback, memo, useState, useEffect } from "react";
import {
  getWheelSliderValue,
  snapSliderValue,
} from "./sliderMath";

export const VerticalSlider = memo(function VerticalSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  icon: Icon,
  label,
}) {
  const barRef = useRef(null);
  const fillRef = useRef(null);
  const isDragging = useRef(false);
  const rafId = useRef(null);
  const pendingValue = useRef(value);

  const [dragging, setDragging] = useState(false);

  // ── Преобразование координаты курсора → значение ──────────────────
  const clientXToValue = useCallback((clientX) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    let percent = (clientX - rect.left) / rect.width;
    percent = percent < 0 ? 0 : percent > 1 ? 1 : percent;
    return snapSliderValue(
      min + percent * (max - min),
      min,
      max,
      step
    );
  }, [min, max, step, value]);

  // ── Мгновенное визуальное обновление через DOM (без re-render) ────
  const paintFill = useCallback((val) => {
    if (!fillRef.current) return;
    const percent = ((val - min) / (max - min)) * 100;
    fillRef.current.style.width = `${percent}%`;
  }, [min, max]);

  // ── Троттлинг onChange через requestAnimationFrame ─────────────────
  const scheduleCommit = useCallback((val) => {
    pendingValue.current = val;
    if (rafId.current != null) return;

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      onChange?.(pendingValue.current);
    });
  }, [onChange]);

  const handlePointerMove = useCallback((clientX) => {
    const newVal = clientXToValue(clientX);
    paintFill(newVal);
    scheduleCommit(newVal);
  }, [clientXToValue, paintFill, scheduleCommit]);

  // ── Pointer events: работают и для мыши, и для touch/pen ──────────
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    barRef.current?.setPointerCapture?.(e.pointerId);
    isDragging.current = true;
    setDragging(true);
    handlePointerMove(e.clientX);
  }, [handlePointerMove]);

  const onPointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    handlePointerMove(e.clientX);
  }, [handlePointerMove]);

  const onPointerUp = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    barRef.current?.releasePointerCapture?.(e.pointerId);

    // Гарантируем финальный коммит точного значения
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    onChange?.(pendingValue.current);
  }, [onChange]);

  const onWheel = useCallback((e) => {
    if (e.ctrlKey) return;

    e.preventDefault();

    const next = getWheelSliderValue(
      pendingValue.current,
      e.deltaY,
      min,
      max,
      step
    );

    paintFill(next);
    scheduleCommit(next);
  }, [min, max, step, paintFill, scheduleCommit]);

  // ── Клавиатура: стрелки / Home / End ───────────────────────────────
  const onKeyDown = useCallback((e) => {
    let next = pendingValue.current;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(max, pendingValue.current + step);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.max(min, pendingValue.current - step);
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    pendingValue.current = next;
    paintFill(next);
    onChange?.(next);
  }, [min, max, step, onChange, paintFill]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;

    const options = { passive: false };
    bar.addEventListener("wheel", onWheel, options);

    return () => bar.removeEventListener("wheel", onWheel, options);
  }, [onWheel]);

  // ── Синхронизация DOM с внешним value, когда не тащим ──────────────
  useEffect(() => {
    if (!isDragging.current) {
      pendingValue.current = value;
      paintFill(value);
    }
  }, [value, paintFill]);

  // ── Очистка rAF при размонтировании ─────────────────────────────────
  useEffect(() => () => {
    if (rafId.current != null) cancelAnimationFrame(rafId.current);
  }, []);

  const initialPercent = ((value - min) / (max - min)) * 100;

  return (
    <div className="cc-slider-block">
      <div
        className={`cc-slider-bar${dragging ? " is-dragging" : ""}`}
        ref={barRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        role="slider"
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
      >
        <div className="cc-slider-track-bg">
          {Icon && <Icon size={14} />}
        </div>

        <div
          className="cc-slider-fill"
          ref={fillRef}
          style={{ width: `${initialPercent}%` }}
        >
          {Icon && <Icon size={14} className="cc-slider-icon-fill" />}
        </div>
      </div>
    </div>
  );
});
