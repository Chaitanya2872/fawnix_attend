import type {
  ActivityRow,
  FieldVisitRow,
  FieldVisitTimelineItem,
  FieldVisitTrackingPoint,
  MapTrackingPoint
} from '../../../types/admin'
import { toTitleCase } from './formatters'

export function parseCoords(lat?: number | string, lon?: number | string) {
  const latNum = Number(lat)
  const lonNum = Number(lon)
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return null
  }
  if (latNum === 0 && lonNum === 0) {
    return null
  }
  return { lat: latNum, lon: lonNum }
}

export function formatCoordsValue(coords?: { lat: number; lon: number } | null) {
  if (!coords) {
    return undefined
  }
  return `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`
}

export function isCompletedVisitStatus(status?: string) {
  const normalized = (status || '').trim().toLowerCase()
  return ['completed', 'complete', 'closed', 'ended'].includes(normalized)
}

export function parseDateTimeValue(value?: string) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed
  }

  const normalized = value.includes(' ') && !value.includes('T')
    ? value.replace(' ', 'T')
    : value
  const fallback = new Date(normalized)
  if (!Number.isNaN(fallback.getTime())) {
    return fallback
  }

  return null
}

function normalizeDurationMinutes(value?: number | string | null) {
  if (value === null || value === undefined) {
    return null
  }

  const minutes = Number(value)
  if (!Number.isFinite(minutes)) {
    return null
  }

  return Math.max(0, Math.floor(minutes))
}

export function resolveVisitDurationMinutes(
  durationMinutes?: number | string | null,
  startTime?: string,
  endTime?: string,
  isCompleted = false,
  referenceTimestamp?: number
) {
  const persistedDuration = normalizeDurationMinutes(durationMinutes)
  if (persistedDuration !== null) {
    return persistedDuration
  }

  const startDate = parseDateTimeValue(startTime)
  if (!startDate) {
    return null
  }

  const endDate = parseDateTimeValue(endTime) || (!isCompleted
    ? new Date(referenceTimestamp || Date.now())
    : null)
  if (!endDate) {
    return null
  }

  const minutes = Math.floor((endDate.getTime() - startDate.getTime()) / 60000)
  if (!Number.isFinite(minutes)) {
    return null
  }

  return Math.max(0, minutes)
}

export function formatVisitDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined) {
    return '--'
  }

  const totalMinutes = Math.max(0, Math.floor(minutes))
  const hours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  if (!hours) {
    return `${remainingMinutes}m`
  }
  if (!remainingMinutes) {
    return `${hours}h`
  }

  return `${hours}h ${remainingMinutes}m`
}

export function getLocationName(address?: string, fallback = 'Location') {
  const text = (address || '').trim()
  if (!text) {
    return fallback
  }
  const [firstPart] = text.split(',')
  const name = (firstPart || '').trim()
  return name || text
}

export function compactCoords(points: Array<{ lat: number; lon: number } | null | undefined>) {
  return points.filter((point): point is { lat: number; lon: number } => Boolean(point))
}

export function calculateDistanceKm(points: Array<{ lat: number; lon: number }>) {
  if (points.length < 2) {
    return 0
  }

  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6371
  let total = 0

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const curr = points[i]
    const deltaLat = toRad(curr.lat - prev.lat)
    const deltaLon = toRad(curr.lon - prev.lon)
    const lat1 = toRad(prev.lat)
    const lat2 = toRad(curr.lat)
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    total += earthRadius * c
  }

  return total
}

export function formatDestinationLocation(destinations?: ActivityRow['destinations']) {
  if (!Array.isArray(destinations) || !destinations.length) {
    return '--'
  }

  const labels = destinations
    .map((destination) => destination?.name || destination?.address)
    .filter((value): value is string => Boolean(value && value.trim()))

  return labels.length ? labels.join(', ') : '--'
}

export function getDestinationVisitedStatus(destinations?: ActivityRow['destinations']) {
  if (!Array.isArray(destinations) || !destinations.length) {
    return null
  }

  return destinations.every((destination) => Boolean(destination?.visited))
}

export function getDestinationVisitFlag(destinations?: ActivityRow['destinations']) {
  if (!Array.isArray(destinations) || !destinations.length) {
    return null
  }

  return destinations.some((destination) => Boolean(destination?.visited))
}

export function getDestinationVisitCounts(destinations?: ActivityRow['destinations']) {
  if (!Array.isArray(destinations) || !destinations.length) {
    return { visitedCount: 0, totalCount: 0 }
  }

  return {
    visitedCount: destinations.filter((destination) => Boolean(destination?.visited)).length,
    totalCount: destinations.length
  }
}

export function normalizeFieldVisitTrackingPoints(points: FieldVisitTrackingPoint[] = []): MapTrackingPoint[] {
  const normalized: MapTrackingPoint[] = []

  points.forEach((point) => {
    const parsedFromLatLon = parseCoords(point.latitude, point.longitude)
    const parsedFromLocation = point.location
      ? (() => {
          const [latValue = '', lonValue = ''] = point.location.split(',').map((value) => value.trim())
          return parseCoords(latValue, lonValue)
        })()
      : null
    const coords = parsedFromLatLon || parsedFromLocation
    if (!coords) {
      return
    }

    normalized.push({
      lat: coords.lat,
      lon: coords.lon,
      trackedAt: point.tracked_at,
      trackingType: point.tracking_type
    })
  })

  return normalized
}

export function buildFieldVisitTimelineItems(
  row: FieldVisitRow,
  activityTracking: FieldVisitTrackingPoint[] = [],
  fieldTracking: FieldVisitTrackingPoint[] = []
): FieldVisitTimelineItem[] {
  const items: FieldVisitTimelineItem[] = []

  items.push({
    id: `${row.activityId}-start`,
    kind: 'start',
    title: row.startName || 'Start',
    address: row.startAddress || row.location || 'Start address unavailable',
    coords: row.startCoords,
    trackedAt: row.visitDate
  })

  const trackingSource = activityTracking.length ? activityTracking : fieldTracking
  trackingSource.forEach((point, index) => {
    const coords =
      parseCoords(point.latitude, point.longitude) ||
      (point.location
        ? (() => {
            const [latValue = '', lonValue = ''] = point.location.split(',').map((value) => value.trim())
            return parseCoords(latValue, lonValue)
          })()
        : null)

    items.push({
      id: `${row.activityId}-point-${index}`,
      kind: 'point',
      title: point.tracking_type ? toTitleCase(point.tracking_type.replace(/_/g, ' ')) : `Point ${index + 1}`,
      address: point.address || point.location || 'Address unavailable',
      coords,
      trackedAt: point.tracked_at,
      trackingType: point.tracking_type
    })
  })

  if (row.isCompleted) {
    items.push({
      id: `${row.activityId}-end`,
      kind: 'end',
      title: row.endName || 'End',
      address: row.endAddress || 'End address unavailable',
      coords: row.endCoords,
      trackedAt: undefined
    })
  }

  return items
}

function areSameCoords(
  left?: { lat: number; lon: number } | null,
  right?: { lat: number; lon: number } | null
) {
  if (!left || !right) {
    return false
  }

  return Math.abs(left.lat - right.lat) < 0.000001 && Math.abs(left.lon - right.lon) < 0.000001
}

export function buildRoutePoints(
  start?: { lat: number; lon: number } | null,
  tracked: Array<{ lat: number; lon: number }> = [],
  end?: { lat: number; lon: number } | null
) {
  const route: Array<{ lat: number; lon: number }> = []

  if (start) {
    route.push(start)
  }

  for (const point of tracked) {
    if (!route.length || !areSameCoords(route[route.length - 1], point)) {
      route.push(point)
    }
  }

  if (end && (!route.length || !areSameCoords(route[route.length - 1], end))) {
    route.push(end)
  }

  return route
}
