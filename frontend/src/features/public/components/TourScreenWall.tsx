import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { appScreens, type AppScreen } from "../constants/appScreens";
import { usePrefersReducedMotion, useReveal } from "../hooks/useMotion";

/* ─────────────────────────────────────────────────────────────────────────────
   Device wall — the real mobile app, presented as an orbiting carousel of
   phones. The active handset sits face-on while its neighbours recede in 3D,
   so ten screens read as one instrument instead of a contact sheet.

   Screenshots bind themselves: drop files into `src/assets/screens/` and they
   attach to the matching entry in `appScreens`. Screens without a file render
   an animated mock, so the wall is never broken and never empty.
   ───────────────────────────────────────────────────────────────────────────── */

/* Eager glob: paths are static, so Vite inlines the URLs at build time. An
   empty folder simply yields an empty object — no runtime cost, no 404s. */
const shotModules = import.meta.glob<string>(
  "../../../assets/screens/*.{png,jpg,jpeg,webp,avif}",
  { eager: true, import: "default" },
);

type WallScreen = AppScreen & { src: string | null };

/** Pairs dropped files with screens by slug, then fills gaps in file order. */
function bindScreenshots(): WallScreen[] {
  const files = Object.entries(shotModules)
    .map(([path, src]) => ({
      name: (path.split("/").pop() ?? "").toLowerCase(),
      src,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));

  const taken = new Set<string>();
  const bound = new Map<string, string>();

  for (const screen of appScreens) {
    const hit = files.find(
      (file) => !taken.has(file.name) && file.name.includes(screen.slug),
    );
    if (hit) {
      taken.add(hit.name);
      bound.set(screen.id, hit.src);
    }
  }

  const spare = files.filter((file) => !taken.has(file.name));
  let cursor = 0;
  for (const screen of appScreens) {
    if (bound.has(screen.id) || cursor >= spare.length) continue;
    bound.set(screen.id, spare[cursor++].src);
  }

  return appScreens.map((screen) => ({
    ...screen,
    src: bound.get(screen.id) ?? null,
  }));
}

const screens = bindScreenshots();
const COUNT = screens.length;
/** How long a handset holds centre stage before the wall rotates on. */
const DWELL = 4600;
/** Beyond this distance from centre a phone is parked to keep paint cheap. */
const VISIBLE_SPAN = 3;

const wrap = (value: number) => ((value % COUNT) + COUNT) % COUNT;

/** Shortest signed distance from the active index, so the orbit wraps. */
const offsetFrom = (index: number, focus: number) => {
  const half = COUNT / 2;
  let offset = index - focus;
  if (offset > half) offset -= COUNT;
  if (offset < -half) offset += COUNT;
  return offset;
};

/* ── mock screen bodies (used until a real screenshot is dropped in) ──────── */

const MOCK_ROWS: Record<string, { label: string; value: string }[]> = {
  clockout: [
    { label: "Clock in", value: "09:02" },
    { label: "Break", value: "13:10" },
    { label: "Field visit", value: "15:45" },
  ],
  exceptions: [
    { label: "Late arrival", value: "Approved" },
    { label: "Early leave", value: "Pending" },
    { label: "Late arrival", value: "Approved" },
  ],
  compoff: [
    { label: "Overtime · 2h 15m", value: "Credited" },
    { label: "Overtime · 1h 40m", value: "Pending" },
    { label: "Comp off used", value: "1 day" },
  ],
  notifications: [
    { label: "Leave approved", value: "now" },
    { label: "Shift reminder", value: "2h" },
    { label: "Out of range", value: "6h" },
  ],
};

function ScreenMock({ screen }: { screen: WallScreen }) {
  const rows = MOCK_ROWS[screen.id] ?? MOCK_ROWS.clockout;

  return (
    <span className="tw-mock" data-kind={screen.kind} aria-hidden="true">
      <span className="tw-mock-status">
        <b>9:41</b>
        <em />
      </span>

      <span className="tw-mock-head">
        <i className="tw-mock-back" />
        <b>{screen.label}</b>
        <i className="tw-mock-avatar" />
      </span>

      {screen.kind === "rows" && (
        <>
          <span className="tw-mock-hero">
            <b>08:24</b>
            <em>Hours today</em>
            <i />
          </span>
          {rows.map((row, index) => (
            <span
              className="tw-mock-row"
              key={row.label}
              style={{ "--i": index } as CSSProperties}
            >
              <i />
              <b>{row.label}</b>
              <em>{row.value}</em>
            </span>
          ))}
        </>
      )}

      {screen.kind === "chat" && (
        <span className="tw-mock-chat">
          <span className="tw-bubble is-them">How many leaves do I have?</span>
          <span className="tw-bubble is-me">
            You have 8 casual and 4 sick days left this year.
          </span>
          <span className="tw-bubble is-them">Apply one for Friday</span>
          <span className="tw-typing">
            <i />
            <i />
            <i />
          </span>
        </span>
      )}

      {screen.kind === "grid" && (
        <span className="tw-mock-grid">
          {Array.from({ length: 21 }).map((_, index) => (
            <i
              key={index}
              data-on={index % 7 === 5 || index === 9 ? "" : undefined}
              style={{ "--i": index } as CSSProperties}
            />
          ))}
        </span>
      )}

      {screen.kind === "menu" && (
        <span className="tw-mock-menu">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} style={{ "--i": index } as CSSProperties}>
              <i />
              <b />
              <em />
            </span>
          ))}
        </span>
      )}

      {screen.kind === "sheet" && (
        <span className="tw-mock-sheet">
          <b>Name this note</b>
          <span className="tw-mock-field">
            Weekly ops review
            <i />
          </span>
          <span className="tw-mock-wave">
            {Array.from({ length: 22 }).map((_, index) => (
              <i key={index} style={{ "--i": index } as CSSProperties} />
            ))}
          </span>
          <span className="tw-mock-cta">Add audio</span>
        </span>
      )}

      {screen.kind === "ring" && (
        <>
          <span className="tw-mock-ring">
            <svg viewBox="0 0 72 72">
              <circle className="tw-ring-track" cx="36" cy="36" r="28" />
              <circle className="tw-ring-arc" cx="36" cy="36" r="28" />
            </svg>
            <b>12</b>
          </span>
          {["Casual · 8", "Sick · 4", "Earned · 6"].map((row, index) => (
            <span
              className="tw-mock-row"
              key={row}
              style={{ "--i": index } as CSSProperties}
            >
              <i />
              <b>{row}</b>
              <em>left</em>
            </span>
          ))}
        </>
      )}

      <span className="tw-mock-tabs">
        <i data-on="" />
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

/* ── the wall ────────────────────────────────────────────────────────────── */

export function TourScreenWall() {
  const { ref: revealRef, visible } = useReveal<HTMLDivElement>(0.12);
  const reduced = usePrefersReducedMotion();

  const [focus, setFocus] = useState(0);
  const [held, setHeld] = useState(false);
  /** Live drag distance expressed in orbit slots, so CSS can follow the hand. */
  const [drag, setDrag] = useState(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ id: number; x: number; width: number } | null>(
    null,
  );
  /** Set once a drag passes the slop threshold, to swallow the trailing click. */
  const moved = useRef(false);

  const active = screens[focus] ?? screens[0];
  const paused = held || drag !== 0;

  const goTo = useCallback((next: number) => setFocus(wrap(next)), []);

  /* Autoplay keeps the wall alive, and parks the moment a visitor takes over. */
  useEffect(() => {
    if (reduced || paused || !visible || COUNT < 2) return;
    const id = window.setTimeout(
      () => setFocus((current) => wrap(current + 1)),
      DWELL,
    );
    return () => window.clearTimeout(id);
  }, [focus, paused, reduced, visible]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const box = stageRef.current?.getBoundingClientRect();
    dragState.current = {
      id: event.pointerId,
      x: event.clientX,
      width: box?.width || 1,
    };
    moved.current = false;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || state.id !== event.pointerId) return;
    const delta = event.clientX - state.x;
    if (Math.abs(delta) > 6) moved.current = true;
    /* A third of the stage width equals one slot — heavy enough to feel
       physical, light enough to flick through several screens. */
    setDrag((delta / (state.width / 3)) * -1);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || state.id !== event.pointerId) return;
    dragState.current = null;
    const steps = Math.round(drag);
    setDrag(0);
    if (steps !== 0) goTo(focus + steps);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(focus + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(focus - 1);
    }
  };

  const shotCount = useMemo(
    () => screens.filter((screen) => screen.src).length,
    [],
  );

  return (
    <div
      className="tw-wall"
      ref={revealRef}
      data-visible={visible || undefined}
      style={{ "--accent": active.accent } as CSSProperties}
    >
      <div className="tw-head">
        <span className="tr-eyebrow">
          <i />
          {shotCount > 0 ? "Straight from the app" : "On the phone"}
        </span>
        <h3>The workspace in your pocket.</h3>
        <p>
          Ten screens people actually use every day. Drag the wall, tap a
          handset, or use the arrow keys.
        </p>
      </div>

      <div
        className="tw-stage"
        ref={stageRef}
        tabIndex={0}
        role="group"
        aria-label="Fawnix mobile app screens"
        data-dragging={drag !== 0 || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => setHeld(false)}
        onPointerEnter={() => setHeld(true)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        onKeyDown={onKeyDown}
      >
        <span className="tw-stage-glow" aria-hidden="true" />
        <span className="tw-stage-grid" aria-hidden="true" />

        <div className="tw-orbit">
          {screens.map((screen, index) => {
            const offset = offsetFrom(index, focus) + drag;
            const distance = Math.abs(offset);
            const isActive = distance < 0.5;

            return (
              <button
                type="button"
                className="tw-phone"
                key={screen.id}
                tabIndex={-1}
                aria-label={`Show ${screen.label}`}
                aria-current={isActive || undefined}
                data-active={isActive || undefined}
                data-far={distance > VISIBLE_SPAN || undefined}
                data-side={offset < 0 ? "left" : "right"}
                style={
                  {
                    "--off": offset.toFixed(3),
                    "--abs": distance.toFixed(3),
                    "--depth": Math.min(distance, VISIBLE_SPAN + 1).toFixed(3),
                    "--accent": screen.accent,
                    zIndex: 100 - Math.round(distance * 10),
                  } as CSSProperties
                }
                onClick={() => {
                  if (moved.current) return;
                  goTo(index);
                }}
              >
                <span className="tw-phone-body">
                  {screen.src ? (
                    <img
                      className="tw-phone-shot"
                      src={screen.src}
                      alt={`${screen.label} screen in the Fawnix mobile app`}
                      loading={index < 3 ? "eager" : "lazy"}
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <ScreenMock screen={screen} />
                  )}
                  <span className="tw-phone-notch" aria-hidden="true" />
                  <span className="tw-phone-sheen" aria-hidden="true" />
                  <span className="tw-phone-scan" aria-hidden="true" />
                </span>
                <span className="tw-phone-shadow" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <span className="tw-hint" aria-hidden="true">
          drag · tap a screen
        </span>
      </div>

      <div className="tw-readout">
        <div className="tw-readout-copy" key={active.id}>
          <span className="tw-readout-meta">{active.meta}</span>
          <strong>{active.title}</strong>
          <p>{active.caption}</p>
        </div>

        <div className="tw-nav">
          <button
            type="button"
            onClick={() => goTo(focus - 1)}
            aria-label="Previous screen"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3 5 8l5 5" />
            </svg>
          </button>
          <span className="tw-count">
            <b>{String(focus + 1).padStart(2, "0")}</b>
            <i />
            {String(COUNT).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => goTo(focus + 1)}
            aria-label="Next screen"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
          <span
            className="tw-dwell"
            key={`${active.id}-dwell`}
            data-hold={paused || reduced || undefined}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="tw-rail" role="tablist" aria-label="App screens">
        {screens.map((screen, index) => (
          <button
            key={screen.id}
            type="button"
            role="tab"
            aria-selected={index === focus}
            data-active={index === focus || undefined}
            style={{ "--accent": screen.accent } as CSSProperties}
            onClick={() => goTo(index)}
          >
            {screen.label}
          </button>
        ))}
      </div>
    </div>
  );
}
