import type { RefObject } from 'react'
import { formatCoords, formatDistanceKm } from '../utils/formatters'
import type { MapTrackingPoint } from '../../../types/admin'

type MapDialogProps = {
  title: string
  loading: boolean
  error: string
  mapContainerRef: RefObject<HTMLDivElement | null>
  mapCenter: { lat: number; lon: number } | null
  fieldPointCount: number
  activityPointCount: number
  distanceKm: number | null | undefined
  startPoint: { lat: number; lon: number } | null
  endPoint: { lat: number; lon: number } | null
  mapTrackingPoints: MapTrackingPoint[]
  onClose: () => void
}

export default function MapDialog({
  title,
  loading,
  error,
  mapContainerRef,
  mapCenter,
  fieldPointCount,
  activityPointCount,
  distanceKm,
  startPoint,
  endPoint,
  mapTrackingPoints,
  onClose
}: MapDialogProps) {
  return (
    <div className="map-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="map-dialog">
        <div className="map-dialog-header">
          <strong>{title || 'Activity Route'}</strong>
        </div>
        <div className="map-dialog-body">
          {loading ? (
            <div className="map-dialog-state">Loading map...</div>
          ) : error ? (
            <div className="map-dialog-state">{error}</div>
          ) : mapCenter ? (
            <>
              <div ref={mapContainerRef} className="map-dialog-map" />
              <div className="map-dialog-meta">
                <div className="map-dialog-chip-row">
                  <span className="map-dialog-chip">Field points: {fieldPointCount}</span>
                  <span className="map-dialog-chip">Activity points: {activityPointCount}</span>
                  {distanceKm !== null && distanceKm !== undefined && !Number.isNaN(distanceKm) ? (
                    <span className="map-dialog-chip">Distance: {formatDistanceKm(distanceKm)}</span>
                  ) : null}
                </div>
                <div className="map-dialog-coords-row">
                  <div>Start: {formatCoords(startPoint)}</div>
                  <div>End: {formatCoords(endPoint)}</div>
                </div>
                <div className="map-dialog-points">
                  <strong>Activity GPS Points</strong>
                  {mapTrackingPoints.length ? (
                    <ol>
                      {mapTrackingPoints.map((point, index) => {
                        const typeLabel = (point.trackingType || 'auto').trim().toLowerCase()
                        return (
                          <li key={`${point.lat}-${point.lon}-${point.trackedAt || index}`}>
                            {`${point.lat.toFixed(6)}, ${point.lon.toFixed(6)} [${typeLabel}]`}
                            {point.trackedAt ? ` at ${point.trackedAt}` : ''}
                          </li>
                        )
                      })}
                    </ol>
                  ) : (
                    <div className="map-dialog-empty-points">No activity GPS points found.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="map-dialog-state">No location data available.</div>
          )}
        </div>
        <div className="map-dialog-footer">
          <button className="map-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
