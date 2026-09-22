import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type WheelEvent } from 'react'
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
  x: number
  y: number
}

type HierarchyNode = {
  key: string
  parentKey: string
  name: string
  designation: string
  initials: string
  photoUrl: string
  tone: string
  level: 'manager' | 'lead' | 'member'
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
const ROOT_NODE_SIZE = 92
const DEPARTMENT_NODE_SIZE = 112
const DEPARTMENT_NODE_CLEARANCE = DEPARTMENT_NODE_SIZE + 26
const HIERARCHY_MANAGER_DISTANCE = 156
const HIERARCHY_LEAD_DISTANCE = 302
const HIERARCHY_MEMBER_DISTANCE = 468
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
  return [{
    start: 0,
    count: departmentCount,
    radius: departmentCount > 0
      ? Math.max(300, (departmentCount * DEPARTMENT_NODE_CLEARANCE) / (Math.PI * 2))
      : 300,
    index: 0,
  }]
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

function isAllDepartment(value: string) {
  return normalizeKey(value) === 'all'
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

function getEmployeeManagerValue(employee: EmployeeRow) {
  return getEmployeeField(employee, ['emp_manager', 'manager_code', 'manager_name'])
}

function isLeadEmployee(employee: EmployeeRow) {
  return /\b(team\s*)?lead\b|supervisor|coordinator/i.test(getEmployeeDesignation(employee))
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
    if (!name || isAllDepartment(name)) {
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
    if (!department || isAllDepartment(department)) {
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
  useEffect(() => {
    if (selectedDepartmentId && !departments.some((department) => department.id === selectedDepartmentId)) {
      setSelectedDepartmentId(null)
    }
  }, [departments, selectedDepartmentId])

  const layout = useMemo(() => {
    const departmentRingPlans = buildDepartmentRingPlans(departments.length)
    const maxDepartmentRadius = Math.max(...departmentRingPlans.map((plan) => plan.radius), 230)
    const stagePadding = DEPARTMENT_NODE_SIZE / 2 + 24
    const hierarchyPadding = 540
    const width = Math.ceil((maxDepartmentRadius + stagePadding + hierarchyPadding) * 2)
    const height = Math.ceil((maxDepartmentRadius + stagePadding + hierarchyPadding) * 2)
    const centerX = width / 2
    const centerY = height / 2
    const densityScale = departments.length > 24 ? 0.82 : 0.94
    const visibleWidth = viewportSize.width || 1100
    const visibleHeight = viewportSize.height || 620
    const departmentHalfExtent = maxDepartmentRadius + DEPARTMENT_NODE_SIZE / 2 + hierarchyPadding
    const fitScale = Math.min(
      Math.max(0.1, (visibleWidth - 28) / (departmentHalfExtent * 2)),
      Math.max(0.1, (visibleHeight - 28) / (departmentHalfExtent * 2))
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
  }, [departments, viewportSize.height, viewportSize.width])

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: layout.defaultScale })
  }, [layout.defaultScale, departments.length])

  const selectedDepartment = selectedDepartmentId
    ? layout.positionedDepartments.find((department) => department.id === selectedDepartmentId) || null
    : null
  const selectedEmployees = useMemo(() => {
    if (!selectedDepartment) {
      return []
    }

    if (selectedDepartment.source === 'unassigned') {
      return employees.filter((employee) => !getEmployeeDepartment(employee))
    }

    const departmentKeys = [selectedDepartment.name, selectedDepartment.code]
      .filter(Boolean)
      .flatMap((value) => [normalizeKey(value), normalizeCompactKey(value)])

    return employees.filter((employee) => {
      const employeeDepartment = getEmployeeDepartment(employee)
      return departmentKeys.includes(normalizeKey(employeeDepartment)) ||
        departmentKeys.includes(normalizeCompactKey(employeeDepartment))
    })
  }, [employees, selectedDepartment])
  const selectedDepartmentAngle = selectedDepartment?.angle ?? null

  const hierarchyNodes = useMemo<HierarchyNode[]>(() => {
    if (!selectedDepartment || selectedEmployees.length === 0) {
      return []
    }

    const employeeByKey = new Map<string, EmployeeRow>()
    selectedEmployees.forEach((employee) => {
      employeeByKey.set(normalizeKey(getEmployeeName(employee)), employee)
      employeeByKey.set(normalizeCompactKey(getEmployeeName(employee)), employee)
      if (employee.emp_code) {
        employeeByKey.set(normalizeKey(employee.emp_code), employee)
      }
    })
    const managerOf = (employee: EmployeeRow) => {
      const value = getEmployeeManagerValue(employee)
      return value
        ? employeeByKey.get(normalizeKey(value)) || employeeByKey.get(normalizeCompactKey(value))
        : undefined
    }
    const topLevelEmployees = selectedEmployees.filter((employee) => !managerOf(employee))
    const manager = topLevelEmployees.find((employee) =>
      /manager|head|director/i.test(getEmployeeDesignation(employee))
    ) || topLevelEmployees[0]
    const leads = selectedEmployees.filter((employee) =>
      employee !== manager && isLeadEmployee(employee) && managerOf(employee) === manager
    )
    const members = selectedEmployees.filter((employee) => employee !== manager && !leads.includes(employee))
    const branchAngle = selectedDepartment.angle
    const makeNode = (employee: EmployeeRow, level: HierarchyNode['level'], parentKey: string, x: number, y: number, index: number): HierarchyNode => {
      const name = getEmployeeName(employee)
      return {
        key: getEmployeeKey(employee, index),
        parentKey,
        name,
        designation: getEmployeeDesignation(employee),
        initials: getInitials(name),
        photoUrl: getEmployeePhotoUrl(employee),
        tone: getTone(name),
        level,
        x,
        y,
      }
    }
    const placeRing = (items: EmployeeRow[], level: HierarchyNode['level'], distance: number, spread: number, parentKey: string) =>
      items.map((employee, index) => {
        const angle = branchAngle + (items.length === 1 ? 0 : -spread / 2 + (spread * index) / (items.length - 1))
        return makeNode(
          employee,
          level,
          parentKey,
          selectedDepartment.x + Math.cos(angle) * distance,
          selectedDepartment.y + Math.sin(angle) * distance,
          index
        )
      })

    const leadNames = new Set(leads.map((employee) => normalizeCompactKey(getEmployeeName(employee))))
    const managerKey = manager ? getEmployeeKey(manager, 0) : selectedDepartment.id
    const nodes = [
      ...(manager ? placeRing([manager], 'manager', HIERARCHY_MANAGER_DISTANCE, 0, selectedDepartment.id) : []),
      ...placeRing(
        leads,
        'lead',
        HIERARCHY_LEAD_DISTANCE,
        Math.min(Math.PI * 0.72, Math.max(0.3, leads.length * 0.22)),
        manager ? getEmployeeKey(manager, 0) : selectedDepartment.id
      ),
      ...placeRing(
        members,
        'member',
        HIERARCHY_MEMBER_DISTANCE,
        Math.min(Math.PI * 0.94, Math.max(0.4, members.length * 0.18)),
        selectedDepartment.id
      ),
    ]
    return nodes.map((node) => {
      if (node.level !== 'member') {
        return node
      }

      const employee = selectedEmployees.find((candidate) => getEmployeeName(candidate) === node.name)
      const reportingManager = employee ? managerOf(employee) : undefined
      const reportingManagerKey = reportingManager
        ? getEmployeeKey(reportingManager, 0)
        : managerKey
      const parentKey = reportingManager && leadNames.has(normalizeCompactKey(getEmployeeName(reportingManager)))
        ? reportingManagerKey
        : managerKey
      return { ...node, parentKey }
    })
  }, [selectedDepartment, selectedEmployees])

  useEffect(() => {
    if (selectedDepartmentAngle == null || viewportSize.width <= 720) {
      return
    }

    setTransform((current) => ({
      ...current,
      x: -(selectedDepartment!.x - layout.centerX) * current.scale,
      y: -(selectedDepartment!.y - layout.centerY) * current.scale,
    }))
  }, [layout.centerX, layout.centerY, selectedDepartment, selectedDepartmentAngle, viewportSize.width])

  const departmentCount = departments.length
  const employeeCount = employees.length

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
            <strong>{selectedDepartment ? '1' : '0'}</strong>
            Selected
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
            {hierarchyNodes.map((node, index) => {
              const parent = node.parentKey === selectedDepartment?.id
                ? selectedDepartment
                : hierarchyNodes.find((item) => item.key === node.parentKey)
              return parent ? (
                <line
                  key={`hierarchy-line-${node.key}-${index}`}
                  className="org-map__line org-map__line--hierarchy"
                  x1={parent.x}
                  y1={parent.y}
                  x2={node.x}
                  y2={node.y}
                />
              ) : null
            })}
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
            <strong>Department Head</strong>
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
                  '--node-delay': `${(layout.positionedDepartments.indexOf(department) % 33) * 18}ms`,
                } as CSSProperties}
                onClick={() =>
                  setSelectedDepartmentId((current) => current === department.id ? null : department.id)
                }
                onMouseEnter={() => setHoveredDepartmentId(department.id)}
                onMouseLeave={() => setHoveredDepartmentId(null)}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? 'Deselect' : 'Select'} ${department.name}`}
              >
                <span className="org-map__department-code">
                  {getDepartmentBadge(department)}
                </span>
                <strong>{department.name}</strong>
                <em>{getDepartmentDetail(department)}</em>
              </button>
            )
          })}

          {hierarchyNodes.map((node, index) => (
            <article
              className={`org-map__hierarchy-node org-map__hierarchy-node--${node.level}`}
              key={node.key}
              style={{
                left: node.x,
                top: node.y,
                '--node-delay': `${index * 70}ms`,
              } as CSSProperties}
            >
              <span className={`org-map__hierarchy-avatar org-map__avatar--${node.tone}`}>
                {node.initials}
              </span>
              <span className="org-map__hierarchy-copy">
                <strong>{node.name}</strong>
                <em>{node.designation}</em>
              </span>
              <small>{node.level === 'manager' ? 'Manager' : node.level === 'lead' ? 'Team Lead' : 'Team Member'}</small>
            </article>
          ))}

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
