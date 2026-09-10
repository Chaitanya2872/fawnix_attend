"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FieldVisitDetailDrawer;
var fieldVisits_1 = require("../utils/fieldVisits");
var formatters_1 = require("../utils/formatters");
function FieldVisitDetailDrawer(_a) {
    var row = _a.row, durationMinutes = _a.durationMinutes, loading = _a.loading, error = _a.error, timelineItems = _a.timelineItems, formatDateTime = _a.formatDateTime, onClose = _a.onClose;
    return (<>
      <button className="side-panel-scrim" type="button" aria-label="Close field visit details" onClick={onClose}/>
      <aside className="field-visit-panel" aria-label="Field visit details">
        <div className="field-visit-panel-head">
          <div>
            <p className="eyebrow">Field Visit</p>
            <h3>{row.employee}</h3>
            <span>{row.visitType} • {formatDateTime(row.visitDate)}</span>
          </div>
          <button className="field-visit-panel-close" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="field-visit-panel-summary">
          <div className="field-visit-panel-card">
            <span>Start</span>
            <strong>{row.startName || 'Start location unavailable'}</strong>
            <small>{row.startAddress || row.location || '--'}</small>
          </div>
          <div className="field-visit-panel-card">
            <span>End</span>
            <strong>{row.isCompleted ? row.endName || 'End location unavailable' : 'Visit in progress'}</strong>
            <small>{row.isCompleted ? row.endAddress || '--' : '--'}</small>
          </div>
        </div>

        <div className="field-visit-panel-meta">
          <span className="table-pill accent">{row.status}</span>
          <span>Hours there: {(0, fieldVisits_1.formatVisitDuration)(durationMinutes)}</span>
          <span>Distance: {row.distanceKm ? (0, formatters_1.formatDistanceKm)(row.distanceKm) : '--'}</span>
        </div>

        {loading ? (<div className="empty-state">Loading field visit details...</div>) : error ? (<div className="empty-state">{error}</div>) : (<div className="field-visit-timeline">
            {timelineItems.map(function (item) { return (<div key={item.id} className={"field-visit-timeline-item ".concat(item.kind)}>
                <div className="field-visit-timeline-icon" aria-hidden="true"/>
                <div className="field-visit-timeline-content">
                  <strong>{item.title}</strong>
                  <span>{item.address}</span>
                  <span>{(0, fieldVisits_1.formatCoordsValue)(item.coords) || '--'}</span>
                  <small>
                    {[item.trackedAt ? formatDateTime(item.trackedAt) : '', item.trackingType ? (0, formatters_1.toTitleCase)(item.trackingType.replace(/_/g, ' ')) : '']
                    .filter(Boolean)
                    .join(' • ') || '--'}
                  </small>
                </div>
              </div>); })}
          </div>)}
      </aside>
    </>);
}
