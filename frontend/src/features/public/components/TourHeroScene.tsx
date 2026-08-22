import { usePointer3d } from "../hooks/useMotion";
import fawnixBg from "../../../assets/fawnix_bg.png";

/* ─────────────────────────────────────────────────────────────────────────────
   A true CSS-3D hero: five parallax planes inside a shared perspective,
   tilted by pointer position. No WebGL, no dependencies, ~60fps because every
   transform is composited and driven from CSS custom properties.
   ───────────────────────────────────────────────────────────────────────────── */

export function TourHeroScene() {
  const stageRef = usePointer3d<HTMLDivElement>(1);

  return (
    <div className="hero3d" ref={stageRef} aria-hidden="true">
      <div className="hero3d-stage">
        {/* depth −4 · orbit rings */}
        <div className="hero3d-plane hero3d-rings" data-depth="4">
          <span />
          <span />
          <span />
        </div>

        {/* depth −3 · the globe of connected sites */}
        <div className="hero3d-plane hero3d-globe" data-depth="3">
          <svg viewBox="0 0 240 240">
            <defs>
              <radialGradient id="hero-globe" cx="34%" cy="28%" r="76%">
                <stop offset="0%" stopColor="#1c6b52" />
                <stop offset="100%" stopColor="#082b21" />
              </radialGradient>
            </defs>
            <circle cx="120" cy="120" r="86" fill="url(#hero-globe)" />
            <g className="hero3d-meridians">
              <ellipse cx="120" cy="120" rx="86" ry="86" />
              <ellipse cx="120" cy="120" rx="30" ry="86" />
              <ellipse cx="120" cy="120" rx="60" ry="86" />
              <ellipse cx="120" cy="120" rx="86" ry="30" />
              <ellipse cx="120" cy="120" rx="86" ry="60" />
            </g>
            <g className="hero3d-sites">
              <circle cx="92" cy="78" r="4" />
              <circle cx="152" cy="104" r="4" />
              <circle cx="106" cy="152" r="4" />
              <circle cx="164" cy="164" r="3.4" />
            </g>
          </svg>
        </div>

        {/* depth −2 · attendance rhythm card */}
        <div className="hero3d-plane hero3d-card hero3d-rhythm" data-depth="2">
          <header>
            <small>Attendance rhythm</small>
            <b>94.2%</b>
          </header>
          <div className="hero3d-bars">
            {[46, 62, 54, 78, 68, 88, 96].map((height, index) => (
              <i
                key={index}
                style={
                  {
                    "--h": `${height}%`,
                    "--d": `${index * 110}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>

        {/* depth −1 · live presence card */}
        <div
          className="hero3d-plane hero3d-card hero3d-presence"
          data-depth="1"
        >
          <span className="hero3d-live">
            <i />
            live
          </span>
          <strong>128</strong>
          <small>present of 136</small>
          <div className="hero3d-faces">
            {["AK", "RM", "NS", "VP"].map((initials, index) => (
              <b key={initials} data-tone={index % 4}>
                {initials}
              </b>
            ))}
            <b className="more">+124</b>
          </div>
        </div>

        {/* depth 0 · brand medallion */}
        <div className="hero3d-plane hero3d-badge" data-depth="0">
          <img src={fawnixBg} alt="" />
        </div>

        {/* floating micro-pills */}
        <div className="hero3d-plane hero3d-pill is-one" data-depth="2">
          <i />
          Clock-in verified
        </div>
        <div className="hero3d-plane hero3d-pill is-two" data-depth="1">
          <i />
          Route synced
        </div>
        <div className="hero3d-plane hero3d-pill is-three" data-depth="3">
          <i />
          Approval cleared
        </div>
      </div>
    </div>
  );
}
