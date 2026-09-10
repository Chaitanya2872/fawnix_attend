"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProductTourPage;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var routes_1 = require("../../../app/config/routes");
var SiteFooter_1 = require("../../../components/layout/SiteFooter");
var fawnix_bg_png_1 = require("../../../assets/fawnix_bg.png");
var TourHeroScene_1 = require("../components/TourHeroScene");
var TourScenes_1 = require("../components/TourScenes");
var TourScreenWall_1 = require("../components/TourScreenWall");
var tourContent_1 = require("../constants/tourContent");
var useMotion_1 = require("../hooks/useMotion");
var usePublicStats_1 = require("../hooks/usePublicStats");
require("./ProductTourPage.css");
/* ── small building blocks ────────────────────────────────────────────────── */
function Reveal(_a) {
    var children = _a.children, _b = _a.className, className = _b === void 0 ? "" : _b, _c = _a.delay, delay = _c === void 0 ? 0 : _c, _d = _a.as, Tag = _d === void 0 ? "div" : _d;
    var _e = (0, useMotion_1.useReveal)(), ref = _e.ref, visible = _e.visible;
    return (<Tag ref={ref} className={"tr-reveal ".concat(className).trim()} data-visible={visible || undefined} style={delay ? { "--d": "".concat(delay, "ms") } : undefined}>
      {children}
    </Tag>);
}
function MetricValue(_a) {
    var value = _a.value, suffix = _a.suffix, decimals = _a.decimals, active = _a.active, delay = _a.delay;
    var shown = (0, useMotion_1.useCountUp)(value, active, 1400 + delay);
    return (<strong>
      {shown.toFixed(decimals)}
      <span>{suffix}</span>
    </strong>);
}
/**
 * The metrics band mirrors real workspace numbers when the API answers, and
 * keeps the curated copy as a shape-compatible fallback otherwise.
 */
function buildLiveMetrics(stats) {
    if (!stats.isLive)
        return tourContent_1.tourMetrics;
    return [
        {
            value: stats.attendanceRate,
            suffix: "%",
            decimals: 1,
            label: "Attendance today",
            note: "".concat(stats.presentLabel, " of ").concat(stats.headcountLabel, " verified in"),
        },
        {
            value: stats.headcount,
            suffix: "",
            decimals: 0,
            label: "People on the roll",
            note: "".concat(stats.departments, " departments connected"),
        },
        {
            value: stats.attendanceRecords,
            suffix: "",
            decimals: 0,
            label: "Attendance records",
            note: "Every clock-in retained",
        },
        {
            value: stats.decisionsRecorded,
            suffix: "",
            decimals: 0,
            label: "Decisions audited",
            note: "".concat(stats.approvalsLabel, " awaiting review now"),
        },
    ];
}
/* ── top navigation ───────────────────────────────────────────────────────── */
function TourNav(_a) {
    var onEnter = _a.onEnter, stats = _a.stats;
    var _b = (0, react_1.useState)(false), lifted = _b[0], setLifted = _b[1];
    (0, react_1.useEffect)(function () {
        var onScroll = function () { return setLifted(window.scrollY > 24); };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return function () { return window.removeEventListener("scroll", onScroll); };
    }, []);
    return (<nav className="tr-nav" data-lifted={lifted || undefined}>
      <a className="tr-nav-brand" href={routes_1.appRoutes.home}>
        <img src={fawnix_bg_png_1.default} alt=""/>
        <span>
          <strong>Fawnix</strong>
          <small>Product tour</small>
        </span>
      </a>

      <div className="tr-nav-live" data-live={stats.isLive || undefined}>
        <i aria-hidden="true"/>
        <span>
          <b>{stats.rateLabel}</b> attendance today
        </span>
        <small>
          {stats.presentLabel}/{stats.headcountLabel} in
        </small>
      </div>

      <div className="tr-nav-actions">
        <a href={routes_1.appRoutes.home}>Overview</a>
        <button className="tr-btn is-solid" onClick={onEnter} type="button">
          Enter workspace
          <svg viewBox="0 0 14 14" aria-hidden="true">
            <path d="M3 11 11 3M5 3h6v6"/>
          </svg>
        </button>
      </div>
    </nav>);
}
/* ── page ─────────────────────────────────────────────────────────────────── */
function ProductTourPage() {
    var navigate = (0, react_router_dom_1.useNavigate)();
    var enter = function () { return navigate(routes_1.appRoutes.admin); };
    /* live workspace numbers ------------------------------------------------ */
    var stats = (0, usePublicStats_1.usePublicStats)();
    var metrics = buildLiveMetrics(stats);
    /* chapter deck ---------------------------------------------------------- */
    var deck = (0, useMotion_1.useCarousel)(tourContent_1.tourChapters.length, 9000);
    var chapter = tourContent_1.tourChapters[deck.index];
    var deckReveal = (0, useMotion_1.useReveal)(0.12);
    var sceneTiltRef = (0, useMotion_1.usePointer3d)(0.55);
    /* metrics --------------------------------------------------------------- */
    var metricsReveal = (0, useMotion_1.useReveal)(0.3);
    /* outcome slider -------------------------------------------------------- */
    var outcomes = (0, useMotion_1.useCarousel)(tourContent_1.tourOutcomes.length, 6500);
    /* keep the chapter strip scrolled to the active pill -------------------- */
    var stripRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var strip = stripRef.current;
        if (!strip)
            return;
        var active = strip.querySelector("[data-active='true']");
        if (!active)
            return;
        var offset = active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2;
        strip.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
    }, [deck.index]);
    return (<div className="page tour-page" style={{
            "--accent": chapter.accent,
            "--accent-soft": chapter.accentSoft,
        }}>
      {/* ── hero ────────────────────────────────────────────────────────── */}
      <header className="tr-hero">
        <div className="tr-hero-aura" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="tr-hero-grain" aria-hidden="true"/>

        <TourNav onEnter={enter} stats={stats}/>

        <div className="tr-hero-inner">
          <div className="tr-hero-copy">
            <span className="tr-eyebrow">
              <i />A guided look inside Fawnix
            </span>
            <h1>
              <span style={{ "--d": "0ms" }}>
                Workforce operations,
              </span>
              <span style={{ "--d": "110ms" }}>
                with a point of{" "}
                <em>
                  view
                  <svg viewBox="0 0 200 12" aria-hidden="true">
                    <path d="M2 8c46-7 104-8 196-4"/>
                  </svg>
                </em>
                .
              </span>
            </h1>
            <p className="tr-hero-lead">
              Six connected chapters. Attendance you can prove, approvals that
              stop chasing, field work you can actually see — and one calmer way
              to run the workday.
            </p>
            <div className="tr-hero-actions">
              <button className="tr-btn is-solid is-lg" onClick={enter} type="button">
                Enter Fawnix
                <svg viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 11 11 3M5 3h6v6"/>
                </svg>
              </button>
              <a className="tr-btn is-quiet is-lg" href="#chapters">
                Start the tour
                <svg viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M7 2v10M3 8l4 4 4-4"/>
                </svg>
              </a>
            </div>
            <dl className="tr-hero-facts">
              <div>
                <dt>{stats.headcountLabel}</dt>
                <dd>people on the roll</dd>
              </div>
              <div>
                <dt>{stats.presentLabel}</dt>
                <dd>verified in today</dd>
              </div>
              <div>
                <dt>{stats.departments}</dt>
                <dd>departments connected</dd>
              </div>
            </dl>
          </div>

          <TourHeroScene_1.TourHeroScene />
        </div>

        {/* capability marquee */}
        <div className="tr-marquee" aria-hidden="true">
          <div className="tr-marquee-track">
            {[0, 1].map(function (copy) { return (<div className="tr-marquee-group" key={copy}>
                {tourContent_1.tourCapabilities.map(function (item) { return (<span key={"".concat(copy, "-").concat(item)}>
                    <i />
                    {item}
                  </span>); })}
              </div>); })}
          </div>
        </div>
      </header>

      <main className="tr-main">
        {/* ── metrics band ──────────────────────────────────────────────── */}
        <section className="tr-metrics" ref={metricsReveal.ref}>
          {metrics.map(function (metric, index) { return (<div className="tr-metric" key={metric.label} data-visible={metricsReveal.visible || undefined} style={{ "--d": "".concat(index * 90, "ms") }}>
              <MetricValue value={metric.value} suffix={metric.suffix} decimals={metric.decimals} active={metricsReveal.visible} delay={index * 90}/>
              <b>{metric.label}</b>
              <small>{metric.note}</small>
            </div>); })}
        </section>

        {/* ── chapter deck ──────────────────────────────────────────────── */}
        <section className="tr-deck" id="chapters" ref={deckReveal.ref}>
          <Reveal className="tr-section-head">
            <span className="tr-eyebrow">
              <i />
              Explore the workspace
            </span>
            <h2>From signal to decision.</h2>
            <p>
              Drag, swipe, or use the arrow keys — first the admin workspace,
              then the same modules as they ship on the phone.
            </p>
          </Reveal>

          <div className="tr-chapter-strip" ref={stripRef} role="tablist">
            {tourContent_1.tourChapters.map(function (item, index) { return (<button key={item.id} type="button" role="tab" aria-selected={deck.index === index} data-active={deck.index === index} onClick={function () { return deck.goTo(index); }} style={{
                "--pill-accent": item.accent,
            }}>
                <span>{item.number}</span>
                {item.label}
              </button>); })}
          </div>

          <div className="tr-deck-body" data-visible={deckReveal.visible || undefined}>
            {/* narrative column */}
            <div className="tr-deck-copy" key={chapter.id}>
              <span className="tr-deck-number">{chapter.number}</span>
              <span className="tr-eyebrow">
                <i />
                {chapter.eyebrow}
              </span>
              <h3>{chapter.title}</h3>
              <p>{chapter.body}</p>

              <ul className="tr-deck-highlights">
                {chapter.highlights.map(function (item, index) { return (<li key={item.term} style={{ "--d": "".concat(140 + index * 90, "ms") }}>
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3.5 8.5 6.5 11.5 12.5 4.5"/>
                    </svg>
                    <span>
                      <strong>{item.term}</strong>
                      {item.detail}
                    </span>
                  </li>); })}
              </ul>

              <div className="tr-deck-tags">
                {chapter.tags.map(function (tag) { return (<span key={tag}>{tag}</span>); })}
              </div>

              <div className="tr-deck-controls">
                <button type="button" className="tr-round" onClick={deck.prev} aria-label="Previous chapter">
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M10 3 5 8l5 5"/>
                  </svg>
                </button>
                <button type="button" className="tr-round" onClick={deck.next} aria-label="Next chapter">
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M6 3l5 5-5 5"/>
                  </svg>
                </button>
                <div className="tr-deck-count">
                  <b>{chapter.number}</b>
                  <i />
                  <span>{String(tourContent_1.tourChapters.length).padStart(2, "0")}</span>
                </div>
                <div className="tr-deck-dots">
                  {tourContent_1.tourChapters.map(function (item, index) { return (<button key={item.id} type="button" aria-label={"Go to ".concat(item.label)} data-active={deck.index === index} onClick={function () { return deck.goTo(index); }}/>); })}
                </div>
              </div>
            </div>

            {/* the sliding screens */}
            <div className="tr-deck-viewport" ref={deck.viewportRef} tabIndex={0} role="group" aria-label="Product screens" onMouseEnter={function () { return deck.setPaused(true); }} onMouseLeave={function () { return deck.setPaused(false); }} {...deck.handlers}>
              <div className="tr-deck-tilt" ref={sceneTiltRef}>
                <div className="tr-deck-track" data-dragging={deck.dragOffset !== 0 || undefined} style={{
            transform: "translate3d(calc(".concat(-deck.index * 100, "% + ").concat(deck.dragOffset, "%), 0, 0)"),
        }}>
                  {tourContent_1.tourChapters.map(function (item, index) { return (<div className="tr-deck-slide" key={item.id} data-active={deck.index === index} aria-hidden={deck.index !== index}>
                      <TourScenes_1.TourScene scene={item.id}/>
                    </div>); })}
                </div>
                <span className="tr-deck-glow" aria-hidden="true"/>
              </div>
              <span className="tr-deck-hint">drag to explore</span>
            </div>
          </div>

          {/* The same modules, as shipped on the phone. Screenshots bind
            themselves from src/assets/screens — see that folder's README. */}
          <TourScreenWall_1.TourScreenWall />
        </section>

        {/* ── the daily loop ────────────────────────────────────────────── */}
        <section className="tr-loop">
          <Reveal className="tr-section-head is-center">
            <span className="tr-eyebrow">
              <i />
              One day, end to end
            </span>
            <h2>The loop that closes itself.</h2>
            <p>
              Four beats, no follow-up messages. Fawnix records the workday as
              it happens and settles the numbers when it ends.
            </p>
          </Reveal>

          <div className="tr-loop-rail">
            <span className="tr-loop-line" aria-hidden="true"/>
            {tourContent_1.tourDayLoop.map(function (step, index) { return (<Reveal className="tr-loop-step" key={step.title} delay={index * 120}>
                <b>{step.time}</b>
                <i aria-hidden="true">
                  <em>{index + 1}</em>
                </i>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </Reveal>); })}
          </div>
        </section>

        {/* ── outcome slider ────────────────────────────────────────────── */}
        <section className="tr-outcomes">
          <Reveal className="tr-section-head">
            <span className="tr-eyebrow">
              <i />
              Built for how teams actually work
            </span>
            <h2>Four operating realities, one workspace.</h2>
          </Reveal>

          <div className="tr-outcome-shell" onMouseEnter={function () { return outcomes.setPaused(true); }} onMouseLeave={function () { return outcomes.setPaused(false); }}>
            <div className="tr-outcome-viewport" ref={outcomes.viewportRef} tabIndex={0} role="group" aria-label="Outcomes by team" {...outcomes.handlers}>
              <div className="tr-outcome-track" style={{
            transform: "translate3d(calc(".concat(-outcomes.index * 100, "% + ").concat(outcomes.dragOffset, "%), 0, 0)"),
        }} data-dragging={outcomes.dragOffset !== 0 || undefined}>
                {tourContent_1.tourOutcomes.map(function (item, index) { return (<article className="tr-outcome" key={item.role} data-active={outcomes.index === index}>
                    <header>
                      <span>{item.role}</span>
                      <small>{item.team}</small>
                    </header>
                    <blockquote>{item.quote}</blockquote>
                    <footer>
                      <strong>{item.metric}</strong>
                      <small>{item.metricLabel}</small>
                    </footer>
                  </article>); })}
              </div>
            </div>

            <div className="tr-outcome-nav">
              <button type="button" className="tr-round" onClick={outcomes.prev} aria-label="Previous outcome">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M10 3 5 8l5 5"/>
                </svg>
              </button>
              <div className="tr-outcome-dots">
                {tourContent_1.tourOutcomes.map(function (item, index) { return (<button key={item.role} type="button" aria-label={"Go to ".concat(item.role)} data-active={outcomes.index === index} onClick={function () { return outcomes.goTo(index); }}/>); })}
              </div>
              <button type="button" className="tr-round" onClick={outcomes.next} aria-label="Next outcome">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M6 3l5 5-5 5"/>
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── closing call to action ────────────────────────────────────── */}
        <Reveal className="tr-cta" as="section">
          <div className="tr-cta-glow" aria-hidden="true"/>
          <span className="tr-eyebrow is-light">
            <i />
            Ready when you are
          </span>
          <h2>Make the workday easier to see.</h2>
          <p>
            Bring attendance, approvals, field activity and reporting into one
            confident rhythm — and give every decision a record worth keeping.
          </p>
          <div className="tr-cta-actions">
            <button className="tr-btn is-lime is-lg" onClick={enter} type="button">
              Get started with Fawnix
              <svg viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 11 11 3M5 3h6v6"/>
              </svg>
            </button>
            <a className="tr-btn is-outline-light is-lg" href={routes_1.appRoutes.home}>
              Read the overview
            </a>
          </div>
        </Reveal>
      </main>

      <SiteFooter_1.SiteFooter />
    </div>);
}
