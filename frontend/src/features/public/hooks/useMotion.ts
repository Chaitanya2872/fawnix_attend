import { useCallback, useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Shared motion primitives for the Fawnix marketing surfaces.
   Zero dependencies, SSR-safe guards, and every effect honours
   `prefers-reduced-motion` so the experience stays accessible.
   ───────────────────────────────────────────────────────────────────────────── */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Reveals an element the first time it scrolls into view.
 * Returns a ref to attach and a boolean you can map to `data-visible`.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.18,
  rootMargin = "0px 0px -12% 0px",
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, visible } as const;
}

/**
 * Tracks how far the document has been scrolled, 0 → 1.
 * Used for the cinematic progress rail at the top of the tour.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      setProgress(
        scrollable <= 0 ? 0 : Math.min(1, window.scrollY / scrollable),
      );
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return progress;
}

/**
 * Writes normalised pointer position onto an element as CSS custom properties
 * (`--mx`, `--my` in the -1 → 1 range plus `--gx`/`--gy` percentages).
 * CSS then drives real 3D transforms + a spotlight sheen, which keeps the
 * animation on the compositor instead of in React.
 */
export function usePointer3d<T extends HTMLElement = HTMLDivElement>(
  strength = 1,
) {
  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return;

    let frame = 0;
    let nextX = 0;
    let nextY = 0;
    let nextGx = 50;
    let nextGy = 50;

    const apply = () => {
      frame = 0;
      node.style.setProperty("--mx", nextX.toFixed(4));
      node.style.setProperty("--my", nextY.toFixed(4));
      node.style.setProperty("--gx", `${nextGx.toFixed(2)}%`);
      node.style.setProperty("--gy", `${nextGy.toFixed(2)}%`);
    };

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratioX = (event.clientX - rect.left) / rect.width;
      const ratioY = (event.clientY - rect.top) / rect.height;
      nextGx = ratioX * 100;
      nextGy = ratioY * 100;
      nextX = (ratioX - 0.5) * 2 * strength;
      nextY = (ratioY - 0.5) * 2 * strength;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const onLeave = () => {
      nextX = 0;
      nextY = 0;
      nextGx = 50;
      nextGy = 50;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, strength]);

  return ref;
}

/** Eased count-up used for the metric bands. */
export function useCountUp(target: number, active: boolean, duration = 1500) {
  const [value, setValue] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!active) return;
    if (reduced || duration <= 0) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start = 0;

    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutExpo — fast lift, gentle settle
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(target * eased);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, duration, reduced, target]);

  return value;
}

/** A slow, always-running tick used for "live" mock data in the demo screens. */
export function useLivePulse(interval = 2600) {
  const [beat, setBeat] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(
      () => setBeat((value) => value + 1),
      interval,
    );
    return () => window.clearInterval(id);
  }, [interval, reduced]);

  return beat;
}

/**
 * Minimal, dependency-free carousel engine: autoplay, pointer dragging,
 * keyboard support and wrap-around navigation.
 */
export function useCarousel(count: number, autoplayMs = 7000) {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    id: number;
    startX: number;
    width: number;
  } | null>(null);
  const reduced = usePrefersReducedMotion();

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (reduced || paused || autoplayMs <= 0 || count < 2) return;
    const id = window.setTimeout(() => goTo(index + 1), autoplayMs);
    return () => window.clearTimeout(id);
  }, [autoplayMs, count, goTo, index, paused, reduced]);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    const node = viewportRef.current;
    if (!node) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = node.getBoundingClientRect();
    dragState.current = {
      id: event.pointerId,
      startX: event.clientX,
      width: rect.width || 1,
    };
    setPaused(true);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const state = dragState.current;
    if (!state || state.id !== event.pointerId) return;
    const delta = event.clientX - state.startX;
    setDragOffset((delta / state.width) * 100);
  }, []);

  const endDrag = useCallback(
    (event: React.PointerEvent) => {
      const state = dragState.current;
      if (!state || state.id !== event.pointerId) return;
      const delta = event.clientX - state.startX;
      const ratio = delta / state.width;
      dragState.current = null;
      setDragOffset(0);
      setPaused(false);
      if (Math.abs(ratio) > 0.12) goTo(index + (ratio < 0 ? 1 : -1));
    },
    [goTo, index],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    },
    [next, prev],
  );

  return {
    index,
    goTo,
    next,
    prev,
    dragOffset,
    dragging: dragOffset !== 0,
    paused,
    setPaused,
    viewportRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown,
    },
  } as const;
}
