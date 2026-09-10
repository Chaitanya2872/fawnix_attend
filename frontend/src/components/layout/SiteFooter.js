"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteFooter = SiteFooter;
var react_router_dom_1 = require("react-router-dom");
var routes_1 = require("../../app/config/routes");
function SiteFooter() {
    return (<footer className="footer">
      <div>
        <strong>Fawnix</strong>
        <p>Modern workforce operations for distributed teams.</p>
      </div>
      <div className="footer-links">
        <react_router_dom_1.Link to={routes_1.appRoutes.tour}>Product tour</react_router_dom_1.Link>
        <react_router_dom_1.Link to={routes_1.appRoutes.privacy}>Privacy</react_router_dom_1.Link>
        <react_router_dom_1.Link to={"".concat(routes_1.appRoutes.home, "#delete")}>Delete account</react_router_dom_1.Link>
        <react_router_dom_1.Link to={routes_1.appRoutes.home}>Home</react_router_dom_1.Link>
      </div>
    </footer>);
}
