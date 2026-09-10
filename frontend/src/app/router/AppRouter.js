"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppRouter = AppRouter;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var routes_1 = require("../config/routes");
var HomePage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require("../../features/public/pages/HomePage"); }); });
var ProductTourPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require("../../features/public/pages/ProductTourPage"); }); });
var PrivacyPolicyPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require("../../features/privacy/pages/PrivacyPolicyPage"); }); });
var AdminDashboardPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require("../../features/admin/pages/AdminDashboardPage"); }); });
function RouteFallback() {
    return <div className="page"/>;
}
function AppRouter() {
    return (<react_1.Suspense fallback={<RouteFallback />}>
      <react_router_dom_1.Routes>
        <react_router_dom_1.Route path={routes_1.appRoutes.home} element={<HomePage />}/>
        <react_router_dom_1.Route path={routes_1.appRoutes.tour} element={<ProductTourPage />}/>
        <react_router_dom_1.Route path={"".concat(routes_1.appRoutes.admin, "/*")} element={<AdminDashboardPage />}/>
        <react_router_dom_1.Route path={routes_1.appRoutes.privacy} element={<PrivacyPolicyPage />}/>
        <react_router_dom_1.Route path={routes_1.appRoutes.privacyAlias} element={<react_router_dom_1.Navigate replace to={routes_1.appRoutes.privacy}/>}/>
      </react_router_dom_1.Routes>
    </react_1.Suspense>);
}
