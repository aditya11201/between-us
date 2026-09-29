import { useEffect, useRef, useState } from "react";
import { GALLERY_AMBIENT_EVENT } from "@/features/music/galleryAmbientMusic";

export function RainOverlay() {
  const [active, setActive] = useState(false);
  const canvasRef = useRef(null);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const onAmbient = (event) => setActive(event.detail.playing);
    window.addEventListener(GALLERY_AMBIENT_EVENT, onAmbient);
    return () => window.removeEventListener(GALLERY_AMBIENT_EVENT, onAmbient);
  }, []);

  useEffect(() => {
    if (!active || reducedMotion) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });

    let width = canvas.parentElement.clientWidth || window.innerWidth;
    let height = canvas.parentElement.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let rainDrops = [];
    let splashes = [];

    const mouse = {
      x: width / 2,
      y: height / 2,
    };

    const settings = {
      rainCount: 520,
      minSpeed: 13,
      maxSpeed: 25,
      minLength: 12,
      maxLength: 35,
      wind: -2.2,
    };

    // Ported verbatim from the rain reference (.orca/drops/rain-effect.html):
    // title/mist/ground-glow layers skipped — only rain, splashes, glow kept.
    class RainDrop {
      constructor(resetFromTop = false) {
        this.reset(resetFromTop);
      }

      reset(fromTop = true) {
        this.x = Math.random() * (width + 300) - 150;
        this.y = fromTop ? Math.random() * -height : Math.random() * height;

        this.length = settings.minLength + Math.random() * (settings.maxLength - settings.minLength);
        this.speed = settings.minSpeed + Math.random() * (settings.maxSpeed - settings.minSpeed);
        this.wind = settings.wind + Math.random() * 0.8;
        this.opacity = 0.12 + Math.random() * 0.4;
        this.width = 0.45 + Math.random() * 0.75;
      }

      update(dt = 1) {
        this.x += this.wind * dt;
        this.y += this.speed * dt;

        if (this.y > height + this.length) {
          if (Math.random() < 0.28) {
            createSplash(this.x, height - Math.random() * 20);
          }
          this.reset(true);
        }

        if (this.x < -100) {
          this.x = width + 100;
        }
      }

      draw() {
        const endX = this.x + this.wind * 1.5;
        const endY = this.y + this.length;

        const gradient = ctx.createLinearGradient(this.x, this.y, endX, endY);
        gradient.addColorStop(0, "rgba(190,220,255,0)");
        gradient.addColorStop(0.35, `rgba(190,220,255,${this.opacity})`);
        gradient.addColorStop(1, `rgba(220,238,255,${this.opacity * 0.2})`);

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.width;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    class Splash {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 1;
        this.maxRadius = 4 + Math.random() * 10;
        this.life = 1;
        this.decay = 0.04 + Math.random() * 0.025;
      }

      update() {
        this.radius += 0.35;
        this.life -= this.decay;
      }

      draw() {
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius * 1.8, this.radius * 0.35, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(190,220,255,${Math.max(this.life, 0) * 0.35})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      get dead() {
        return this.life <= 0 || this.radius >= this.maxRadius;
      }
    }

    function createRain() {
      rainDrops = [];
      const density = Math.min(700, Math.max(250, Math.floor((width * height) / 3200)));
      settings.rainCount = density;
      for (let i = 0; i < settings.rainCount; i++) {
        rainDrops.push(new RainDrop(false));
      }
    }

    function createSplash(x, y) {
      if (splashes.length > 120) return;
      splashes.push(new Splash(x, y));
    }

    function drawAtmosphere() {
      const glow = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        Math.max(width, height) * 0.6,
      );
      glow.addColorStop(0, "rgba(120,170,215,0.025)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }

    function resizeCanvas() {
      width = canvas.parentElement.clientWidth || window.innerWidth;
      height = canvas.parentElement.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createRain();
    }

    const onMouseMove = (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };
    const onTouchMove = (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      mouse.x = touch.clientX;
      mouse.y = touch.clientY;
    };

    let raf = 0;
    let lastFrame = 0;
    let scrollPauseUntil = 0;
    function animate(now) {
      raf = requestAnimationFrame(animate);
      // ponytail: 30fps cap halves canvas paint cost so Photos scroll stays smooth
      if (now - lastFrame < 33) return;
      // ponytail: skip paint while the user scrolls a window or tab is hidden
      if (document.hidden || now < scrollPauseUntil) {
        lastFrame = now;
        return;
      }
      // ponytail: speed is px/frame at 60fps; dt keeps fall speed constant at 30fps
      const dt = Math.min(3, (now - lastFrame) / 16.7);
      lastFrame = now;
      ctx.clearRect(0, 0, width, height);
      drawAtmosphere();
      for (const drop of rainDrops) {
        drop.update(dt);
        drop.draw();
      }
      for (let i = splashes.length - 1; i >= 0; i--) {
        const splash = splashes[i];
        splash.update();
        splash.draw();
        if (splash.dead) {
          splashes.splice(i, 1);
        }
      }
    }

    const onScroll = () => {
      scrollPauseUntil = performance.now() + 180;
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("wheel", onScroll, { passive: true, capture: true });
    window.addEventListener("touchmove", onScroll, { passive: true, capture: true });

    resizeCanvas();
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("wheel", onScroll, { capture: true });
      window.removeEventListener("touchmove", onScroll, { capture: true });
    };
  }, [active, reducedMotion]);

  if (!active || reducedMotion) return null;

  return (
    <div className="desktop__rain" aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="desktop__rain-vignette" />
    </div>
  );
}
