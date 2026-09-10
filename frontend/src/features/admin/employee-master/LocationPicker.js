"use strict";
/**
 * OpenStreetMap location picker for work locations.
 *
 * Drops a draggable pin on a Leaflet/OSM map and writes the result straight
 * back into the form's latitude/longitude fields — typing coordinates by hand
 * is both tedious and easy to get wrong. Search uses Nominatim (the same
 * geocoder the field-visits map already relies on), and the geofence radius is
 * drawn as a circle so its real-world size is obvious before saving.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LocationPicker;
var react_1 = require("react");
var leaflet_1 = require("leaflet");
require("leaflet/dist/leaflet.css");
require("./LocationPicker.css");
// India-centred default: the app formats dates en-IN and ships INR payroll.
var FALLBACK_CENTER = [20.5937, 78.9629];
var FALLBACK_ZOOM = 4;
var PLACED_ZOOM = 16;
var markerIcon = leaflet_1.default.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
/** Six decimals is ~0.1 m — well past what a geofence needs. */
var toFixedCoord = function (value) { return value.toFixed(6); };
var parseCoord = function (value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) && value.trim() !== '' ? parsed : null;
};
function LocationPicker(_a) {
    var _this = this;
    var latitude = _a.latitude, longitude = _a.longitude, geofenceRadius = _a.geofenceRadius, addressHint = _a.addressHint, onChange = _a.onChange, onResolveAddress = _a.onResolveAddress, disabled = _a.disabled;
    var containerRef = (0, react_1.useRef)(null);
    var mapRef = (0, react_1.useRef)(null);
    var markerRef = (0, react_1.useRef)(null);
    var circleRef = (0, react_1.useRef)(null);
    // Held in a ref so the map's event handlers never close over a stale prop.
    var onChangeRef = (0, react_1.useRef)(onChange);
    onChangeRef.current = onChange;
    var _b = (0, react_1.useState)(''), search = _b[0], setSearch = _b[1];
    var _c = (0, react_1.useState)(false), searching = _c[0], setSearching = _c[1];
    var _d = (0, react_1.useState)(''), searchError = _d[0], setSearchError = _d[1];
    var _e = (0, react_1.useState)([]), results = _e[0], setResults = _e[1];
    var lat = parseCoord(latitude);
    var lon = parseCoord(longitude);
    var hasPoint = lat !== null && lon !== null;
    // Build the map once; later prop changes are pushed in by the effects below.
    (0, react_1.useEffect)(function () {
        if (!containerRef.current || mapRef.current)
            return;
        var map = leaflet_1.default.map(containerRef.current, { zoomControl: true, attributionControl: true });
        mapRef.current = map;
        map.setView(FALLBACK_CENTER, FALLBACK_ZOOM);
        leaflet_1.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);
        map.on('click', function (event) {
            onChangeRef.current({
                latitude: toFixedCoord(event.latlng.lat),
                longitude: toFixedCoord(event.latlng.lng),
            });
        });
        // The drawer animates in, so the map must re-measure once it has settled.
        var settle = window.setTimeout(function () { return map.invalidateSize(); }, 60);
        return function () {
            window.clearTimeout(settle);
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
            circleRef.current = null;
        };
    }, []);
    // Keep the pin and the geofence circle in step with the form values.
    (0, react_1.useEffect)(function () {
        var _a, _b, _c, _d;
        var map = mapRef.current;
        if (!map)
            return;
        if (!hasPoint) {
            (_a = markerRef.current) === null || _a === void 0 ? void 0 : _a.remove();
            markerRef.current = null;
            (_b = circleRef.current) === null || _b === void 0 ? void 0 : _b.remove();
            circleRef.current = null;
            return;
        }
        var position = [lat, lon];
        if (!markerRef.current) {
            var marker_1 = leaflet_1.default.marker(position, { icon: markerIcon, draggable: !disabled }).addTo(map);
            marker_1.on('dragend', function () {
                var _a = marker_1.getLatLng(), nextLat = _a.lat, nextLon = _a.lng;
                onChangeRef.current({ latitude: toFixedCoord(nextLat), longitude: toFixedCoord(nextLon) });
            });
            markerRef.current = marker_1;
            map.setView(position, Math.max(map.getZoom(), PLACED_ZOOM));
        }
        else {
            markerRef.current.setLatLng(position);
            (_c = markerRef.current.dragging) === null || _c === void 0 ? void 0 : _c[disabled ? 'disable' : 'enable']();
        }
        var radius = Number(geofenceRadius);
        if (Number.isFinite(radius) && radius > 0) {
            if (circleRef.current) {
                circleRef.current.setLatLng(position).setRadius(radius);
            }
            else {
                circleRef.current = leaflet_1.default.circle(position, {
                    radius: radius,
                    color: '#106b52',
                    fillColor: '#106b52',
                    fillOpacity: 0.12,
                    weight: 1.5,
                }).addTo(map);
            }
        }
        else {
            (_d = circleRef.current) === null || _d === void 0 ? void 0 : _d.remove();
            circleRef.current = null;
        }
    }, [lat, lon, hasPoint, geofenceRadius, disabled]);
    var runSearch = function (event) { return __awaiter(_this, void 0, void 0, function () {
        var query, response, found, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    event.preventDefault();
                    query = (search || addressHint || '').trim();
                    if (!query) {
                        setSearchError('Type an address or place to search for.');
                        return [2 /*return*/];
                    }
                    setSearching(true);
                    setSearchError('');
                    setResults([]);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch("https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=".concat(encodeURIComponent(query)))];
                case 2:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error('Address lookup failed. Try again in a moment.');
                    return [4 /*yield*/, response.json()];
                case 3:
                    found = (_a.sent());
                    if (!Array.isArray(found) || found.length === 0) {
                        setSearchError("No place found for \u201C".concat(query, "\u201D. Try a broader search, or click the map."));
                        return [2 /*return*/];
                    }
                    setResults(found);
                    if (found.length === 1)
                        applyResult(found[0]);
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _a.sent();
                    setSearchError(error_1 instanceof Error ? error_1.message : 'Address lookup failed.');
                    return [3 /*break*/, 6];
                case 5:
                    setSearching(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var applyResult = function (result) {
        onChangeRef.current({
            latitude: toFixedCoord(Number(result.lat)),
            longitude: toFixedCoord(Number(result.lon)),
        });
        setResults([]);
        setSearch(result.display_name);
        var address = result.address || {};
        onResolveAddress === null || onResolveAddress === void 0 ? void 0 : onResolveAddress({
            city: address.city || address.town || address.village || address.suburb || address.county,
            state: address.state,
            country: address.country,
            pincode: address.postcode,
        });
    };
    var useCurrentLocation = function () {
        if (!navigator.geolocation) {
            setSearchError('This browser cannot report your location.');
            return;
        }
        setSearchError('');
        navigator.geolocation.getCurrentPosition(function (position) {
            return onChangeRef.current({
                latitude: toFixedCoord(position.coords.latitude),
                longitude: toFixedCoord(position.coords.longitude),
            });
        }, function () { return setSearchError('Could not read your location. Check the browser permission.'); });
    };
    return (<div className="em-locpick">
      <div className="em-locpick-controls">
        <div className="em-locpick-search">
          <input type="search" value={search} placeholder={addressHint ? "Search \u2014 e.g. ".concat(addressHint) : 'Search an address or place'} onChange={function (event) { return setSearch(event.target.value); }} onKeyDown={function (event) {
            // The picker lives inside the record form; Enter must search here,
            // not submit the whole form.
            if (event.key === 'Enter') {
                event.preventDefault();
                void runSearch(event);
            }
        }} disabled={disabled}/>
          <button className="adm-btn" type="button" onClick={runSearch} disabled={disabled || searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        <button className="adm-btn em-locpick-here" type="button" onClick={useCurrentLocation} disabled={disabled}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
          Use my location
        </button>
      </div>

      {searchError ? <p className="em-locpick-error">{searchError}</p> : null}

      {results.length > 1 ? (<ul className="em-locpick-results">
          {results.map(function (result) { return (<li key={"".concat(result.lat, "-").concat(result.lon)}>
              <button type="button" onClick={function () { return applyResult(result); }}>
                {result.display_name}
              </button>
            </li>); })}
        </ul>) : null}

      <div className="em-locpick-map" ref={containerRef} role="application" aria-label="Work location map"/>

      <div className="em-locpick-foot">
        {hasPoint ? (<>
            <span className="em-locpick-coords">
              <b>{latitude}</b>, <b>{longitude}</b>
            </span>
            <button className="em-locpick-clear" type="button" onClick={function () { return onChangeRef.current({ latitude: '', longitude: '' }); }} disabled={disabled}>
              Clear pin
            </button>
          </>) : (<span className="em-locpick-hint">Click the map, search an address, or drag the pin to set coordinates.</span>)}
      </div>
    </div>);
}
