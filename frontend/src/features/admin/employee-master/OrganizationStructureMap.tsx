import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import './OrganizationStructureMap.css'
import type { EmployeeMasterRecord, EmployeeRow } from '../../../types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRequest = (path: string, options?: RequestInit, tokenOverride?: string) => Promise<any>

type OrganizationStructureMapProps = {
  accessToken: string
  apiRequest: ApiRequest
  employees: EmployeeRow[]
  currentDepartmentRecords: EmployeeMasterRecord[]
  departmentRecordsVersion: string
}

type DepartmentSeed = {
  id: string
  name: string
  code: string
  head: string
  status: string
  source: 'master' | 'employee' | 'unassigned'
}

type PositionedDepartment = DepartmentSeed & {
  angle: number
  employeeCount: number
  x: number
  y: number
}

type PositionedEmployee = {
  key: string
  name: string
  designation: string
  initials: string
  photoUrl: string
  tone: string
  x: number
  y: number
}

type MapTransform = {
  x: number
  y: number
  scale: number
}

type ViewportSize = {
  width: number
  height: number
}

type DepartmentRingPlan = {
  start: number
  count: number
  radius: number
  index: number
}

type ZoomInput = number | ((currentScale: number) => number)

const DEPARTMENTS_ENDPOINT = '/api/admin/employee-master/departments'
const DEPARTMENT_PAGE_SIZE = 100
const MAX_DEPARTMENT_FETCH_PAGES = 25
const EMPLOYEES_PER_RING = 10
const ROOT_NODE_SIZE = 92
const DEPARTMENT_NODE_SIZE = 108
const DEPARTMENT_NODE_CLEARANCE = DEPARTMENT_NODE_SIZE + 28
const EMPLOYEE_CARD_WIDTH = 178
const EMPLOYEE_CARD_HEIGHT = 66
const MIN_ZOOM = 0.32
const MAX_ZOOM = 1.55
const DEFAULT_TRANSFORM: MapTransform = { x: 0, y: 0, scale: 1 }
const DEFAULT_VIEWPORT_SIZE: ViewportSize = { width: 0, height: 0 }
const PHOTO_FIELDS = ['photo', 'photo_url', 'profile_photo', 'avatar_url', 'emp_photo', 'image_url']

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function stringifyValue(value: unknown) {
  if (value == null) {
    return ''
  }

  return String(value).trim()
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}

function normalizeCompactKey(value: string) {
  return normalizeKey(value).replace(/[\s_-]+/g, '')
}

function normalizePositiveInteger(value: unknown, fallback = 0) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) && nextValue > 0
    ? Math.floor(nextValue)
    : fallback
}

function normalizeOptionalBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  return undefined
}

function buildDepartmentRingPlans(departmentCount: number): DepartmentRingPlan[] {
  if (departmentCount <= 0) {
    return [{ start: 0, count: 0, radius: 230, index: 0 }]
  }

  if (departmentCount <= 24) {
    return [{
      start: 0,
      count: departmentCount,
      radius: clamp((departmentCount * DEPARTMENT_NODE_CLEARANCE) / (Math.PI * 2), 230, 430),
      index: 0,
    }]
  }

  const plans: DepartmentRingPlan[] = []
  let remaining = departmentCount
  let start = 0
  let ringIndex = 0
  let radius = 300

  while (remaining > 0) {
    const capacity = Math.max(
      10,
      Math.floor((Math.PI * 2 * radius) / DEPARTMENT_NODE_CLEARANCE)
    )
    const count = Math.min(remaining, capacity)

    plans.push({ start, count, radius, index: ringIndex })
    remaining -= count
    start += count
    ringIndex += 1
    radius += 158
  }

  return plans
}

function getInitials(value: string) {
  const parts = value
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return 'NA'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function makeStableId(prefix: string, value: string) {
  return `${prefix}-${normalizeCompactKey(value) || normalizeKey(value).replace(/[^a-z0-9]+/g, '-')}`
}

function getDepartmentName(record: EmployeeMasterRecord) {
  return (
    stringifyValue(record.department_name) ||
    stringifyValue(record.department) ||
    stringifyValue(record.name) ||
    stringifyValue(record.label) ||
    stringifyValue(record.department_code) ||
    stringifyValue(record.id)
  )
}

function getDepartmentCode(record: EmployeeMasterRecord) {
  return stringifyValue(record.department_code) || stringifyValue(record.code) || stringifyValue(record.id)
}

function getEmployeeField(employee: EmployeeRow, keys: string[]) {
  const row = employee as unknown as Record<string, unknown>
  for (const key of keys) {
    const value = stringifyValue(row[key])
    if (value) {
      return value
    }
  }
  return ''
}

function getEmployeeName(employee: EmployeeRow) {
  return (
    stringifyValue(employee.emp_full_name) ||
    [employee.emp_first_name, employee.emp_last_name]
      .map(stringifyValue)
      .filter(Boolean)
      .join(' ') ||
    stringifyValue(employee.emp_code) ||
    'Unnamed employee'
  )
}

function getEmployeeDepartment(employee: EmployeeRow) {
  return getEmployeeField(employee, ['emp_department', 'department', 'department_name'])
}

function getEmployeeDesignation(employee: EmployeeRow) {
  return getEmployeeField(employee, ['emp_designation', 'designation', 'designation_name', 'role']) || 'No designation'
}

function getEmployeePhotoUrl(employee: EmployeeRow) {
  const row = employee as unknown as Record<string, unknown>
  for (const field of PHOTO_FIELDS) {
    const value = stringifyValue(row[field])
    if (/^(https?:\/\/|data:image\/|blob:|\/)/i.test(value)) {
      return value
    }
  }
  return ''
}

function getEmployeeKey(employee: EmployeeRow, index: number) {
  return (
    stringifyValue(employee.emp_code) ||
    stringifyValue(employee.emp_email) ||
    `${normalizeCompactKey(getEmployeeName(employee))}-${index}`
  )
}

function getTone(value: string) {
  const tones = ['accent', 'info', 'success', 'warning', 'rose']
  const hash = Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0)
  return tones[hash % tones.length]
}

function parseDepartmentResponse(response: unknown) {
  const body = (response || {}) as {
    success?: boolean
    message?: string
    data?: unknown
  }

  if (body.success === false) {
    throw new Error(body.message || 'Failed to load departments.')
  }

  const data = (body.data || {}) as {
    records?: unknown
    departments?: unknown
    pagination?: {
      has_next?: boolean | string
      total_pages?: number | string
      page?: number | string
    }
  }
  const records = Array.isArray(data.records)
    ? (data.records as EmployeeMasterRecord[])
    : Array.isArray(data.departments)
      ? (data.departments as EmployeeMasterRecord[])
      : Array.isArray(body.data)
        ? (body.data as EmployeeMasterRecord[])
        : []

  return {
    records,
    hasNext: normalizeOptionalBoolean(data.pagination?.has_next),
    totalPages: normalizePositiveInteger(data.pagination?.total_pages),
  }
}

function buildDepartmentSeeds(records: EmployeeMasterRecord[], employees: EmployeeRow[]) {
  const seedMap = new Map<string, DepartmentSeed>()
  const lookup = new Map<string, string>()

  const addLookup = (seed: DepartmentSeed) => {
    ;[seed.name, seed.code]
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => {
        lookup.set(normalizeKey(value), seed.id)
        lookup.set(normalizeCompactKey(value), seed.id)
      })
  }

  records.forEach((record, index) => {
    const name = getDepartmentName(record)
    if (!name) {
      return
    }

    const code = getDepartmentCode(record)
    const id = code ? makeStableId('department', code) : makeStableId('department', `${name}-${index}`)
    if (seedMap.has(id)) {
      return
    }

    const seed: DepartmentSeed = {
      id,
      name,
      code,
      head: stringifyValue(record.department_head),
      status: stringifyValue(record.status),
      source: 'master',
    }
    seedMap.set(id, seed)
    addLookup(seed)
  })

  employees.forEach((employee) => {
    const department = getEmployeeDepartment(employee)
    if (!department) {
      return
    }

    const departmentId = lookup.get(normalizeKey(department)) || lookup.get(normalizeCompactKey(department))
    if (departmentId) {
      return
    }

    const seed: DepartmentSeed = {
      id: makeStableId('employee-department', department),
      name: department,
      code: '',
      head: '',
      status: '',
      source: 'employee',
    }
    seedMap.set(seed.id, seed)
    addLookup(seed)
  })

  const hasUnassignedEmployees = employees.some((employee) => !getEmployeeDepartment(employee))
  if (hasUnassignedEmployees) {
    const seed: DepartmentSeed = {
      id: 'department-unassigned',
      name: 'Unassigned',
      code: '',
      head: '',
      status: '',
      source: 'unassigned',
    }
    seedMap.set(seed.id, seed)
    addLookup(seed)
  }

  return Array.from(seedMap.values()).sort((left, right) => {
    if (left.source === 'unassigned') return 1
    if (right.source === 'unassigned') return -1
    return left.name.localeCompare(right.name)
  })
}

function bucketEmployees(departments: DepartmentSeed[], employees: EmployeeRow[]) {
  const buckets = new Map<string, EmployeeRow[]>()
  const lookup = new Map<string, string>()

  departments.forEach((department) => {
    buckets.set(department.id, [])
    ;[department.name, department.code]
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => {
        lookup.set(normalizeKey(value), department.id)
        lookup.set(normalizeCompactKey(value), department.id)
      })
  })

  employees.forEach((employee) => {
    const department = getEmployeeDepartment(employee)
    const departmentId = department
      ? lookup.get(normalizeKey(department)) || lookup.get(normalizeCompactKey(department))
      : 'department-unassigned'

    if (!departmentId) {
      return
    }

    const bucket = buckets.get(departmentId)
    if (bucket) {
      bucket.push(employee)
    }
  })

  return buckets
}

function formatStatusLabel(value: string) {
  if (!value) {
    return 'Active'
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getDepartmentBadge(department: DepartmentSeed) {
  if (department.code) {
    return department.code
  }

  return department.source === 'unassigned' ? 'Open' : 'Dept'
}

function getDepartmentDetail(department: DepartmentSeed) {
  if (department.head) {
    return department.head
  }

  return department.source === 'unassigned' ? 'Needs assignment' : formatStatusLabel(department.status)
}

export default function OrganizationStructureMap({
  accessToken,
  apiRequest,
  employees,
  currentDepartmentRecords,
  departmentRecordsVersion,
}: OrganizationStructureMapProps) {
  const [fetchedDepartmentRecords, setFetchedDepartmentRecords] = useState<EmployeeMasterRecord[]>([])
  const [departmentLoading, setDepartmentLoading] = useState(false)
  const [departmentError, setDepartmentError] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [hoveredDepartmentId, setHoveredDepartmentId] = useState<string | null>(null)
  const [transform, setTransform] = useState<MapTransform>(DEFAULT_TRANSFORM)
  const [viewportSize, setViewportSize] = useState<ViewportSize>(DEFAULT_VIEWPORT_SIZE)
  const [isPanning, setIsPanning] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const latestRequestRef = useRef({ accessToken, apiRequest })
  const panRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  latestRequestRef.current = { accessToken, apiRequest }

  useEffect(() => {
    const node = viewportRef.current
    if (!node) {
      return
    }

    const updateViewportSize = () => {
      const nextSize = {
        width: Math.round(node.clientWidth),
        height: Math.round(node.clientHeight),
      }
      setViewportSize((current) => (
        current.width === nextSize.width && current.height === nextSize.height ? current : nextSize
      ))
    }

    updateViewportSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateViewportSize)
      return () => window.removeEventListener('resize', updateViewportSize)
    }

    const observer = new ResizeObserver(updateViewportSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!accessToken) {
      setFetchedDepartmentRecords([])
      setDepartmentLoading(false)
      setDepartmentError('')
      return
    }

    const controller = new AbortController()
    let cancelled = false

    const loadDepartments = async () => {
      setDepartmentLoading(true)
      setDepartmentError('')

      try {
        const { apiRequest: request, accessToken: token } = latestRequestRef.current
        const departments: EmployeeMasterRecord[] = []
        let page = 1
        let hasMorePages = true

        while (!cancelled && hasMorePages && page <= MAX_DEPARTMENT_FETCH_PAGES) {
          const params = new URLSearchParams({
            page: String(page),
            page_size: String(DEPARTMENT_PAGE_SIZE),
          })
          const response = await request(
            `${DEPARTMENTS_ENDPOINT}?${params.toString()}`,
            { signal: controller.signal },
            token
          )
          const parsed = parseDepartmentResponse(response)
          departments.push(...parsed.records)

          const hasNextByPageCount = parsed.totalPages > 0 && page < parsed.totalPages
          hasMorePages = parsed.hasNext === true || hasNextByPageCount
          page += 1
        }

        if (!cancelled) {
          setFetchedDepartmentRecords(departments)
        }
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) {
          return
        }
        setFetchedDepartmentRecords([])
        setDepartmentError(error instanceof Error ? error.message : 'Failed to load departments.')
      } finally {
        if (!cancelled) {
          setDepartmentLoading(false)
        }
      }
    }

    void loadDepartments()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [accessToken, departmentRecordsVersion])

  const departmentRecords = fetchedDepartmentRecords.length ? fetchedDepartmentRecords : currentDepartmentRecords
  const departments = useMemo(
    () => buildDepartmentSeeds(departmentRecords, employees),
    [departmentRecords, employees]
  )
  const employeeBuckets = useMemo(() => bucketEmployees(departments, employees), [departments, employees])

  useEffect(() => {
    if (selectedDepartmentId && !departments.some((department) => department.id === selectedDepartmentId)) {
      setSelectedDepartmentId(null)
    }
  }, [departments, selectedDepartmentId])

  const selectedEmployees = useMemo(
    () => selectedDepartmentId ? employeeBuckets.get(selectedDepartmentId) || [] : [],
    [employeeBuckets, selectedDepartmentId]
  )

  const layout = useMemo(() => {
    const largestEmployeeGroup = Math.max(
      0,
      ...Array.from(employeeBuckets.values()).map((bucket) => bucket.length)
    )
    const employeeRingCount = Math.max(1, Math.ceil(largestEmployeeGroup / EMPLOYEES_PER_RING))
    const departmentRingPlans = buildDepartmentRingPlans(departments.length)
    const maxDepartmentRadius = Math.max(...departmentRingPlans.map((plan) => plan.radius), 230)
    const employeeReach = largestEmployeeGroup > 0
      ? clamp(170 + (employeeRingCount - 1) * 118, 170, 620)
      : 112
    const width = Math.ceil((maxDepartmentRadius + employeeReach) * 2 + 360)
    const height = Math.ceil((maxDepartmentRadius + employeeReach) * 2 + 270)
    const centerX = width / 2
    const centerY = height / 2
    const densityScale = departmentRingPlans.length > 2
      ? 0.62
      : departmentRingPlans.length > 1
        ? 0.7
        : departments.length > 18
          ? 0.76
          : departments.length > 10
            ? 0.84
            : 0.94
    const visibleWidth = viewportSize.width || 1100
    const visibleHeight = viewportSize.height || 620
    const departmentHalfExtent = maxDepartmentRadius + DEPARTMENT_NODE_SIZE / 2 + 44
    const fitScale = Math.min(
      (visibleWidth - 32) / (departmentHalfExtent * 2),
      (visibleHeight - 72) / (departmentHalfExtent * 2)
    )
    const defaultScale = clamp(
      Math.min(densityScale, Number.isFinite(fitScale) && fitScale > 0 ? fitScale : densityScale),
      MIN_ZOOM,
      densityScale
    )
    const positionedDepartments = departments.map<PositionedDepartment>((department, index) => {
      const ring = departmentRingPlans.find(
        (plan) => index >= plan.start && index < plan.start + plan.count
      ) || departmentRingPlans[departmentRingPlans.length - 1]
      const indexInRing = index - ring.start
      const angleOffset = -Math.PI / 2 + (ring.index % 2 === 1 ? Math.PI / Math.max(ring.count, 1) : 0)
      const angle = ring.count <= 1
        ? angleOffset
        : angleOffset + (Math.PI * 2 * indexInRing) / ring.count
      return {
        ...department,
        angle,
        employeeCount: employeeBuckets.get(department.id)?.length || 0,
        x: centerX + Math.cos(angle) * ring.radius,
        y: centerY + Math.sin(angle) * ring.radius,
      }
    })

    return {
      centerX,
      centerY,
      defaultScale,
      height,
      positionedDepartments,
      width,
    }
  }, [departments, employeeBuckets, viewportSize.height, viewportSize.width])

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: layout.defaultScale })
  }, [layout.defaultScale, departments.length])

  const selectedDepartment = selectedDepartmentId
    ? layout.positionedDepartments.find((department) => department.id === selectedDepartmentId) || null
    : null
  const selectedDepartmentAngle = selectedDepartment?.angle ?? null

  useEffect(() => {
    if (selectedDepartmentAngle == null || viewportSize.width <= 720) {
      return
    }

    const focusOffset = selectedEmployees.length ? 136 : 96
    setTransform((current) => ({
      ...current,
      x: clamp(-Math.cos(selectedDepartmentAngle) * focusOffset, -260, 260),
      y: clamp(-Math.sin(selectedDepartmentAngle) * focusOffset, -220, 220),
    }))
  }, [selectedDepartmentAngle, selectedEmployees.length, viewportSize.width])

  const positionedEmployees = useMemo<PositionedEmployee[]>(() => {
    if (!selectedDepartment || selectedEmployees.length === 0) {
      return []
    }

    return selectedEmployees.map((employee, index) => {
      const ring = Math.floor(index / EMPLOYEES_PER_RING)
      const ringIndex = index % EMPLOYEES_PER_RING
      const itemsInRing = Math.min(
        EMPLOYEES_PER_RING,
        selectedEmployees.length - ring * EMPLOYEES_PER_RING
      )
      const spread = itemsInRing <= 1
        ? 0
        : clamp(itemsInRing * 0.24, Math.PI / 2.5, Math.PI * 1.18)
      const startAngle = selectedDepartment.angle - spread / 2
      const angle = itemsInRing <= 1
        ? selectedDepartment.angle
        : startAngle + (spread * ringIndex) / (itemsInRing - 1)
      const radius = 172 + ring * 118
      const name = getEmployeeName(employee)

      return {
        key: getEmployeeKey(employee, index),
        name,
        designation: getEmployeeDesignation(employee),
        initials: getInitials(name),
        photoUrl: getEmployeePhotoUrl(employee),
        tone: getTone(name),
        x: selectedDepartment.x + Math.cos(angle) * radius,
        y: selectedDepartment.y + Math.sin(angle) * radius,
      }
    })
  }, [selectedDepartment, selectedEmployees])

  const departmentCount = departments.length
  const employeeCount = employees.length
  const selectedEmployeeCount = selectedEmployees.length

  const setZoom = (nextScale: ZoomInput) => {
    setTransform((current) => ({
      ...current,
      scale: clamp(
        typeof nextScale === 'function' ? nextScale(current.scale) : nextScale,
        MIN_ZOOM,
        MAX_ZOOM
      ),
    }))
  }

  const resetView = () => {
    setTransform({ x: 0, y: 0, scale: layout.defaultScale })
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (event.button !== 0 || target.closest('button, a, input, select, textarea')) {
      return
    }

    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    }
    setIsPanning(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) {
      return
    }

    setTransform((current) => ({
      ...current,
      x: pan.originX + event.clientX - pan.startX,
      y: pan.originY + event.clientY - pan.startY,
    }))
  }

  const stopPanning = (event: PointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null
      setIsPanning(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    }
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.08 : 0.08
    setZoom((currentScale) => currentScale + delta)
  }

  return (
    <section className="org-map" aria-labelledby="org-map-title">
      <div className="org-map__header">
        <div>
          <p className="adm-eyebrow">Organization Structure</p>
          <h2 id="org-map-title">CMD Command Map</h2>
        </div>
        <div className="org-map__summary" aria-label="Organization structure summary">
          <span>
            <strong>{departmentCount.toLocaleString()}</strong>
            Departments
          </span>
          <span>
            <strong>{employeeCount.toLocaleString()}</strong>
            Employees
          </span>
          <span>
            <strong>{selectedEmployeeCount.toLocaleString()}</strong>
            In view
          </span>
        </div>
      </div>

      {departmentError ? (
        <div className="org-map__notice" role="status">
          <span>{departmentError}</span>
          {currentDepartmentRecords.length ? <em>Showing loaded department rows.</em> : null}
        </div>
      ) : null}

      <div className="org-map__toolbar" aria-label="Map controls">
        <button
          className="org-map__control"
          type="button"
          onClick={() => setZoom((currentScale) => currentScale + 0.12)}
          aria-label="Zoom in"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className="org-map__control"
          type="button"
          onClick={() => setZoom((currentScale) => currentScale - 0.12)}
          aria-label="Zoom out"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <button className="org-map__control org-map__control--wide" type="button" onClick={resetView}>
          Reset
        </button>
      </div>

      <div
        ref={viewportRef}
        className={`org-map__viewport${isPanning ? ' is-panning' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPanning}
        onPointerCancel={stopPanning}
        onWheel={handleWheel}
      >
        <div
          className={`org-map__stage${isPanning ? ' is-panning' : ''}`}
          style={{
            height: layout.height,
            transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) scale(${transform.scale})`,
            width: layout.width,
          }}
        >
          <svg
            className="org-map__lines"
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            aria-hidden="true"
          >
            {layout.positionedDepartments.map((department) => {
              const isSelected = department.id === selectedDepartmentId
              const isHovered = department.id === hoveredDepartmentId
              return (
                <line
                  key={department.id}
                  className={`org-map__line${isSelected ? ' is-selected' : ''}${isHovered ? ' is-hovered' : ''}`}
                  x1={layout.centerX}
                  y1={layout.centerY}
                  x2={department.x}
                  y2={department.y}
                />
              )
            })}
            {selectedDepartment
              ? positionedEmployees.map((employee) => (
                  <line
                    key={employee.key}
                    className="org-map__line org-map__line--employee"
                    x1={selectedDepartment.x}
                    y1={selectedDepartment.y}
                    x2={employee.x}
                    y2={employee.y}
                  />
                ))
              : null}
          </svg>

          <div
            className="org-map__root"
            style={{
              height: ROOT_NODE_SIZE,
              left: layout.centerX,
              top: layout.centerY,
              width: ROOT_NODE_SIZE,
            }}
          >
            <span>CMD</span>
            <strong>Command</strong>
          </div>

          {layout.positionedDepartments.map((department) => {
            const isSelected = department.id === selectedDepartmentId
            return (
              <button
                key={department.id}
                className={`org-map__department${isSelected ? ' is-selected' : ''}`}
                type="button"
                style={{
                  height: DEPARTMENT_NODE_SIZE,
                  left: department.x,
                  top: department.y,
                  width: DEPARTMENT_NODE_SIZE,
                }}
                onClick={() =>
                  setSelectedDepartmentId((current) => current === department.id ? null : department.id)
                }
                onMouseEnter={() => setHoveredDepartmentId(department.id)}
                onMouseLeave={() => setHoveredDepartmentId(null)}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? 'Hide' : 'Show'} ${department.name} employees`}
              >
                <span className="org-map__department-code">
                  {getDepartmentBadge(department)}
                </span>
                <strong>{department.name}</strong>
                <span className="org-map__department-meta">
                  {department.employeeCount.toLocaleString()} employee{department.employeeCount === 1 ? '' : 's'}
                </span>
                <em>{getDepartmentDetail(department)}</em>
              </button>
            )
          })}

          <div
            key={selectedDepartment?.id || 'collapsed'}
            className={`org-map__employee-layer${selectedDepartment ? ' is-expanded' : ''}`}
            aria-live="polite"
          >
            {selectedDepartment && selectedEmployeeCount === 0 ? (
              <div
                className="org-map__empty"
                style={{
                  left: selectedDepartment.x + Math.cos(selectedDepartment.angle) * 168,
                  top: selectedDepartment.y + Math.sin(selectedDepartment.angle) * 168,
                }}
              >
                <strong>No employees</strong>
                <span>{selectedDepartment.name}</span>
              </div>
            ) : null}
            {positionedEmployees.map((employee) => (
              <article
                className="org-map__employee"
                key={employee.key}
                style={{
                  height: EMPLOYEE_CARD_HEIGHT,
                  left: employee.x,
                  top: employee.y,
                  width: EMPLOYEE_CARD_WIDTH,
                }}
              >
                {employee.photoUrl ? (
                  <img src={employee.photoUrl} alt="" loading="lazy" />
                ) : (
                  <span className={`org-map__avatar org-map__avatar--${employee.tone}`}>
                    {employee.initials}
                  </span>
                )}
                <span className="org-map__employee-copy">
                  <strong>{employee.name}</strong>
                  <em>{employee.designation}</em>
                </span>
              </article>
            ))}
          </div>

          {departmentLoading ? (
            <div className="org-map__loading" role="status">
              <span className="em-spinner" aria-hidden="true" />
              <strong>Syncing structure</strong>
            </div>
          ) : null}
          {!departmentLoading && departmentCount === 0 ? (
            <div className="org-map__loading org-map__loading--empty" role="status">
              <strong>No departments found</strong>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
