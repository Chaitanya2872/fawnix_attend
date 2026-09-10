"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomePage;
var react_router_dom_1 = require("react-router-dom");
var routes_1 = require("../../../app/config/routes");
var SectionHeader_1 = require("../../../components/common/SectionHeader");
var SiteFooter_1 = require("../../../components/layout/SiteFooter");
var MarketingNav_1 = require("../../../components/navigation/MarketingNav");
var DeleteAccountCard_1 = require("../components/DeleteAccountCard");
var HeroSection_1 = require("../components/HeroSection");
var publicContent_1 = require("../constants/publicContent");
function HomePage() {
    var navigate = (0, react_router_dom_1.useNavigate)();
    return (<div className="page">
      <header className="hero" data-animate>
        <MarketingNav_1.MarketingNav onRequestDemo={function () { return navigate(routes_1.appRoutes.admin); }}/>
        <HeroSection_1.HeroSection onGetStarted={function () { return navigate(routes_1.appRoutes.admin); }} onViewTour={function () { return navigate(routes_1.appRoutes.tour); }}/>
      </header>

      <section id="use-cases" className="section" data-animate>
        <SectionHeader_1.SectionHeader eyebrow="Use cases" title="Designed for every operational role." description="Clear visibility for leaders, simple actions for employees."/>
        <div className="grid">
          {publicContent_1.useCases.map(function (item) { return (<article key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>); })}
        </div>
      </section>

      <section id="features" className="section alt" data-animate>
        <SectionHeader_1.SectionHeader eyebrow="What you get" title="Every feature that keeps operations accountable." description="From attendance to approvals, nothing slips through."/>
        <div className="grid features">
          {publicContent_1.features.map(function (item) { return (<article key={item.title} className="card feature">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>); })}
        </div>
      </section>

      <section id="workflow" className="section" data-animate>
        <SectionHeader_1.SectionHeader eyebrow="Workflow" title="One simple flow for every workday."/>
        <div className="timeline">
          {publicContent_1.workflowSteps.map(function (step, index) { return (<div key={step.title} className="timeline-step">
              <div className="step-index">{index + 1}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>); })}
        </div>
      </section>

      <section className="section alt" data-animate>
        <div className="split">
          <div>
            <p className="eyebrow">Security & compliance</p>
            <h2>Built for audit-ready operations.</h2>
            <ul className="list">
              <li>Location-stamped attendance logs</li>
              <li>Exception approvals with manager trails</li>
              <li>Automated reminders and auto clock-out</li>
              <li>Centralized reports for HR and leadership</li>
            </ul>
          </div>
          <div className="panel-card">
            <h3>Operational confidence</h3>
            <p>
              Fawnix keeps compliance simple by capturing the right data
              automatically and presenting it clearly for approvals.
            </p>
            <div className="chip-row">
              <span className="chip">Audit trail</span>
              <span className="chip">Shift rules</span>
              <span className="chip">Manager approvals</span>
            </div>
          </div>
        </div>
      </section>

      <section id="delete" className="section" data-animate>
        <SectionHeader_1.SectionHeader eyebrow="Account control" title="Delete your account securely." description="Enter your Employee ID and OTP to permanently delete your account."/>
        <DeleteAccountCard_1.DeleteAccountCard />
      </section>

      <SiteFooter_1.SiteFooter />
    </div>);
}
