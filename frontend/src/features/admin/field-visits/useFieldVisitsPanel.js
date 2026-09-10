"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.useFieldVisitsPanel = useFieldVisitsPanel;
var react_1 = require("react");
var leaflet_1 = require("leaflet");
require("leaflet/dist/leaflet.css");
var fieldVisits_1 = require("../utils/fieldVisits");
function useFieldVisitsPanel(_a) {
    var _this = this;
    var showAdminLogin = _a.showAdminLogin, fieldVisitRows = _a.fieldVisitRows, apiRequest = _a.apiRequest;
    var _b = (0, react_1.useState)(function () { return Date.now(); }), fieldVisitDurationTick = _b[0], setFieldVisitDurationTick = _b[1];
    var _c = (0, react_1.useState)(false), fieldVisitPanelOpen = _c[0], setFieldVisitPanelOpen = _c[1];
    var _d = (0, react_1.useState)(null), fieldVisitPanelRow = _d[0], setFieldVisitPanelRow = _d[1];
    var _e = (0, react_1.useState)(false), fieldVisitPanelLoading = _e[0], setFieldVisitPanelLoading = _e[1];
    var _f = (0, react_1.useState)(''), fieldVisitPanelError = _f[0], setFieldVisitPanelError = _f[1];
    var _g = (0, react_1.useState)([]), fieldVisitTimelineItems = _g[0], setFieldVisitTimelineItems = _g[1];
    var _h = (0, react_1.useState)(false), mapDialogOpen = _h[0], setMapDialogOpen = _h[1];
    var _j = (0, react_1.useState)(''), mapDialogTitle = _j[0], setMapDialogTitle = _j[1];
    var _k = (0, react_1.useState)(false), mapDialogLoading = _k[0], setMapDialogLoading = _k[1];
    var _l = (0, react_1.useState)(''), mapDialogError = _l[0], setMapDialogError = _l[1];
    var _m = (0, react_1.useState)([]), mapPoints = _m[0], setMapPoints = _m[1];
    var _o = (0, react_1.useState)([]), mapTrackingPoints = _o[0], setMapTrackingPoints = _o[1];
    var _p = (0, react_1.useState)([]), mapFieldTrackingPoints = _p[0], setMapFieldTrackingPoints = _p[1];
    var _q = (0, react_1.useState)(null), mapCenter = _q[0], setMapCenter = _q[1];
    var _r = (0, react_1.useState)(null), mapSummary = _r[0], setMapSummary = _r[1];
    var mapContainerRef = (0, react_1.useRef)(null);
    var mapRef = (0, react_1.useRef)(null);
    var openFieldVisitPanel = function (row) { return __awaiter(_this, void 0, void 0, function () {
        var trackingResponse, visit, trackingPoints, status_1, isCompleted, visitStartTime, visitEndTime, enrichedRow, error_1;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    setFieldVisitPanelOpen(true);
                    setFieldVisitPanelRow(row);
                    setFieldVisitPanelError('');
                    setFieldVisitPanelLoading(true);
                    setFieldVisitDurationTick(Date.now());
                    setFieldVisitTimelineItems((0, fieldVisits_1.buildFieldVisitTimelineItems)(row, Array.isArray(row.activityTracking) ? row.activityTracking : [], Array.isArray(row.fieldTracking) ? row.fieldTracking : []));
                    if (!row.fieldVisitId) {
                        setFieldVisitPanelLoading(false);
                        return [2 /*return*/];
                    }
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, apiRequest("/api/admin/field-visits/".concat(row.fieldVisitId, "/tracking"), {})];
                case 2:
                    trackingResponse = _e.sent();
                    visit = ((_a = trackingResponse === null || trackingResponse === void 0 ? void 0 : trackingResponse.data) === null || _a === void 0 ? void 0 : _a.field_visit) || {};
                    trackingPoints = Array.isArray((_b = trackingResponse === null || trackingResponse === void 0 ? void 0 : trackingResponse.data) === null || _b === void 0 ? void 0 : _b.tracking_points)
                        ? trackingResponse.data.tracking_points
                        : [];
                    status_1 = visit.status || row.status;
                    isCompleted = (0, fieldVisits_1.isCompletedVisitStatus)(status_1);
                    visitStartTime = row.visitStartTime || row.visitDate || visit.start_time;
                    visitEndTime = visit.end_time || row.visitEndTime;
                    enrichedRow = __assign(__assign({}, row), { status: status_1, isCompleted: isCompleted, visitDate: row.visitDate || visitStartTime, visitStartTime: visitStartTime, visitEndTime: visitEndTime, durationMinutes: (0, fieldVisits_1.resolveVisitDurationMinutes)((_c = visit.duration_minutes) !== null && _c !== void 0 ? _c : row.durationMinutes, visitStartTime, visitEndTime, isCompleted), startAddress: visit.start_address || row.startAddress, endAddress: visit.end_address || row.endAddress, startCoords: (0, fieldVisits_1.parseCoords)(visit.start_latitude, visit.start_longitude) || row.startCoords, endCoords: (0, fieldVisits_1.parseCoords)(visit.end_latitude, visit.end_longitude) || row.endCoords, distanceKm: Number.isFinite(Number((_d = trackingResponse === null || trackingResponse === void 0 ? void 0 : trackingResponse.data) === null || _d === void 0 ? void 0 : _d.total_distance_km))
                            ? Number(trackingResponse.data.total_distance_km)
                            : row.distanceKm });
                    setFieldVisitPanelRow(enrichedRow);
                    setFieldVisitTimelineItems((0, fieldVisits_1.buildFieldVisitTimelineItems)(enrichedRow, Array.isArray(row.activityTracking) ? row.activityTracking : [], trackingPoints.length ? trackingPoints : (Array.isArray(row.fieldTracking) ? row.fieldTracking : [])));
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _e.sent();
                    setFieldVisitPanelError(error_1 instanceof Error ? error_1.message : 'Failed to load field visit details');
                    return [3 /*break*/, 5];
                case 4:
                    setFieldVisitPanelLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var openMapForFieldVisit = function (row) { return __awaiter(_this, void 0, void 0, function () {
        var startLocationText, isCompleted, coordMatch, activityTrackingFromRow, fieldTrackingFromRow, routeResponse, routeData, activityTrackingPoints, fieldTrackingPoints, nextActivityTracking, nextFieldTracking, trackingForRoute, startCoordsFromRoute, endCoordsFromRoute, startCoords, endCoords, routeStatus, routeIsCompleted, nextPoints, fallbackPoints, startAddress, endAddress, totalDistanceValue, computedDistance, _a, trackingResponse, visit, points, normalizedFieldPoints, normalizedActivityPoints, trackedRoutePoints, latestTrackedPoint, firstTrackedPoint, mappedPoints, visitStatus, visitIsCompleted, startCoordsFromVisit, endCoordsFromVisit, startCoords, endCoords, nextPoints, fallbackPoints, startAddress, endAddress, totalDistanceValue, computedDistance, error_2, _b, lat, lon, latNum, lonNum, response, results, match, latNum, lonNum, error_3;
        var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        return __generator(this, function (_p) {
            switch (_p.label) {
                case 0:
                    startLocationText = (row.startAddress || row.location || '').trim();
                    isCompleted = (0, fieldVisits_1.isCompletedVisitStatus)(row.status);
                    coordMatch = startLocationText.match(/-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/);
                    activityTrackingFromRow = (0, fieldVisits_1.normalizeFieldVisitTrackingPoints)(Array.isArray(row.activityTracking) ? row.activityTracking : []);
                    fieldTrackingFromRow = (0, fieldVisits_1.normalizeFieldVisitTrackingPoints)(Array.isArray(row.fieldTracking) ? row.fieldTracking : []);
                    setMapDialogTitle(isCompleted ? 'Activity Route' : 'Activity Location');
                    setMapDialogOpen(true);
                    setMapDialogError('');
                    setMapDialogLoading(true);
                    setMapPoints([]);
                    setMapTrackingPoints([]);
                    setMapFieldTrackingPoints([]);
                    setMapCenter(null);
                    setMapSummary({
                        startName: row.startName || (0, fieldVisits_1.getLocationName)(row.startAddress || row.location, 'Start Location'),
                        startAddress: row.startAddress || row.location,
                        endName: isCompleted ? row.endName || (0, fieldVisits_1.getLocationName)(row.endAddress, 'End Location') : undefined,
                        endAddress: isCompleted ? row.endAddress : undefined,
                        startCoords: row.startCoords,
                        endCoords: isCompleted ? row.endCoords : undefined,
                        distanceKm: isCompleted ? row.distanceKm : null,
                        pointsCount: undefined,
                        isCompleted: isCompleted
                    });
                    if (!row.activityId) return [3 /*break*/, 4];
                    _p.label = 1;
                case 1:
                    _p.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, apiRequest("/api/activities/route/".concat(row.activityId), {})];
                case 2:
                    routeResponse = _p.sent();
                    routeData = (routeResponse === null || routeResponse === void 0 ? void 0 : routeResponse.data) || {};
                    activityTrackingPoints = (0, fieldVisits_1.normalizeFieldVisitTrackingPoints)(Array.isArray(routeData === null || routeData === void 0 ? void 0 : routeData.tracking_points) ? routeData.tracking_points : []);
                    fieldTrackingPoints = (0, fieldVisits_1.normalizeFieldVisitTrackingPoints)(Array.isArray(routeData === null || routeData === void 0 ? void 0 : routeData.field_visit_checkpoints) ? routeData.field_visit_checkpoints : []);
                    nextActivityTracking = activityTrackingPoints.length ? activityTrackingPoints : activityTrackingFromRow;
                    nextFieldTracking = fieldTrackingPoints.length ? fieldTrackingPoints : fieldTrackingFromRow;
                    trackingForRoute = nextActivityTracking.length ? nextActivityTracking : nextFieldTracking;
                    startCoordsFromRoute = (0, fieldVisits_1.parseCoords)((_c = routeData === null || routeData === void 0 ? void 0 : routeData.start_location) === null || _c === void 0 ? void 0 : _c.latitude, (_d = routeData === null || routeData === void 0 ? void 0 : routeData.start_location) === null || _d === void 0 ? void 0 : _d.longitude);
                    endCoordsFromRoute = (0, fieldVisits_1.parseCoords)((_e = routeData === null || routeData === void 0 ? void 0 : routeData.end_location) === null || _e === void 0 ? void 0 : _e.latitude, (_f = routeData === null || routeData === void 0 ? void 0 : routeData.end_location) === null || _f === void 0 ? void 0 : _f.longitude);
                    startCoords = startCoordsFromRoute ||
                        row.startCoords ||
                        (trackingForRoute.length ? { lat: trackingForRoute[0].lat, lon: trackingForRoute[0].lon } : null);
                    endCoords = endCoordsFromRoute ||
                        row.endCoords ||
                        (trackingForRoute.length
                            ? { lat: trackingForRoute[trackingForRoute.length - 1].lat, lon: trackingForRoute[trackingForRoute.length - 1].lon }
                            : null);
                    routeStatus = (routeData === null || routeData === void 0 ? void 0 : routeData.status) || row.status;
                    routeIsCompleted = (0, fieldVisits_1.isCompletedVisitStatus)(routeStatus);
                    nextPoints = (0, fieldVisits_1.buildRoutePoints)(startCoords, trackingForRoute.map(function (point) { return ({ lat: point.lat, lon: point.lon }); }), routeIsCompleted ? endCoords : null);
                    fallbackPoints = nextPoints.length ? nextPoints : (0, fieldVisits_1.compactCoords)([startCoords, endCoords]);
                    setMapTrackingPoints(nextActivityTracking);
                    setMapFieldTrackingPoints(nextFieldTracking);
                    setMapPoints(fallbackPoints);
                    if (fallbackPoints.length) {
                        setMapCenter(fallbackPoints[0]);
                    }
                    startAddress = ((_g = routeData === null || routeData === void 0 ? void 0 : routeData.start_location) === null || _g === void 0 ? void 0 : _g.address) || row.startAddress || row.location;
                    endAddress = ((_h = routeData === null || routeData === void 0 ? void 0 : routeData.end_location) === null || _h === void 0 ? void 0 : _h.address) || row.endAddress;
                    totalDistanceValue = Number(routeData === null || routeData === void 0 ? void 0 : routeData.total_distance_km);
                    computedDistance = Number.isFinite(totalDistanceValue) && totalDistanceValue > 0
                        ? totalDistanceValue
                        : fallbackPoints.length >= 2
                            ? (0, fieldVisits_1.calculateDistanceKm)(fallbackPoints)
                            : ((_j = row.distanceKm) !== null && _j !== void 0 ? _j : null);
                    setMapSummary({
                        startName: (0, fieldVisits_1.getLocationName)(startAddress, 'Start Location'),
                        startAddress: startAddress,
                        endName: routeIsCompleted ? (0, fieldVisits_1.getLocationName)(endAddress, 'End Location') : undefined,
                        endAddress: routeIsCompleted ? endAddress : undefined,
                        startCoords: startCoords,
                        endCoords: routeIsCompleted ? endCoords : undefined,
                        distanceKm: computedDistance !== null && computedDistance !== undefined && Number.isFinite(computedDistance)
                            ? computedDistance
                            : null,
                        pointsCount: nextActivityTracking.length,
                        isCompleted: routeIsCompleted
                    });
                    setMapDialogLoading(false);
                    if (fallbackPoints.length || nextActivityTracking.length || nextFieldTracking.length) {
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    _a = _p.sent();
                    return [3 /*break*/, 4];
                case 4:
                    if (!row.fieldVisitId) return [3 /*break*/, 8];
                    _p.label = 5;
                case 5:
                    _p.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, apiRequest("/api/admin/field-visits/".concat(row.fieldVisitId, "/tracking"), {})];
                case 6:
                    trackingResponse = _p.sent();
                    visit = ((_k = trackingResponse === null || trackingResponse === void 0 ? void 0 : trackingResponse.data) === null || _k === void 0 ? void 0 : _k.field_visit) || {};
                    points = Array.isArray((_l = trackingResponse === null || trackingResponse === void 0 ? void 0 : trackingResponse.data) === null || _l === void 0 ? void 0 : _l.tracking_points)
                        ? trackingResponse.data.tracking_points
                        : [];
                    normalizedFieldPoints = (0, fieldVisits_1.normalizeFieldVisitTrackingPoints)(points);
                    normalizedActivityPoints = activityTrackingFromRow;
                    trackedRoutePoints = normalizedActivityPoints.length ? normalizedActivityPoints : normalizedFieldPoints;
                    setMapTrackingPoints(normalizedActivityPoints);
                    setMapFieldTrackingPoints(normalizedFieldPoints);
                    latestTrackedPoint = points.length ? points[points.length - 1] : null;
                    firstTrackedPoint = points.find(function (point) { return point === null || point === void 0 ? void 0 : point.address; });
                    mappedPoints = trackedRoutePoints.map(function (point) { return ({
                        lat: point.lat,
                        lon: point.lon
                    }); });
                    visitStatus = visit.status || row.status;
                    visitIsCompleted = (0, fieldVisits_1.isCompletedVisitStatus)(visitStatus);
                    setMapDialogTitle(visitIsCompleted ? 'Activity Route' : 'Activity Location');
                    startCoordsFromVisit = (0, fieldVisits_1.parseCoords)(visit.start_latitude, visit.start_longitude);
                    endCoordsFromVisit = (0, fieldVisits_1.parseCoords)(visit.end_latitude, visit.end_longitude);
                    startCoords = startCoordsFromVisit || row.startCoords || (mappedPoints.length ? mappedPoints[0] : null);
                    endCoords = endCoordsFromVisit || row.endCoords || (mappedPoints.length ? mappedPoints[mappedPoints.length - 1] : null);
                    nextPoints = (0, fieldVisits_1.buildRoutePoints)(startCoords, mappedPoints, visitIsCompleted ? endCoords : null);
                    fallbackPoints = nextPoints.length ? nextPoints : (0, fieldVisits_1.compactCoords)([startCoords, endCoords]);
                    setMapPoints(fallbackPoints);
                    if (fallbackPoints.length) {
                        setMapCenter(fallbackPoints[0]);
                    }
                    startAddress = visit.start_address || (firstTrackedPoint === null || firstTrackedPoint === void 0 ? void 0 : firstTrackedPoint.address) || row.startAddress || row.location;
                    endAddress = visitIsCompleted
                        ? visit.end_address || (latestTrackedPoint === null || latestTrackedPoint === void 0 ? void 0 : latestTrackedPoint.address) || row.endAddress
                        : undefined;
                    totalDistanceValue = Number((_m = trackingResponse === null || trackingResponse === void 0 ? void 0 : trackingResponse.data) === null || _m === void 0 ? void 0 : _m.total_distance_km);
                    computedDistance = visitIsCompleted
                        ? Number.isFinite(totalDistanceValue) && totalDistanceValue > 0
                            ? totalDistanceValue
                            : (0, fieldVisits_1.calculateDistanceKm)(fallbackPoints)
                        : null;
                    setMapSummary({
                        startName: (0, fieldVisits_1.getLocationName)(startAddress, 'Start Location'),
                        startAddress: startAddress,
                        endName: visitIsCompleted ? (0, fieldVisits_1.getLocationName)(endAddress, 'End Location') : undefined,
                        endAddress: visitIsCompleted ? endAddress : undefined,
                        startCoords: startCoords,
                        endCoords: visitIsCompleted ? endCoords : undefined,
                        distanceKm: visitIsCompleted ? ((_o = computedDistance !== null && computedDistance !== void 0 ? computedDistance : row.distanceKm) !== null && _o !== void 0 ? _o : null) : null,
                        pointsCount: normalizedActivityPoints.length || trackedRoutePoints.length || fallbackPoints.length,
                        isCompleted: visitIsCompleted
                    });
                    setMapDialogLoading(false);
                    if (fallbackPoints.length || normalizedActivityPoints.length || normalizedFieldPoints.length) {
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 8];
                case 7:
                    error_2 = _p.sent();
                    setMapDialogError(error_2 instanceof Error ? error_2.message : 'Unable to load tracking points.');
                    return [3 /*break*/, 8];
                case 8:
                    if (coordMatch) {
                        _b = coordMatch[0].split(',').map(function (value) { return value.trim(); }), lat = _b[0], lon = _b[1];
                        latNum = Number(lat);
                        lonNum = Number(lon);
                        setMapPoints([{ lat: latNum, lon: lonNum }]);
                        setMapTrackingPoints([{ lat: latNum, lon: lonNum, trackingType: 'initial' }]);
                        setMapCenter({ lat: latNum, lon: lonNum });
                        setMapDialogLoading(false);
                        return [2 /*return*/];
                    }
                    if (!startLocationText) {
                        setMapDialogError('Start location unavailable.');
                        setMapDialogLoading(false);
                        return [2 /*return*/];
                    }
                    _p.label = 9;
                case 9:
                    _p.trys.push([9, 12, 13, 14]);
                    return [4 /*yield*/, fetch("https://nominatim.openstreetmap.org/search?format=json&q=".concat(encodeURIComponent(startLocationText), "&limit=1"))];
                case 10:
                    response = _p.sent();
                    return [4 /*yield*/, response.json()];
                case 11:
                    results = _p.sent();
                    match = Array.isArray(results) ? results[0] : null;
                    if (!match) {
                        throw new Error('Unable to locate this address.');
                    }
                    latNum = Number(match.lat);
                    lonNum = Number(match.lon);
                    setMapPoints([{ lat: latNum, lon: lonNum }]);
                    setMapTrackingPoints([{ lat: latNum, lon: lonNum, trackingType: 'initial' }]);
                    setMapCenter({ lat: latNum, lon: lonNum });
                    return [3 /*break*/, 14];
                case 12:
                    error_3 = _p.sent();
                    setMapDialogError(error_3 instanceof Error ? error_3.message : 'Unable to load map.');
                    return [3 /*break*/, 14];
                case 13:
                    setMapDialogLoading(false);
                    return [7 /*endfinally*/];
                case 14: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        if (showAdminLogin) {
            return undefined;
        }
        var hasActiveFieldVisit = fieldVisitRows.some(function (row) { return !row.isCompleted; });
        if (!hasActiveFieldVisit) {
            return undefined;
        }
        var intervalId = window.setInterval(function () {
            setFieldVisitDurationTick(Date.now());
        }, 60000);
        return function () { return window.clearInterval(intervalId); };
    }, [showAdminLogin, fieldVisitRows]);
    (0, react_1.useEffect)(function () {
        setFieldVisitDurationTick(Date.now());
    }, [fieldVisitRows]);
    (0, react_1.useEffect)(function () {
        if (!mapDialogOpen || !mapContainerRef.current || !mapCenter) {
            return;
        }
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
        var map = leaflet_1.default.map(mapContainerRef.current, { zoomControl: true });
        mapRef.current = map;
        leaflet_1.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        var defaultIcon = leaflet_1.default.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        });
        if (mapPoints.length > 1) {
            var latlngs = mapPoints.map(function (point) { return [point.lat, point.lon]; });
            var dotLatLngs = (mapTrackingPoints.length ? mapTrackingPoints : mapPoints).map(function (point) { return [
                point.lat,
                point.lon
            ]; });
            leaflet_1.default.polyline(latlngs, { color: '#2f6fe4', weight: 4 }).addTo(map);
            leaflet_1.default.marker(latlngs[0], { icon: defaultIcon }).addTo(map);
            leaflet_1.default.marker(latlngs[latlngs.length - 1], { icon: defaultIcon }).addTo(map);
            dotLatLngs.forEach(function (latlng) {
                leaflet_1.default.circleMarker(latlng, {
                    radius: 5,
                    color: '#ffffff',
                    fillColor: '#2f6fe4',
                    fillOpacity: 1,
                    weight: 2
                }).addTo(map);
            });
            map.fitBounds(latlngs, { padding: [30, 30] });
        }
        else {
            map.setView([mapCenter.lat, mapCenter.lon], 14);
            leaflet_1.default.marker([mapCenter.lat, mapCenter.lon], { icon: defaultIcon }).addTo(map);
        }
        // Ensure Leaflet recalculates tiles after modal layout settles.
        window.setTimeout(function () {
            map.invalidateSize();
        }, 0);
        return function () {
            map.remove();
            mapRef.current = null;
        };
    }, [mapDialogOpen, mapCenter, mapPoints, mapTrackingPoints]);
    var fieldVisitPanelDurationMinutes = fieldVisitPanelRow
        ? (0, fieldVisits_1.resolveVisitDurationMinutes)(fieldVisitPanelRow.durationMinutes, fieldVisitPanelRow.visitStartTime || fieldVisitPanelRow.visitDate, fieldVisitPanelRow.visitEndTime, fieldVisitPanelRow.isCompleted, fieldVisitDurationTick)
        : null;
    var fieldPointCount = mapFieldTrackingPoints.length;
    var activityPointCount = mapTrackingPoints.length || (mapSummary === null || mapSummary === void 0 ? void 0 : mapSummary.pointsCount) || 0;
    var startPoint = (mapSummary === null || mapSummary === void 0 ? void 0 : mapSummary.startCoords) ||
        (mapTrackingPoints.length ? { lat: mapTrackingPoints[0].lat, lon: mapTrackingPoints[0].lon } : null) ||
        (mapPoints.length ? mapPoints[0] : null);
    var endPoint = (mapSummary === null || mapSummary === void 0 ? void 0 : mapSummary.endCoords) ||
        (mapTrackingPoints.length
            ? { lat: mapTrackingPoints[mapTrackingPoints.length - 1].lat, lon: mapTrackingPoints[mapTrackingPoints.length - 1].lon }
            : null) ||
        (mapPoints.length ? mapPoints[mapPoints.length - 1] : null);
    return {
        fieldVisitDurationTick: fieldVisitDurationTick,
        fieldVisitPanelOpen: fieldVisitPanelOpen,
        setFieldVisitPanelOpen: setFieldVisitPanelOpen,
        fieldVisitPanelRow: fieldVisitPanelRow,
        fieldVisitPanelLoading: fieldVisitPanelLoading,
        fieldVisitPanelError: fieldVisitPanelError,
        fieldVisitTimelineItems: fieldVisitTimelineItems,
        mapDialogOpen: mapDialogOpen,
        setMapDialogOpen: setMapDialogOpen,
        mapDialogTitle: mapDialogTitle,
        mapDialogLoading: mapDialogLoading,
        mapDialogError: mapDialogError,
        mapPoints: mapPoints,
        mapTrackingPoints: mapTrackingPoints,
        mapFieldTrackingPoints: mapFieldTrackingPoints,
        mapCenter: mapCenter,
        mapSummary: mapSummary,
        mapContainerRef: mapContainerRef,
        openFieldVisitPanel: openFieldVisitPanel,
        openMapForFieldVisit: openMapForFieldVisit,
        fieldVisitPanelDurationMinutes: fieldVisitPanelDurationMinutes,
        fieldPointCount: fieldPointCount,
        activityPointCount: activityPointCount,
        startPoint: startPoint,
        endPoint: endPoint
    };
}
