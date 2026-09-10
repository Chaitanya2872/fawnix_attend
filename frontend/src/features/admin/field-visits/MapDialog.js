"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MapDialog;
var formatters_1 = require("../utils/formatters");
function MapDialog(_a) {
    var title = _a.title, loading = _a.loading, error = _a.error, mapContainerRef = _a.mapContainerRef, mapCenter = _a.mapCenter, fieldPointCount = _a.fieldPointCount, activityPointCount = _a.activityPointCount, distanceKm = _a.distanceKm, startPoint = _a.startPoint, endPoint = _a.endPoint, mapTrackingPoints = _a.mapTrackingPoints, onClose = _a.onClose;
    return (<div className="map-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="map-dialog">
        <div className="map-dialog-header">
          <strong>{title || 'Activity Route'}</strong>
        </div>
        <div className="map-dialog-body">
          {loading ? (<div className="map-dialog-state">Loading map...</div>) : error ? (<div className="map-dialog-state">{error}</div>) : mapCenter ? (<>
              <div ref={mapContainerRef} className="map-dialog-map"/>
              <div className="map-dialog-meta">
                <div className="map-dialog-chip-row">
                  <span className="map-dialog-chip">Field points: {fieldPointCount}</span>
                  <span className="map-dialog-chip">Activity points: {activityPointCount}</span>
                  {distanceKm !== null && distanceKm !== undefined && !Number.isNaN(distanceKm) ? (<span className="map-dialog-chip">Distance: {(0, formatters_1.formatDistanceKm)(distanceKm)}</span>) : null}
                </div>
                <div className="map-dialog-coords-row">
                  <div>Start: {(0, formatters_1.formatCoords)(startPoint)}</div>
                  <div>End: {(0, formatters_1.formatCoords)(endPoint)}</div>
                </div>
                <div className="map-dialog-points">
                  <strong>Activity GPS Points</strong>
                  {mapTrackingPoints.length ? (<ol>
                      {mapTrackingPoints.map(function (point, index) {
                    var typeLabel = (point.trackingType || 'auto').trim().toLowerCase();
                    return (<li key={"".concat(point.lat, "-").concat(point.lon, "-").concat(point.trackedAt || index)}>
                            {"".concat(point.lat.toFixed(6), ", ").concat(point.lon.toFixed(6), " [").concat(typeLabel, "]")}
                            {point.trackedAt ? " at ".concat(point.trackedAt) : ''}
                          </li>);
                })}
                    </ol>) : (<div className="map-dialog-empty-points">No activity GPS points found.</div>)}
                </div>
              </div>
            </>) : (<div className="map-dialog-state">No location data available.</div>)}
        </div>
        <div className="map-dialog-footer">
          <button className="map-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>);
}
