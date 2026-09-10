"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAdminLoginExperience = useAdminLoginExperience;
var react_1 = require("react");
function formatCoordinate(value, positive, negative) {
    return "".concat(Math.abs(value).toFixed(2), "\u00B0").concat(value >= 0 ? positive : negative);
}
function useAdminLoginExperience(enabled) {
    var _a = (0, react_1.useState)(function () { return new Date(); }), loginSceneTime = _a[0], setLoginSceneTime = _a[1];
    var _b = (0, react_1.useState)('Waiting for device location'), loginLocationDetails = _b[0], setLoginLocationDetails = _b[1];
    var canUseGeolocation = 'geolocation' in navigator;
    (0, react_1.useEffect)(function () {
        if (!enabled) {
            return;
        }
        var intervalId = window.setInterval(function () { return setLoginSceneTime(new Date()); }, 60000);
        return function () { return window.clearInterval(intervalId); };
    }, [enabled]);
    (0, react_1.useEffect)(function () {
        if (!enabled) {
            return;
        }
        if (!canUseGeolocation) {
            return;
        }
        var cancelled = false;
        var locatingTimerId = window.setTimeout(function () {
            if (!cancelled) {
                setLoginLocationDetails('Locating device');
            }
        }, 0);
        navigator.geolocation.getCurrentPosition(function (position) {
            if (cancelled) {
                return;
            }
            var _a = position.coords, latitude = _a.latitude, longitude = _a.longitude;
            setLoginLocationDetails("".concat(formatCoordinate(latitude, 'N', 'S'), " / ").concat(formatCoordinate(longitude, 'E', 'W')));
        }, function () {
            if (!cancelled) {
                setLoginLocationDetails('Location access is off');
            }
        }, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 300000
        });
        return function () {
            cancelled = true;
            window.clearTimeout(locatingTimerId);
        };
    }, [enabled, canUseGeolocation]);
    return {
        loginSceneTime: loginSceneTime,
        loginLocationDetails: enabled && !canUseGeolocation
            ? 'Location unavailable in this browser'
            : loginLocationDetails
    };
}
