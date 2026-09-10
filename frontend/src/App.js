"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
require("./App.css");
var AppProviders_1 = require("./app/providers/AppProviders");
var AppRouter_1 = require("./app/router/AppRouter");
function App() {
    return (<AppProviders_1.AppProviders>
      <AppRouter_1.AppRouter />
    </AppProviders_1.AppProviders>);
}
