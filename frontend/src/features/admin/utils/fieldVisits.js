"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCoords = parseCoords;
exports.formatCoordsValue = formatCoordsValue;
exports.isCompletedVisitStatus = isCompletedVisitStatus;
exports.parseDateTimeValue = parseDateTimeValue;
exports.resolveVisitDurationMinutes = resolveVisitDurationMinutes;
exports.formatVisitDuration = formatVisitDuration;
exports.getLocationName = getLocationName;
exports.compactCoords = compactCoords;
exports.calculateDistanceKm = calculateDistanceKm;
exports.formatDestinationLocation = formatDestinationLocation;
exports.getDestinationVisitedStatus = getDestinationVisitedStatus;
exports.getDestinationVisitFlag = getDestinationVisitFlag;
exports.getDestinationVisitCounts = getDestinationVisitCounts;
exports.normalizeFieldVisitTrackingPoints = normalizeFieldVisitTrackingPoints;
exports.buildFieldVisitTimelineItems = buildFieldVisitTimelineItems;
exports.buildRoutePoints = buildRoutePoints;
var formatters_1 = require("./formatters");
function parseCoords(lat, lon) {
    var latNum = Number(lat);
    var lonNum = Number(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
        return null;
    }
    if (latNum === 0 && lonNum === 0) {
        return null;
    }
    return { lat: latNum, lon: lonNum };
}
function formatCoordsValue(coords) {
    if (!coords) {
        return undefined;
    }
    return "".concat(coords.lat.toFixed(6), ", ").concat(coords.lon.toFixed(6));
}
function isCompletedVisitStatus(status) {
    var normalized = (status || '').trim().toLowerCase();
    return ['completed', 'complete', 'closed', 'ended'].includes(normalized);
}
function parseDateTimeValue(value) {
    if (!value) {
        return null;
    }
    var parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed;
    }
    var normalized = value.includes(' ') && !value.includes('T')
        ? value.replace(' ', 'T')
        : value;
    var fallback = new Date(normalized);
    if (!Number.isNaN(fallback.getTime())) {
        return fallback;
    }
    return null;
}
function normalizeDurationMinutes(value) {
    if (value === null || value === undefined) {
        return null;
    }
    var minutes = Number(value);
    if (!Number.isFinite(minutes)) {
        return null;
    }
    return Math.max(0, Math.floor(minutes));
}
function resolveVisitDurationMinutes(durationMinutes, startTime, endTime, isCompleted, referenceTimestamp) {
    if (isCompleted === void 0) { isCompleted = false; }
    var persistedDuration = normalizeDurationMinutes(durationMinutes);
    if (persistedDuration !== null) {
        return persistedDuration;
    }
    var startDate = parseDateTimeValue(startTime);
    if (!startDate) {
        return null;
    }
    var endDate = parseDateTimeValue(endTime) || (!isCompleted
        ? new Date(referenceTimestamp || Date.now())
        : null);
    if (!endDate) {
        return null;
    }
    var minutes = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
    if (!Number.isFinite(minutes)) {
        return null;
    }
    return Math.max(0, minutes);
}
function formatVisitDuration(minutes) {
    if (minutes === null || minutes === undefined) {
        return '--';
    }
    var totalMinutes = Math.max(0, Math.floor(minutes));
    var hours = Math.floor(totalMinutes / 60);
    var remainingMinutes = totalMinutes % 60;
    if (!hours) {
        return "".concat(remainingMinutes, "m");
    }
    if (!remainingMinutes) {
        return "".concat(hours, "h");
    }
    return "".concat(hours, "h ").concat(remainingMinutes, "m");
}
function getLocationName(address, fallback) {
    if (fallback === void 0) { fallback = 'Location'; }
    var text = (address || '').trim();
    if (!text) {
        return fallback;
    }
    var firstPart = text.split(',')[0];
    var name = (firstPart || '').trim();
    return name || text;
}
function compactCoords(points) {
    return points.filter(function (point) { return Boolean(point); });
}
function calculateDistanceKm(points) {
    if (points.length < 2) {
        return 0;
    }
    var toRad = function (value) { return (value * Math.PI) / 180; };
    var earthRadius = 6371;
    var total = 0;
    for (var i = 1; i < points.length; i += 1) {
        var prev = points[i - 1];
        var curr = points[i];
        var deltaLat = toRad(curr.lat - prev.lat);
        var deltaLon = toRad(curr.lon - prev.lon);
        var lat1 = toRad(prev.lat);
        var lat2 = toRad(curr.lat);
        var a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        total += earthRadius * c;
    }
    return total;
}
function formatDestinationLocation(destinations) {
    if (!Array.isArray(destinations) || !destinations.length) {
        return '--';
    }
    var labels = destinations
        .map(function (destination) { return (destination === null || destination === void 0 ? void 0 : destination.name) || (destination === null || destination === void 0 ? void 0 : destination.address); })
        .filter(function (value) { return Boolean(value && value.trim()); });
    return labels.length ? labels.join(', ') : '--';
}
function getDestinationVisitedStatus(destinations) {
    if (!Array.isArray(destinations) || !destinations.length) {
        return null;
    }
    return destinations.every(function (destination) { return Boolean(destination === null || destination === void 0 ? void 0 : destination.visited); });
}
function getDestinationVisitFlag(destinations) {
    if (!Array.isArray(destinations) || !destinations.length) {
        return null;
    }
    return destinations.some(function (destination) { return Boolean(destination === null || destination === void 0 ? void 0 : destination.visited); });
}
function getDestinationVisitCounts(destinations) {
    if (!Array.isArray(destinations) || !destinations.length) {
        return { visitedCount: 0, totalCount: 0 };
    }
    return {
        visitedCount: destinations.filter(function (destination) { return Boolean(destination === null || destination === void 0 ? void 0 : destination.visited); }).length,
        totalCount: destinations.length
    };
}
function normalizeFieldVisitTrackingPoints(points) {
    if (points === void 0) { points = []; }
    var normalized = [];
    points.forEach(function (point) {
        var parsedFromLatLon = parseCoords(point.latitude, point.longitude);
        var parsedFromLocation = point.location
            ? (function () {
                var _a = point.location.split(',').map(function (value) { return value.trim(); }), _b = _a[0], latValue = _b === void 0 ? '' : _b, _c = _a[1], lonValue = _c === void 0 ? '' : _c;
                return parseCoords(latValue, lonValue);
            })()
            : null;
        var coords = parsedFromLatLon || parsedFromLocation;
        if (!coords) {
            return;
        }
        normalized.push({
            lat: coords.lat,
            lon: coords.lon,
            trackedAt: point.tracked_at,
            trackingType: point.tracking_type
        });
    });
    return normalized;
}
function buildFieldVisitTimelineItems(row, activityTracking, fieldTracking) {
    if (activityTracking === void 0) { activityTracking = []; }
    if (fieldTracking === void 0) { fieldTracking = []; }
    var items = [];
    items.push({
        id: "".concat(row.activityId, "-start"),
        kind: 'start',
        title: row.startName || 'Start',
        address: row.startAddress || row.location || 'Start address unavailable',
        coords: row.startCoords,
        trackedAt: row.visitDate
    });
    var trackingSource = activityTracking.length ? activityTracking : fieldTracking;
    trackingSource.forEach(function (point, index) {
        var coords = parseCoords(point.latitude, point.longitude) ||
            (point.location
                ? (function () {
                    var _a = point.location.split(',').map(function (value) { return value.trim(); }), _b = _a[0], latValue = _b === void 0 ? '' : _b, _c = _a[1], lonValue = _c === void 0 ? '' : _c;
                    return parseCoords(latValue, lonValue);
                })()
                : null);
        items.push({
            id: "".concat(row.activityId, "-point-").concat(index),
            kind: 'point',
            title: point.tracking_type ? (0, formatters_1.toTitleCase)(point.tracking_type.replace(/_/g, ' ')) : "Point ".concat(index + 1),
            address: point.address || point.location || 'Address unavailable',
            coords: coords,
            trackedAt: point.tracked_at,
            trackingType: point.tracking_type
        });
    });
    if (row.isCompleted) {
        items.push({
            id: "".concat(row.activityId, "-end"),
            kind: 'end',
            title: row.endName || 'End',
            address: row.endAddress || 'End address unavailable',
            coords: row.endCoords,
            trackedAt: undefined
        });
    }
    return items;
}
function areSameCoords(left, right) {
    if (!left || !right) {
        return false;
    }
    return Math.abs(left.lat - right.lat) < 0.000001 && Math.abs(left.lon - right.lon) < 0.000001;
}
function buildRoutePoints(start, tracked, end) {
    if (tracked === void 0) { tracked = []; }
    var route = [];
    if (start) {
        route.push(start);
    }
    for (var _i = 0, tracked_1 = tracked; _i < tracked_1.length; _i++) {
        var point = tracked_1[_i];
        if (!route.length || !areSameCoords(route[route.length - 1], point)) {
            route.push(point);
        }
    }
    if (end && (!route.length || !areSameCoords(route[route.length - 1], end))) {
        route.push(end);
    }
    return route;
}
