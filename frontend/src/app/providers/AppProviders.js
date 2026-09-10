"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppProviders = AppProviders;
var react_router_dom_1 = require("react-router-dom");
function AppProviders(_a) {
    var children = _a.children;
    return <react_router_dom_1.BrowserRouter>{children}</react_router_dom_1.BrowserRouter>;
}
