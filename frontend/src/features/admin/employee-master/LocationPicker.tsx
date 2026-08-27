/**
 * OpenStreetMap location picker for work locations.
 *
 * Drops a draggable pin on a Leaflet/OSM map and writes the result straight
 * back into the form's latitude/longitude fields — typing coordinates by hand
 * is both tedious and easy to get wrong. Search uses Nominatim (the same
 * geocoder the field-visits map already relies on), and the geofence radius is
 * drawn as a circle so its real-world size is obvious before saving.
 */

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './LocationPicker.css'

type LocationPickerProps = {
  latitude: string
  longitude: string
  /** Metres. Drawn as a circle around the pin when set. */
  geofenceRadius: string
  /** Seeded into the search box so an address already typed can be located. */
  addressHint?: string
  onChange: (next: { latitude: string; longitude: string }) => void
  /** Called when a search result carries address parts worth filling in. */
  onResolveAddress?: (parts: { city?: string; state?: string; country?: string; pincode?: string }) => void
  disabled?: boolean
}

type NominatimResult = {
  lat: string
  lon: string
  display_name: string
  address?: Record<string, string>
}

// India-centred default: the app formats dates en-IN and ships INR payroll.
const FALLBACK_CENTER: [number, number] = [20.5937, 78.9629]
const FALLBACK_ZOOM = 4
const PLACED_ZOOM = 16

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

/** Six decimals is ~0.1 m — well past what a geofence needs. */
const toFixedCoord = (value: number) => value.toFixed(6)

const parseCoord = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && value.trim() !== '' ? parsed : null
}

export default function LocationPicker({
  latitude,
  longitude,
  geofenceRadius,
  addressHint,
  onChange,
  onResolveAddress,
  disabled,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  // Held in a ref so the map's event handlers never close over a stale prop.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])

  const lat = parseCoord(latitude)
  const lon = parseCoord(longitude)
  const hasPoint = lat !== null && lon !== null

  // Build the map once; later prop changes are pushed in by the effects below.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })
    mapRef.current = map
    map.setView(FALLBACK_CENTER, FALLBACK_ZOOM)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (event: L.LeafletMouseEvent) => {
      onChangeRef.current({
        latitude: toFixedCoord(event.latlng.lat),
        longitude: toFixedCoord(event.latlng.lng),
      })
    })

    // The drawer animates in, so the map must re-measure once it has settled.
    const settle = window.setTimeout(() => map.invalidateSize(), 60)

    return () => {
      window.clearTimeout(settle)
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
  }, [])

  // Keep the pin and the geofence circle in step with the form values.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!hasPoint) {
      markerRef.current?.remove()
      markerRef.current = null
      circleRef.current?.remove()
      circleRef.current = null
      return
    }

    const position: [number, number] = [lat as number, lon as number]

    if (!markerRef.current) {
      const marker = L.marker(position, { icon: markerIcon, draggable: !disabled }).addTo(map)
      marker.on('dragend', () => {
        const { lat: nextLat, lng: nextLon } = marker.getLatLng()
        onChangeRef.current({ latitude: toFixedCoord(nextLat), longitude: toFixedCoord(nextLon) })
      })
      markerRef.current = marker
      map.setView(position, Math.max(map.getZoom(), PLACED_ZOOM))
    } else {
      markerRef.current.setLatLng(position)
      markerRef.current.dragging?.[disabled ? 'disable' : 'enable']()
    }

    const radius = Number(geofenceRadius)
    if (Number.isFinite(radius) && radius > 0) {
      if (circleRef.current) {
        circleRef.current.setLatLng(position).setRadius(radius)
      } else {
        circleRef.current = L.circle(position, {
          radius,
          color: '#106b52',
          fillColor: '#106b52',
          fillOpacity: 0.12,
          weight: 1.5,
        }).addTo(map)
      }
    } else {
      circleRef.current?.remove()
      circleRef.current = null
    }
  }, [lat, lon, hasPoint, geofenceRadius, disabled])

  const runSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    const query = (search || addressHint || '').trim()
    if (!query) {
      setSearchError('Type an address or place to search for.')
      return
    }

    setSearching(true)
    setSearchError('')
    setResults([])

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
      )
      if (!response.ok) throw new Error('Address lookup failed. Try again in a moment.')
      const found = (await response.json()) as NominatimResult[]
      if (!Array.isArray(found) || found.length === 0) {
        setSearchError(`No place found for “${query}”. Try a broader search, or click the map.`)
        return
      }
      setResults(found)
      if (found.length === 1) applyResult(found[0])
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Address lookup failed.')
    } finally {
      setSearching(false)
    }
  }

  const applyResult = (result: NominatimResult) => {
    onChangeRef.current({
      latitude: toFixedCoord(Number(result.lat)),
      longitude: toFixedCoord(Number(result.lon)),
    })
    setResults([])
    setSearch(result.display_name)

    const address = result.address || {}
    onResolveAddress?.({
      city: address.city || address.town || address.village || address.suburb || address.county,
      state: address.state,
      country: address.country,
      pincode: address.postcode,
    })
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('This browser cannot report your location.')
      return
    }
    setSearchError('')
    navigator.geolocation.getCurrentPosition(
      (position) =>
        onChangeRef.current({
          latitude: toFixedCoord(position.coords.latitude),
          longitude: toFixedCoord(position.coords.longitude),
        }),
      () => setSearchError('Could not read your location. Check the browser permission.')
    )
  }

  return (
    <div className="em-locpick">
      <div className="em-locpick-controls">
        <div className="em-locpick-search">
          <input
            type="search"
            value={search}
            placeholder={addressHint ? `Search — e.g. ${addressHint}` : 'Search an address or place'}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              // The picker lives inside the record form; Enter must search here,
              // not submit the whole form.
              if (event.key === 'Enter') {
                event.preventDefault()
                void runSearch(event)
              }
            }}
            disabled={disabled}
          />
          <button className="adm-btn" type="button" onClick={runSearch} disabled={disabled || searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        <button className="adm-btn em-locpick-here" type="button" onClick={useCurrentLocation} disabled={disabled}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2v3m0 14v3M2 12h3m14 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
          Use my location
        </button>
      </div>

      {searchError ? <p className="em-locpick-error">{searchError}</p> : null}

      {results.length > 1 ? (
        <ul className="em-locpick-results">
          {results.map((result) => (
            <li key={`${result.lat}-${result.lon}`}>
              <button type="button" onClick={() => applyResult(result)}>
                {result.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="em-locpick-map" ref={containerRef} role="application" aria-label="Work location map" />

      <div className="em-locpick-foot">
        {hasPoint ? (
          <>
            <span className="em-locpick-coords">
              <b>{latitude}</b>, <b>{longitude}</b>
            </span>
            <button
              className="em-locpick-clear"
              type="button"
              onClick={() => onChangeRef.current({ latitude: '', longitude: '' })}
              disabled={disabled}
            >
              Clear pin
            </button>
          </>
        ) : (
          <span className="em-locpick-hint">Click the map, search an address, or drag the pin to set coordinates.</span>
        )}
      </div>
    </div>
  )
}
