import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  buildFieldVisitTimelineItems,
  buildRoutePoints,
  calculateDistanceKm,
  compactCoords,
  getLocationName,
  isCompletedVisitStatus,
  normalizeFieldVisitTrackingPoints,
  parseCoords,
  resolveVisitDurationMinutes
} from '../utils/fieldVisits'
import type {
  FieldVisitRow,
  FieldVisitTimelineItem,
  FieldVisitTrackingPoint,
  MapTrackingPoint
} from '../../../types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

type UseFieldVisitsPanelOptions = {
  showAdminLogin: boolean
  fieldVisitRows: FieldVisitRow[]
  apiRequest: ApiRequest
}

export function useFieldVisitsPanel({ showAdminLogin, fieldVisitRows, apiRequest }: UseFieldVisitsPanelOptions) {
  const [fieldVisitDurationTick, setFieldVisitDurationTick] = useState(() => Date.now())
  const [fieldVisitPanelOpen, setFieldVisitPanelOpen] = useState(false)
  const [fieldVisitPanelRow, setFieldVisitPanelRow] = useState<FieldVisitRow | null>(null)
  const [fieldVisitPanelLoading, setFieldVisitPanelLoading] = useState(false)
  const [fieldVisitPanelError, setFieldVisitPanelError] = useState('')
  const [fieldVisitTimelineItems, setFieldVisitTimelineItems] = useState<FieldVisitTimelineItem[]>([])
  const [mapDialogOpen, setMapDialogOpen] = useState(false)
  const [mapDialogTitle, setMapDialogTitle] = useState('')
  const [mapDialogLoading, setMapDialogLoading] = useState(false)
  const [mapDialogError, setMapDialogError] = useState('')
  const [mapPoints, setMapPoints] = useState<Array<{ lat: number; lon: number }>>([])
  const [mapTrackingPoints, setMapTrackingPoints] = useState<MapTrackingPoint[]>([])
  const [mapFieldTrackingPoints, setMapFieldTrackingPoints] = useState<MapTrackingPoint[]>([])
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(null)
  const [mapSummary, setMapSummary] = useState<{
    startName?: string
    startAddress?: string
    endName?: string
    endAddress?: string
    startCoords?: { lat: number; lon: number } | null
    endCoords?: { lat: number; lon: number } | null
    distanceKm?: number | null
    pointsCount?: number
    isCompleted?: boolean
  } | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)

  const openFieldVisitPanel = async (row: FieldVisitRow) => {
    setFieldVisitPanelOpen(true)
    setFieldVisitPanelRow(row)
    setFieldVisitPanelError('')
    setFieldVisitPanelLoading(true)
    setFieldVisitDurationTick(Date.now())
    setFieldVisitTimelineItems(buildFieldVisitTimelineItems(
      row,
      Array.isArray(row.activityTracking) ? row.activityTracking : [],
      Array.isArray(row.fieldTracking) ? row.fieldTracking : []
    ))

    if (!row.fieldVisitId) {
      setFieldVisitPanelLoading(false)
      return
    }

    try {
      const trackingResponse = await apiRequest(`/api/admin/field-visits/${row.fieldVisitId}/tracking`, {})
      const visit = trackingResponse?.data?.field_visit || {}
      const trackingPoints: FieldVisitTrackingPoint[] = Array.isArray(trackingResponse?.data?.tracking_points)
        ? trackingResponse.data.tracking_points
        : []
      const status = visit.status || row.status
      const isCompleted = isCompletedVisitStatus(status)
      const visitStartTime = row.visitStartTime || row.visitDate || visit.start_time
      const visitEndTime = visit.end_time || row.visitEndTime

      const enrichedRow: FieldVisitRow = {
        ...row,
        status,
        isCompleted,
        visitDate: row.visitDate || visitStartTime,
        visitStartTime,
        visitEndTime,
        durationMinutes: resolveVisitDurationMinutes(
          visit.duration_minutes ?? row.durationMinutes,
          visitStartTime,
          visitEndTime,
          isCompleted
        ),
        startAddress: visit.start_address || row.startAddress,
        endAddress: visit.end_address || row.endAddress,
        startCoords: parseCoords(visit.start_latitude, visit.start_longitude) || row.startCoords,
        endCoords: parseCoords(visit.end_latitude, visit.end_longitude) || row.endCoords,
        distanceKm: Number.isFinite(Number(trackingResponse?.data?.total_distance_km))
          ? Number(trackingResponse.data.total_distance_km)
          : row.distanceKm
      }

      setFieldVisitPanelRow(enrichedRow)
      setFieldVisitTimelineItems(buildFieldVisitTimelineItems(
        enrichedRow,
        Array.isArray(row.activityTracking) ? row.activityTracking : [],
        trackingPoints.length ? trackingPoints : (Array.isArray(row.fieldTracking) ? row.fieldTracking : [])
      ))
    } catch (error) {
      setFieldVisitPanelError(error instanceof Error ? error.message : 'Failed to load field visit details')
    } finally {
      setFieldVisitPanelLoading(false)
    }
  }

  const openMapForFieldVisit = async (row: FieldVisitRow) => {
    const startLocationText = (row.startAddress || row.location || '').trim()
    const isCompleted = isCompletedVisitStatus(row.status)
    const coordMatch = startLocationText.match(/-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/)
    const activityTrackingFromRow = normalizeFieldVisitTrackingPoints(Array.isArray(row.activityTracking) ? row.activityTracking : [])
    const fieldTrackingFromRow = normalizeFieldVisitTrackingPoints(Array.isArray(row.fieldTracking) ? row.fieldTracking : [])

    setMapDialogTitle(isCompleted ? 'Activity Route' : 'Activity Location')
    setMapDialogOpen(true)
    setMapDialogError('')
    setMapDialogLoading(true)
    setMapPoints([])
    setMapTrackingPoints([])
    setMapFieldTrackingPoints([])
    setMapCenter(null)
    setMapSummary({
      startName: row.startName || getLocationName(row.startAddress || row.location, 'Start Location'),
      startAddress: row.startAddress || row.location,
      endName: isCompleted ? row.endName || getLocationName(row.endAddress, 'End Location') : undefined,
      endAddress: isCompleted ? row.endAddress : undefined,
      startCoords: row.startCoords,
      endCoords: isCompleted ? row.endCoords : undefined,
      distanceKm: isCompleted ? row.distanceKm : null,
      pointsCount: undefined,
      isCompleted
    })

    if (row.activityId) {
      try {
        const routeResponse = await apiRequest(`/api/activities/route/${row.activityId}`, {})
        const routeData = routeResponse?.data || {}
        const activityTrackingPoints = normalizeFieldVisitTrackingPoints(
          Array.isArray(routeData?.tracking_points) ? routeData.tracking_points : []
        )
        const fieldTrackingPoints = normalizeFieldVisitTrackingPoints(
          Array.isArray(routeData?.field_visit_checkpoints) ? routeData.field_visit_checkpoints : []
        )
        const nextActivityTracking = activityTrackingPoints.length ? activityTrackingPoints : activityTrackingFromRow
        const nextFieldTracking = fieldTrackingPoints.length ? fieldTrackingPoints : fieldTrackingFromRow
        const trackingForRoute = nextActivityTracking.length ? nextActivityTracking : nextFieldTracking
        const startCoordsFromRoute = parseCoords(routeData?.start_location?.latitude, routeData?.start_location?.longitude)
        const endCoordsFromRoute = parseCoords(routeData?.end_location?.latitude, routeData?.end_location?.longitude)
        const startCoords =
          startCoordsFromRoute ||
          row.startCoords ||
          (trackingForRoute.length ? { lat: trackingForRoute[0].lat, lon: trackingForRoute[0].lon } : null)
        const endCoords =
          endCoordsFromRoute ||
          row.endCoords ||
          (trackingForRoute.length
            ? { lat: trackingForRoute[trackingForRoute.length - 1].lat, lon: trackingForRoute[trackingForRoute.length - 1].lon }
            : null)
        const routeStatus = routeData?.status || row.status
        const routeIsCompleted = isCompletedVisitStatus(routeStatus)
        const nextPoints = buildRoutePoints(
          startCoords,
          trackingForRoute.map((point) => ({ lat: point.lat, lon: point.lon })),
          routeIsCompleted ? endCoords : null
        )
        const fallbackPoints = nextPoints.length ? nextPoints : compactCoords([startCoords, endCoords])

        setMapTrackingPoints(nextActivityTracking)
        setMapFieldTrackingPoints(nextFieldTracking)
        setMapPoints(fallbackPoints)
        if (fallbackPoints.length) {
          setMapCenter(fallbackPoints[0])
        }

        const startAddress = routeData?.start_location?.address || row.startAddress || row.location
        const endAddress = routeData?.end_location?.address || row.endAddress
        const totalDistanceValue = Number(routeData?.total_distance_km)
        const computedDistance =
          Number.isFinite(totalDistanceValue) && totalDistanceValue > 0
            ? totalDistanceValue
            : fallbackPoints.length >= 2
              ? calculateDistanceKm(fallbackPoints)
              : (row.distanceKm ?? null)

        setMapSummary({
          startName: getLocationName(startAddress, 'Start Location'),
          startAddress,
          endName: routeIsCompleted ? getLocationName(endAddress, 'End Location') : undefined,
          endAddress: routeIsCompleted ? endAddress : undefined,
          startCoords,
          endCoords: routeIsCompleted ? endCoords : undefined,
          distanceKm:
            computedDistance !== null && computedDistance !== undefined && Number.isFinite(computedDistance)
              ? computedDistance
              : null,
          pointsCount: nextActivityTracking.length,
          isCompleted: routeIsCompleted
        })
        setMapDialogLoading(false)
        if (fallbackPoints.length || nextActivityTracking.length || nextFieldTracking.length) {
          return
        }
      } catch {
        // Continue to field-visit and geocode fallbacks.
      }
    }

    if (row.fieldVisitId) {
      try {
        const trackingResponse = await apiRequest(`/api/admin/field-visits/${row.fieldVisitId}/tracking`, {})
        const visit = trackingResponse?.data?.field_visit || {}
        const points: FieldVisitTrackingPoint[] = Array.isArray(trackingResponse?.data?.tracking_points)
          ? trackingResponse.data.tracking_points
          : []
        const normalizedFieldPoints = normalizeFieldVisitTrackingPoints(points)
        const normalizedActivityPoints = activityTrackingFromRow
        const trackedRoutePoints = normalizedActivityPoints.length ? normalizedActivityPoints : normalizedFieldPoints
        setMapTrackingPoints(normalizedActivityPoints)
        setMapFieldTrackingPoints(normalizedFieldPoints)
        const latestTrackedPoint = points.length ? points[points.length - 1] : null
        const firstTrackedPoint = points.find((point: { address?: string }) => point?.address)
        const mappedPoints = trackedRoutePoints.map((point) => ({
          lat: point.lat,
          lon: point.lon
        }))
        const visitStatus = visit.status || row.status
        const visitIsCompleted = isCompletedVisitStatus(visitStatus)
        setMapDialogTitle(visitIsCompleted ? 'Activity Route' : 'Activity Location')
        const startCoordsFromVisit = parseCoords(visit.start_latitude, visit.start_longitude)
        const endCoordsFromVisit = parseCoords(visit.end_latitude, visit.end_longitude)
        const startCoords = startCoordsFromVisit || row.startCoords || (mappedPoints.length ? mappedPoints[0] : null)
        const endCoords =
          endCoordsFromVisit || row.endCoords || (mappedPoints.length ? mappedPoints[mappedPoints.length - 1] : null)
        const nextPoints =
          buildRoutePoints(startCoords, mappedPoints, visitIsCompleted ? endCoords : null)
        const fallbackPoints = nextPoints.length ? nextPoints : compactCoords([startCoords, endCoords])
        setMapPoints(fallbackPoints)
        if (fallbackPoints.length) {
          setMapCenter(fallbackPoints[0])
        }
        const startAddress = visit.start_address || firstTrackedPoint?.address || row.startAddress || row.location
        const endAddress = visitIsCompleted
          ? visit.end_address || latestTrackedPoint?.address || row.endAddress
          : undefined
        const totalDistanceValue = Number(trackingResponse?.data?.total_distance_km)
        const computedDistance = visitIsCompleted
          ? Number.isFinite(totalDistanceValue) && totalDistanceValue > 0
            ? totalDistanceValue
            : calculateDistanceKm(fallbackPoints)
          : null
        setMapSummary({
          startName: getLocationName(startAddress, 'Start Location'),
          startAddress,
          endName: visitIsCompleted ? getLocationName(endAddress, 'End Location') : undefined,
          endAddress: visitIsCompleted ? endAddress : undefined,
          startCoords,
          endCoords: visitIsCompleted ? endCoords : undefined,
          distanceKm: visitIsCompleted ? (computedDistance ?? row.distanceKm ?? null) : null,
          pointsCount: normalizedActivityPoints.length || trackedRoutePoints.length || fallbackPoints.length,
          isCompleted: visitIsCompleted
        })
        setMapDialogLoading(false)
        if (fallbackPoints.length || normalizedActivityPoints.length || normalizedFieldPoints.length) {
          return
        }
      } catch (error) {
        setMapDialogError(error instanceof Error ? error.message : 'Unable to load tracking points.')
      }
    }

    if (coordMatch) {
      const [lat, lon] = coordMatch[0].split(',').map((value) => value.trim())
      const latNum = Number(lat)
      const lonNum = Number(lon)
      setMapPoints([{ lat: latNum, lon: lonNum }])
      setMapTrackingPoints([{ lat: latNum, lon: lonNum, trackingType: 'initial' }])
      setMapCenter({ lat: latNum, lon: lonNum })
      setMapDialogLoading(false)
      return
    }

    if (!startLocationText) {
      setMapDialogError('Start location unavailable.')
      setMapDialogLoading(false)
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startLocationText)}&limit=1`
      )
      const results = await response.json()
      const match = Array.isArray(results) ? results[0] : null
      if (!match) {
        throw new Error('Unable to locate this address.')
      }
      const latNum = Number(match.lat)
      const lonNum = Number(match.lon)
      setMapPoints([{ lat: latNum, lon: lonNum }])
      setMapTrackingPoints([{ lat: latNum, lon: lonNum, trackingType: 'initial' }])
      setMapCenter({ lat: latNum, lon: lonNum })
    } catch (error) {
      setMapDialogError(error instanceof Error ? error.message : 'Unable to load map.')
    } finally {
      setMapDialogLoading(false)
    }
  }

  useEffect(() => {
    if (showAdminLogin) {
      return undefined
    }

    const hasActiveFieldVisit = fieldVisitRows.some((row) => !row.isCompleted)
    if (!hasActiveFieldVisit) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setFieldVisitDurationTick(Date.now())
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [showAdminLogin, fieldVisitRows])

  useEffect(() => {
    setFieldVisitDurationTick(Date.now())
  }, [fieldVisitRows])

  useEffect(() => {
    if (!mapDialogOpen || !mapContainerRef.current || !mapCenter) {
      return
    }

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(mapContainerRef.current, { zoomControl: true })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    })

    if (mapPoints.length > 1) {
      const latlngs = mapPoints.map((point) => [point.lat, point.lon] as [number, number])
      const dotLatLngs = (mapTrackingPoints.length ? mapTrackingPoints : mapPoints).map((point) => [
        point.lat,
        point.lon
      ] as [number, number])
      L.polyline(latlngs, { color: '#2f6fe4', weight: 4 }).addTo(map)
      L.marker(latlngs[0], { icon: defaultIcon }).addTo(map)
      L.marker(latlngs[latlngs.length - 1], { icon: defaultIcon }).addTo(map)

      dotLatLngs.forEach((latlng) => {
        L.circleMarker(latlng, {
          radius: 5,
          color: '#ffffff',
          fillColor: '#2f6fe4',
          fillOpacity: 1,
          weight: 2
        }).addTo(map)
      })

      map.fitBounds(latlngs, { padding: [30, 30] })
    } else {
      map.setView([mapCenter.lat, mapCenter.lon], 14)
      L.marker([mapCenter.lat, mapCenter.lon], { icon: defaultIcon }).addTo(map)
    }

    // Ensure Leaflet recalculates tiles after modal layout settles.
    window.setTimeout(() => {
      map.invalidateSize()
    }, 0)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [mapDialogOpen, mapCenter, mapPoints, mapTrackingPoints])

  const fieldVisitPanelDurationMinutes = fieldVisitPanelRow
    ? resolveVisitDurationMinutes(
        fieldVisitPanelRow.durationMinutes,
        fieldVisitPanelRow.visitStartTime || fieldVisitPanelRow.visitDate,
        fieldVisitPanelRow.visitEndTime,
        fieldVisitPanelRow.isCompleted,
        fieldVisitDurationTick
      )
    : null

  const fieldPointCount = mapFieldTrackingPoints.length
  const activityPointCount = mapTrackingPoints.length || mapSummary?.pointsCount || 0
  const startPoint =
    mapSummary?.startCoords ||
    (mapTrackingPoints.length ? { lat: mapTrackingPoints[0].lat, lon: mapTrackingPoints[0].lon } : null) ||
    (mapPoints.length ? mapPoints[0] : null)
  const endPoint =
    mapSummary?.endCoords ||
    (mapTrackingPoints.length
      ? { lat: mapTrackingPoints[mapTrackingPoints.length - 1].lat, lon: mapTrackingPoints[mapTrackingPoints.length - 1].lon }
      : null) ||
    (mapPoints.length ? mapPoints[mapPoints.length - 1] : null)

  return {
    fieldVisitDurationTick,
    fieldVisitPanelOpen,
    setFieldVisitPanelOpen,
    fieldVisitPanelRow,
    fieldVisitPanelLoading,
    fieldVisitPanelError,
    fieldVisitTimelineItems,
    mapDialogOpen,
    setMapDialogOpen,
    mapDialogTitle,
    mapDialogLoading,
    mapDialogError,
    mapPoints,
    mapTrackingPoints,
    mapFieldTrackingPoints,
    mapCenter,
    mapSummary,
    mapContainerRef,
    openFieldVisitPanel,
    openMapForFieldVisit,
    fieldVisitPanelDurationMinutes,
    fieldPointCount,
    activityPointCount,
    startPoint,
    endPoint
  }
}
