"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingNav = MarketingNav;
var react_router_dom_1 = require("react-router-dom");
var fawnix_bg_png_1 = require("../../assets/fawnix_bg.png");
var routes_1 = require("../../app/config/routes");
function MarketingNav(_a) {
    var onRequestDemo = _a.onRequestDemo;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var handleRequestDemo = function () {
        if (onRequestDemo) {
            onRequestDemo();
            return;
        }
        navigate(routes_1.appRoutes.admin);
    };
    return (<nav className="nav">
      <div className="brand">
        <img className="brand-mark brand-mark-logo" src={fawnix_bg_png_1.default} alt="Fawnix logo"/>
        <div>
          <div className="brand-name">Fawnix</div>
          <div className="brand-tag">Workforce Operations Suite</div>
        </div>
      </div>
      <div className="nav-links">
        <a href={routes_1.appRoutes.tour}>Product tour</a>
        <a href="#use-cases">Use cases</a>
        <a href="#features">Features</a>
        <a href="#workflow">Workflow</a>
        <a href="#delete">Delete account</a>
      </div>
      <button className="cta" onClick={handleRequestDemo} type="button">
        Request Demo
      </button>
    </nav>);
}
