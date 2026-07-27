import { formatCoordsValue, formatVisitDuration } from '../utils/fieldVisits'
import { formatDistanceKm, toTitleCase } from '../utils/formatters'
import type { FieldVisitRow, FieldVisitTimelineItem } from '../../../types/admin'

type FieldVisitDetailDrawerProps = {
  row: FieldVisitRow
  durationMinutes: number | null
  loading: boolean
  error: string
  timelineItems: FieldVisitTimelineItem[]
  formatDateTime: (value?: string) => string
  onClose: () => void
}

export default function FieldVisitDetailDrawer({
  row,
  durationMinutes,
  loading,
  error,
  timelineItems,
  formatDateTime,
  onClose
}: FieldVisitDetailDrawerProps) {
  return (
    <>
      <button className="side-panel-scrim" type="button" aria-label="Close field visit details" onClick={onClose} />
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
          <span>Hours there: {formatVisitDuration(durationMinutes)}</span>
          <span>Distance: {row.distanceKm ? formatDistanceKm(row.distanceKm) : '--'}</span>
        </div>

        {loading ? (
          <div className="empty-state">Loading field visit details...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : (
          <div className="field-visit-timeline">
            {timelineItems.map((item) => (
              <div key={item.id} className={`field-visit-timeline-item ${item.kind}`}>
                <div className="field-visit-timeline-icon" aria-hidden="true" />
                <div className="field-visit-timeline-content">
                  <strong>{item.title}</strong>
                  <span>{item.address}</span>
                  <span>{formatCoordsValue(item.coords) || '--'}</span>
                  <small>
                    {[item.trackedAt ? formatDateTime(item.trackedAt) : '', item.trackingType ? toTitleCase(item.trackingType.replace(/_/g, ' ')) : '']
                      .filter(Boolean)
                      .join(' • ') || '--'}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  )
}
