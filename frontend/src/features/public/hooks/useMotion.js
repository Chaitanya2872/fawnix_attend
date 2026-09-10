"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePrefersReducedMotion = usePrefersReducedMotion;
exports.useReveal = useReveal;
exports.useScrollProgress = useScrollProgress;
exports.usePointer3d = usePointer3d;
exports.useCountUp = useCountUp;
exports.useLivePulse = useLivePulse;
exports.useCarousel = useCarousel;
var react_1 = require("react");
/* ─────────────────────────────────────────────────────────────────────────────
   Shared motion primitives for the Fawnix marketing surfaces.
   Zero dependencies, SSR-safe guards, and every effect honours
   `prefers-reduced-motion` so the experience stays accessible.
   ───────────────────────────────────────────────────────────────────────────── */
var REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function usePrefersReducedMotion() {
    var _a = (0, react_1.useState)(false), reduced = _a[0], setReduced = _a[1];
    (0, react_1.useEffect)(function () {
        if (typeof window === "undefined" || !window.matchMedia)
            return;
        var query = window.matchMedia(REDUCED_MOTION_QUERY);
        setReduced(query.matches);
        var onChange = function (event) { return setReduced(event.matches); };
        query.addEventListener("change", onChange);
        return function () { return query.removeEventListener("change", onChange); };
    }, []);
    return reduced;
}
/**
 * Reveals an element the first time it scrolls into view.
 * Returns a ref to attach and a boolean you can map to `data-visible`.
 */
function useReveal(threshold, rootMargin) {
    if (threshold === void 0) { threshold = 0.18; }
    if (rootMargin === void 0) { rootMargin = "0px 0px -12% 0px"; }
    var ref = (0, react_1.useRef)(null);
    var _a = (0, react_1.useState)(false), visible = _a[0], setVisible = _a[1];
    (0, react_1.useEffect)(function () {
        var node = ref.current;
        if (!node)
            return;
        if (typeof IntersectionObserver === "undefined") {
            setVisible(true);
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                var entry = entries_1[_i];
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            }
        }, { threshold: threshold, rootMargin: rootMargin });
        observer.observe(node);
        return function () { return observer.disconnect(); };
    }, [threshold, rootMargin]);
    return { ref: ref, visible: visible };
}
/**
 * Tracks how far the document has been scrolled, 0 → 1.
 * Used for the cinematic progress rail at the top of the tour.
 */
function useScrollProgress() {
    var _a = (0, react_1.useState)(0), progress = _a[0], setProgress = _a[1];
    (0, react_1.useEffect)(function () {
        if (typeof window === "undefined")
            return;
        var frame = 0;
        var measure = function () {
            frame = 0;
            var doc = document.documentElement;
            var scrollable = doc.scrollHeight - window.innerHeight;
            setProgress(scrollable <= 0 ? 0 : Math.min(1, window.scrollY / scrollable));
        };
        var onScroll = function () {
            if (frame)
                return;
            frame = window.requestAnimationFrame(measure);
        };
        measure();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return function () {
            if (frame)
                window.cancelAnimationFrame(frame);
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
function usePointer3d(strength) {
    if (strength === void 0) { strength = 1; }
    var ref = (0, react_1.useRef)(null);
    var reduced = usePrefersReducedMotion();
    (0, react_1.useEffect)(function () {
        var node = ref.current;
        if (!node || reduced)
            return;
        var frame = 0;
        var nextX = 0;
        var nextY = 0;
        var nextGx = 50;
        var nextGy = 50;
        var apply = function () {
            frame = 0;
            node.style.setProperty("--mx", nextX.toFixed(4));
            node.style.setProperty("--my", nextY.toFixed(4));
            node.style.setProperty("--gx", "".concat(nextGx.toFixed(2), "%"));
            node.style.setProperty("--gy", "".concat(nextGy.toFixed(2), "%"));
        };
        var onMove = function (event) {
            var rect = node.getBoundingClientRect();
            if (!rect.width || !rect.height)
                return;
            var ratioX = (event.clientX - rect.left) / rect.width;
            var ratioY = (event.clientY - rect.top) / rect.height;
            nextGx = ratioX * 100;
            nextGy = ratioY * 100;
            nextX = (ratioX - 0.5) * 2 * strength;
            nextY = (ratioY - 0.5) * 2 * strength;
            if (!frame)
                frame = window.requestAnimationFrame(apply);
        };
        var onLeave = function () {
            nextX = 0;
            nextY = 0;
            nextGx = 50;
            nextGy = 50;
            if (!frame)
                frame = window.requestAnimationFrame(apply);
        };
        node.addEventListener("pointermove", onMove);
        node.addEventListener("pointerleave", onLeave);
        return function () {
            if (frame)
                window.cancelAnimationFrame(frame);
            node.removeEventListener("pointermove", onMove);
            node.removeEventListener("pointerleave", onLeave);
        };
    }, [reduced, strength]);
    return ref;
}
/** Eased count-up used for the metric bands. */
function useCountUp(target, active, duration) {
    if (duration === void 0) { duration = 1500; }
    var _a = (0, react_1.useState)(0), value = _a[0], setValue = _a[1];
    var reduced = usePrefersReducedMotion();
    (0, react_1.useEffect)(function () {
        if (!active)
            return;
        if (reduced || duration <= 0) {
            setValue(target);
            return;
        }
        var frame = 0;
        var start = 0;
        var tick = function (now) {
            if (!start)
                start = now;
            var elapsed = now - start;
            var t = Math.min(1, elapsed / duration);
            // easeOutExpo — fast lift, gentle settle
            var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            setValue(target * eased);
            if (t < 1)
                frame = window.requestAnimationFrame(tick);
        };
        frame = window.requestAnimationFrame(tick);
        return function () { return window.cancelAnimationFrame(frame); };
    }, [active, duration, reduced, target]);
    return value;
}
/** A slow, always-running tick used for "live" mock data in the demo screens. */
function useLivePulse(interval) {
    if (interval === void 0) { interval = 2600; }
    var _a = (0, react_1.useState)(0), beat = _a[0], setBeat = _a[1];
    var reduced = usePrefersReducedMotion();
    (0, react_1.useEffect)(function () {
        if (reduced)
            return;
        var id = window.setInterval(function () { return setBeat(function (value) { return value + 1; }); }, interval);
        return function () { return window.clearInterval(id); };
    }, [interval, reduced]);
    return beat;
}
/**
 * Minimal, dependency-free carousel engine: autoplay, pointer dragging,
 * keyboard support and wrap-around navigation.
 */
function useCarousel(count, autoplayMs) {
    if (autoplayMs === void 0) { autoplayMs = 7000; }
    var _a = (0, react_1.useState)(0), index = _a[0], setIndex = _a[1];
    var _b = (0, react_1.useState)(0), dragOffset = _b[0], setDragOffset = _b[1];
    var _c = (0, react_1.useState)(false), paused = _c[0], setPaused = _c[1];
    var viewportRef = (0, react_1.useRef)(null);
    var dragState = (0, react_1.useRef)(null);
    var reduced = usePrefersReducedMotion();
    var goTo = (0, react_1.useCallback)(function (next) {
        setIndex(((next % count) + count) % count);
    }, [count]);
    var next = (0, react_1.useCallback)(function () { return goTo(index + 1); }, [goTo, index]);
    var prev = (0, react_1.useCallback)(function () { return goTo(index - 1); }, [goTo, index]);
    (0, react_1.useEffect)(function () {
        if (reduced || paused || autoplayMs <= 0 || count < 2)
            return;
        var id = window.setTimeout(function () { return goTo(index + 1); }, autoplayMs);
        return function () { return window.clearTimeout(id); };
    }, [autoplayMs, count, goTo, index, paused, reduced]);
    var onPointerDown = (0, react_1.useCallback)(function (event) {
        var node = viewportRef.current;
        if (!node)
            return;
        if (event.pointerType === "mouse" && event.button !== 0)
            return;
        var rect = node.getBoundingClientRect();
        dragState.current = {
            id: event.pointerId,
            startX: event.clientX,
            width: rect.width || 1,
        };
        setPaused(true);
    }, []);
    var onPointerMove = (0, react_1.useCallback)(function (event) {
        var state = dragState.current;
        if (!state || state.id !== event.pointerId)
            return;
        var delta = event.clientX - state.startX;
        setDragOffset((delta / state.width) * 100);
    }, []);
    var endDrag = (0, react_1.useCallback)(function (event) {
        var state = dragState.current;
        if (!state || state.id !== event.pointerId)
            return;
        var delta = event.clientX - state.startX;
        var ratio = delta / state.width;
        dragState.current = null;
        setDragOffset(0);
        setPaused(false);
        if (Math.abs(ratio) > 0.12)
            goTo(index + (ratio < 0 ? 1 : -1));
    }, [goTo, index]);
    var onKeyDown = (0, react_1.useCallback)(function (event) {
        if (event.key === "ArrowRight") {
            event.preventDefault();
            next();
        }
        else if (event.key === "ArrowLeft") {
            event.preventDefault();
            prev();
        }
    }, [next, prev]);
    return {
        index: index,
        goTo: goTo,
        next: next,
        prev: prev,
        dragOffset: dragOffset,
        dragging: dragOffset !== 0,
        paused: paused,
        setPaused: setPaused,
        viewportRef: viewportRef,
        handlers: {
            onPointerDown: onPointerDown,
            onPointerMove: onPointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
            onKeyDown: onKeyDown,
        },
    };
}
