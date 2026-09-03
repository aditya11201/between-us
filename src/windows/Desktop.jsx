import React, { memo, useState, useEffect, useCallback, useMemo } from "react";
import { useDisplaySettings } from "@/core/providers";


export const Desktop = memo(function Desktop({ 
  children, 
  wallpaper, 
  onContextMenu,
  isLocked = false,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { brightness } = useDisplaySettings();
  
  // Предзагрузка обоев с оптимизацией
  useEffect(() => {
    if (!wallpaper) return;
    
    const img = new Image();
    img.src = wallpaper;
    
    // Используем load для успешной загрузки
    const handleLoad = () => {
      setIsLoaded(true);
      img.onload = null;
      img.onerror = null;
    };
    
    const handleError = () => {
      setIsLoaded(true);
      img.onload = null;
      img.onerror = null;
    };
    
    img.onload = handleLoad;
    img.onerror = handleError;
    
    // Проверка если изображение уже в кэше
    if (img.complete) {
      handleLoad();
    }
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [wallpaper]);

  // Мемоизация стилей
  const desktopStyle = useMemo(() => ({
    backgroundImage: `url(${wallpaper})`,
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease',
  }), [wallpaper, isLoaded]);

  const handleContextMenu = useCallback((e) => {
    if (onContextMenu && typeof onContextMenu === 'function') {
      onContextMenu(e);
    }
  }, [onContextMenu]);

  return (
    <div
      onContextMenu={handleContextMenu}
      className="desktop"
      style={desktopStyle}
      inert={isLocked}
    >
      <div
        className="desktop__brightness-overlay"
        style={{ opacity: 1 - brightness / 100 }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  
  // Кастомная проверка для минимизации ререндеров
  return (
    prevProps.wallpaper === nextProps.wallpaper &&
    prevProps.children === nextProps.children &&
    prevProps.isLocked === nextProps.isLocked
  );
});
