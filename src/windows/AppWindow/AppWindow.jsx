import React, { useState, useRef, useLayoutEffect, useEffect, memo, useMemo, useCallback } from "react";
import {
  DOCK_HEIGHT,
  MENU_BAR_HEIGHT,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
} from "@/core/constants/positions";

const defaultWindowContextValue = {
  onClose: () => {},
  onMinimize: () => {},
  onZoom: () => {},
  onFocus: () => {},
  onTitlePointerDown: () => {},
};

export const WindowContext = React.createContext(defaultWindowContextValue);


function appWindowShouldMemo(prevProps, nextProps) {
  if (!prevProps.isActive && !nextProps.isActive) {
    return (
      prevProps.win.x === nextProps.win.x &&
      prevProps.win.y === nextProps.win.y &&
      prevProps.win.width === nextProps.win.width &&
      prevProps.win.height === nextProps.win.height &&
      prevProps.win.zIndex === nextProps.win.zIndex &&
      prevProps.isMinimized === nextProps.isMinimized &&
      prevProps.children === nextProps.children
    );
  }
  
  // Для активных окон - обычное сравнение
  return (
    prevProps.win.id === nextProps.win.id &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.win.x === nextProps.win.x &&
    prevProps.win.y === nextProps.win.y &&
    prevProps.win.width === nextProps.win.width &&
    prevProps.win.height === nextProps.win.height &&
    prevProps.isMinimized === nextProps.isMinimized &&
    prevProps.children === nextProps.children
  );
}

export const AppWindow = memo(function AppWindow({
  win,
  onClose,
  onMinimize,
  onFocus,
  isActive,
  isMinimized = false,
  children,
  onZoom = null,
}, ref) {
  const [pos, setPos] = useState(() => ({ x: win.x, y: win.y }));
  
  const hasCustomSize = win.width !== undefined || win.w !== undefined || win.height !== undefined || win.h !== undefined;
  
  const [size, setSize] = useState(() => ({
    width: win.width ?? win.w ?? 600,
    height: win.height ?? win.h ?? 420,
  }));
  const [isMaximized, setIsMaximized] = useState(false);
  const [prevRect, setPrevRect] = useState(null);

  const windowRef = useRef(null);
  const contentRef = useRef(null);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragCleanupRef = useRef(null);
  const resizeCleanupRef = useRef(null);
  const offset = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });

  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  const isMaximizedRef = useRef(isMaximized);
  const prevRectRef = useRef(prevRect);

  useLayoutEffect(() => {
    posRef.current = pos;
    sizeRef.current = size;
  }, [pos, size]);
  
  useLayoutEffect(() => {
    isMaximizedRef.current = isMaximized;
  }, [isMaximized]);

  useLayoutEffect(() => {
    prevRectRef.current = prevRect;
  }, [prevRect]);
  
  const onFocusRef = useRef(onFocus);
  useLayoutEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  useEffect(() => {
    const cancelGestures = () => {
      dragCleanupRef.current?.();
      resizeCleanupRef.current?.();
    };

    window.addEventListener("between-us:lock", cancelGestures);
    return () => {
      window.removeEventListener("between-us:lock", cancelGestures);
      cancelGestures();
    };
  }, []);
  
  useLayoutEffect(() => {
    if ((win.x !== posRef.current.x || win.y !== posRef.current.y) && !dragging.current) {
      setPos({ x: win.x, y: win.y });
      setIsMaximized(win.x === 0 && win.y === MENU_BAR_HEIGHT);
    }
    
    // Обновляем размеры только если они явно указаны
    if (hasCustomSize && !resizing.current) {
      const winWidth = win.width ?? win.w ?? 600;
      const winHeight = win.height ?? win.h ?? 420;
      if (winWidth !== sizeRef.current.width || winHeight !== sizeRef.current.height) {
        setSize({ width: winWidth, height: winHeight });
        setIsMaximized(winWidth >= window.innerWidth - 2);
      }
    }
  }, [win.x, win.y, win.width, win.w, win.height, win.h, hasCustomSize, resizing]);


  const handleZoom = useCallback(() => {
    const wasMaximized = isMaximizedRef.current;
    
    if (wasMaximized) {
      // Восстанавливаем старый размер
      const rect = prevRectRef.current;
      if (rect) {
        setPos({ x: rect.x, y: rect.y });
        setSize({ width: rect.width, height: rect.height });
      }
      setIsMaximized(false);
    } else {
      // Сохраняем текущий размер и разворачиваем
      setPrevRect({ 
        x: posRef.current.x, 
        y: posRef.current.y, 
        width: sizeRef.current.width, 
        height: sizeRef.current.height 
      });
      setPos({ x: 0, y: MENU_BAR_HEIGHT });
      setSize({
        width: window.innerWidth,
        height: window.innerHeight - MENU_BAR_HEIGHT - DOCK_HEIGHT,
      });
      setIsMaximized(true);
    }
  }, []);

  const onTitlePointerDown = useCallback((e) => {
    if (e.button !== 0 || isMaximized) return;
    if (e.target.closest('button')) return;

    const pointerId = e.pointerId;
    onFocusRef.current();
    dragging.current = true;

    const rect = windowRef.current.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (windowRef.current) {
      windowRef.current.classList.add('app-window--dragging');
      windowRef.current.style.willChange = 'transform';
      windowRef.current.style.transition = 'none';
      windowRef.current.style.pointerEvents = 'none';
    }

    const windowWidth = rect.width;
    const clampX = (x) => {
      const minX = Math.min(0, window.innerWidth - windowWidth);
      const maxX = windowWidth > window.innerWidth
        ? Math.max(0, window.innerWidth - 80)
        : window.innerWidth - windowWidth;
      return Math.max(minX, Math.min(maxX, x));
    };
    let onMove;
    let onUp;
    let onCancel;
    const cancelDrag = () => {
      dragging.current = false;

      if (windowRef.current) {
        windowRef.current.classList.remove('app-window--dragging');
        windowRef.current.style.willChange = '';
        windowRef.current.style.transition = '';
        windowRef.current.style.pointerEvents = '';
        windowRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
      }

      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      if (dragCleanupRef.current === cancelDrag) dragCleanupRef.current = null;
    };

    onMove = (ev) => {
      if (!dragging.current || ev.pointerId !== pointerId) return;

      const newX = clampX(ev.clientX - offset.current.x);
      const newY = Math.max(MENU_BAR_HEIGHT, ev.clientY - offset.current.y);

      if (windowRef.current && dragging.current) {
        windowRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
      }
    };

    onUp = (ev) => {
      if (!dragging.current || ev.pointerId !== pointerId) return;

      const finalX = clampX(ev.clientX - offset.current.x);
      const finalY = Math.max(MENU_BAR_HEIGHT, ev.clientY - offset.current.y);

      cancelDrag();
      setPos({ x: finalX, y: finalY });
    };

    onCancel = (ev) => {
      if (ev.pointerId === pointerId) cancelDrag();
    };

    dragCleanupRef.current = cancelDrag;

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointercancel", onCancel, { passive: true });
    e.preventDefault();
  }, [isMaximized]);

  const onResizePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onFocusRef.current();

    const pointerId = e.pointerId;
    resizing.current = true;
    startSize.current = { width: sizeRef.current.width, height: sizeRef.current.height };
    const startX = e.clientX;
    const startY = e.clientY;

    if (windowRef.current) {
      windowRef.current.classList.add("app-window--resizing");
      windowRef.current.style.willChange = "width, height";
      windowRef.current.style.transition = "none";
    }

    let onMove;
    let onUp;
    let onCancel;
    const cancelResize = () => {
      resizing.current = false;

      if (windowRef.current) {
        windowRef.current.classList.remove("app-window--resizing");
        windowRef.current.style.willChange = "";
        windowRef.current.style.transition = "";
        windowRef.current.style.width = `${sizeRef.current.width}px`;
        windowRef.current.style.height = `${sizeRef.current.height}px`;
      }

      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      if (resizeCleanupRef.current === cancelResize) resizeCleanupRef.current = null;
    };

    onMove = (ev) => {
      if (!resizing.current || ev.pointerId !== pointerId) return;

      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;
      const newWidth = Math.max(MIN_WINDOW_WIDTH, startSize.current.width + deltaX);
      const newHeight = Math.max(MIN_WINDOW_HEIGHT, startSize.current.height + deltaY);

      if (windowRef.current && resizing.current) {
        windowRef.current.style.width = `${newWidth}px`;
        windowRef.current.style.height = `${newHeight}px`;
      }
    };

    onUp = (ev) => {
      if (!resizing.current || ev.pointerId !== pointerId) return;
      const committedWidth = parseFloat(windowRef.current?.style.width) || sizeRef.current.width;
      const committedHeight = parseFloat(windowRef.current?.style.height) || sizeRef.current.height;

      cancelResize();
      setSize({ width: committedWidth, height: committedHeight });
    };

    onCancel = (ev) => {
      if (ev.pointerId === pointerId) cancelResize();
    };

    resizeCleanupRef.current = cancelResize;

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointercancel", onCancel, { passive: true });
  }, []);

  const contextValue = useMemo(() => ({
    onClose,
    onMinimize,
    onZoom: handleZoom,
    onFocus,
    onTitlePointerDown,
  }), [onClose, onMinimize, handleZoom, onFocus, onTitlePointerDown]);

  const memoizedChildren = useMemo(() => children, [children]);

  return (
    <WindowContext.Provider value={contextValue}>
      <div
        ref={windowRef}
        className={[
          "app-window",
          isActive ? "app-window--active" : "app-window--inactive",
          isMinimized ? "app-window--minimized" : "",
        ].filter(Boolean).join(" ")}
        onContextMenu={(e) => e.stopPropagation()}
        onMouseDown={onFocus}
        style={{
          position: "fixed",
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          width: size.width !== null ? size.width : 'auto',
          height: size.height !== null ? size.height : 'auto',
          zIndex: win.zIndex,
          willChange: isActive ? "transform" : "auto",
          contain: "layout style paint",
          touchAction: "none",
          contentVisibility: "auto",
        }}
      >
        <div ref={contentRef} className="app-window__content" style={{ contain: "content" }}>
          {memoizedChildren}
        </div>

        <div
          className="resize-handle"
          onPointerDown={onResizePointerDown}
          style={{ touchAction: "none" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M14 0 L14 14 L0 14" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
            <path d="M10 14 L14 10" stroke="white" strokeWidth="1" opacity="0.6" />
            <path d="M6 14 L14 6" stroke="white" strokeWidth="1" opacity="0.4" />
          </svg>
        </div>
      </div>
    </WindowContext.Provider>
  );
}, appWindowShouldMemo);
