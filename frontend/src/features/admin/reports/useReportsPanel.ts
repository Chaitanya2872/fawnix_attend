import { useCallback, useEffect, useRef, useState } from 'react'
import { toDateInputValue } from '../../../utils/date/dateUtils'
import type {
  AttendanceCellEditPayload,
  AttendanceDayUpdateApiResponse,
  AttendanceCellSource,
  AttendanceHeatmapApiResponse,
  AttendanceHeatmapCell,
  AttendanceHeatmapEmployee,
  AttendanceHeatmapMatrix,
  AttendanceStatusCode
} from '../../../types/admin'

type WeeklyTrendPoint = { dateKey: string; count: number; label: string }

const ATTENDANCE_STATUS_CODES: AttendanceStatusCode[] = ['P', 'S', 'WFH', 'A', 'L', 'H', 'O']

/** Every ISO date in the given month — the heatmap always renders a full month of columns. */
function buildMonthDates(month: number, year: number) {
  const dayCount = new Date(year, month, 0).getDate()
  return Array.from({ length: dayCount }, (_, index) =>
    `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
  )
}

function toStatusCode(value: string | null | undefined): AttendanceStatusCode | null {
  const normalised = (value || '').trim().toUpperCase()
  return ATTENDANCE_STATUS_CODES.find((code) => code === normalised) ?? null
}

function toCellSource(value: string | null | undefined): AttendanceCellSource {
  return (value || '').trim().toLowerCase() === 'manual' ? 'manual' : 'auto'
}

function toWorkingHours(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

/** Folds the wire payload into the normalised matrix the heatmap renders from. */
function normaliseHeatmapResponse(
  payload: AttendanceHeatmapApiResponse,
  month: number,
  year: number
): AttendanceHeatmapMatrix {
  const dates = buildMonthDates(month, year)
  const validDates = new Set(dates)
  const employees: AttendanceHeatmapEmployee[] = (payload.employees || [])
    .filter((row) => Boolean(row?.emp_code))
    .map((row) => {
      const days: Record<string, AttendanceHeatmapCell> = {}
      for (const day of row.days || []) {
        const date = (day?.date || '').slice(0, 10)
        const status = toStatusCode(day?.status)
        if (!date || !status || !validDates.has(date)) {
          continue
        }
        days[date] = {
          date,
          status,
          workingHours: toWorkingHours(day?.working_hours),
          source: toCellSource(day?.source),
          remarks: day?.remarks ?? null
        }
      }
      return {
        empCode: String(row.emp_code),
        name: row.emp_full_name || String(row.emp_code),
        designation: row.emp_designation || '',
        department: row.emp_department || '',
        days
      }
    })

  return { month, year, dates, employees }
}

/**
 * Reads a JSON body, but fails loudly when the response is not JSON at all —
 * an unregistered API route falls through to the SPA shell, which would
 * otherwise surface as "Unexpected token '<'".
 */
async function readJsonBody<T>(response: Response, endpointLabel: string): Promise<T> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('json')) {
    throw new Error(`${endpointLabel} did not return JSON. Check that the backend route is available.`)
  }
  return (await response.json()) as T
}

/** Pulls a readable message out of an error response, ignoring HTML error pages. */
async function readErrorMessage(response: Response, fallback: string) {
  const raw = (await response.text()).trim()
  if (!raw || raw.startsWith('<')) {
    return fallback
  }
  try {
    const parsed = JSON.parse(raw) as { message?: string }
    return parsed.message || fallback
  } catch {
    return raw.slice(0, 200)
  }
}

/** Returns a copy of the matrix with one cell replaced (or removed when cell is null). */
function replaceHeatmapCell(
  matrix: AttendanceHeatmapMatrix | null,
  empCode: string,
  date: string,
  cell: AttendanceHeatmapCell | null
): AttendanceHeatmapMatrix | null {
  if (!matrix) {
    return matrix
  }
  return {
    ...matrix,
    employees: matrix.employees.map((employee) => {
      if (employee.empCode !== empCode) {
        return employee
      }
      const days = { ...employee.days }
      if (cell) {
        days[date] = cell
      } else {
        delete days[date]
      }
      return { ...employee, days }
    })
  }
}

type UseReportsPanelOptions = {
  accessToken: string
  refreshAccessToken: () => Promise<string>
  attendanceDateFilter: string
  weeklyAttendanceTrend: WeeklyTrendPoint[]
  resolveDownloadFilename: (response: Response, fallbackFilename: string) => string
}

export function useReportsPanel({
  accessToken,
  refreshAccessToken,
  attendanceDateFilter,
  weeklyAttendanceTrend,
  resolveDownloadFilename
}: UseReportsPanelOptions) {
  const [attendanceReportMonth, setAttendanceReportMonth] = useState(() => String(new Date().getMonth() + 1))
  const [attendanceReportYear, setAttendanceReportYear] = useState(() => String(new Date().getFullYear()))
  const [attendanceReportFormat, setAttendanceReportFormat] = useState<'csv' | 'pdf' | 'xlsx'>('csv')
  const [attendanceReportStatus, setAttendanceReportStatus] = useState('')
  const [reportDateMode, setReportDateMode] = useState<'month' | 'custom'>('month')
  const [reportStartDate, setReportStartDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [reportEndDate, setReportEndDate] = useState(() => toDateInputValue(new Date()))
  const [attendanceHeatmapData, setAttendanceHeatmapData] = useState<AttendanceHeatmapMatrix | null>(null)
  const [attendanceHeatmapLoading, setAttendanceHeatmapLoading] = useState(false)
  const [attendanceHeatmapStatus, setAttendanceHeatmapStatus] = useState('')
  const [attendanceHeatmapSavingCell, setAttendanceHeatmapSavingCell] = useState<string | null>(null)

  // fetchAttendanceHeatmapData is consumed from an effect, so it has to stay
  // referentially stable — the auth handles live in refs instead of deps.
  const authRef = useRef({ accessToken, refreshAccessToken })
  useEffect(() => {
    authRef.current = { accessToken, refreshAccessToken }
  })
  /** Guards against an older month's response landing after a newer one. */
  const heatmapRequestRef = useRef(0)

  const downloadRangeReport = async (reportType: 'attendance' | 'exceptions' | 'leaves') => {
    try {
      let startDate = reportStartDate
      let endDate = reportEndDate
      if (reportDateMode === 'month') {
        const year = Number(attendanceReportYear)
        const month = Number(attendanceReportMonth)
        startDate = `${year}-${String(month).padStart(2, '0')}-01`
        endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
      }
      if (!startDate || !endDate || startDate > endDate) {
        throw new Error('Choose a valid start and end date.')
      }
      setAttendanceReportStatus(`Preparing ${reportType} report...`)
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        format: attendanceReportFormat,
      })
      const makeRequest = (token: string) => fetch(`/api/admin/reports/${reportType}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      let response = await makeRequest(accessToken)
      if (response.status === 401) response = await makeRequest(await refreshAccessToken())
      if (!response.ok) throw new Error((await response.text()) || 'Failed to generate report')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resolveDownloadFilename(response, `${reportType}_report_${startDate}_${endDate}.${attendanceReportFormat}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setAttendanceReportStatus(`${reportType[0].toUpperCase()}${reportType.slice(1)} report downloaded.`)
      window.setTimeout(() => setAttendanceReportStatus(''), 2500)
    } catch (error) {
      setAttendanceReportStatus(error instanceof Error ? error.message : 'Failed to generate report')
    }
  }

  const downloadDailyAttendanceReport = async () => {
    try {
      setAttendanceReportStatus('Preparing daily report...')
      const targetDate = attendanceDateFilter || toDateInputValue(new Date())
      const params = new URLSearchParams({
        date: targetDate,
        format: attendanceReportFormat
      })

      const makeRequest = async (token: string) =>
        fetch(`/api/admin/attendance/report/daily?${params.toString()}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

      let response = await makeRequest(accessToken)
      if (response.status === 401) {
        const nextAccessToken = await refreshAccessToken()
        response = await makeRequest(nextAccessToken)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to download report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resolveDownloadFilename(
        response,
        `daily_attendance_report_${targetDate}.${attendanceReportFormat}`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setAttendanceReportStatus('Daily report downloaded.')
      window.setTimeout(() => setAttendanceReportStatus(''), 2500)
    } catch (error) {
      setAttendanceReportStatus(error instanceof Error ? error.message : 'Failed to download daily report')
    }
  }

  const downloadMonthlyAttendanceReport = async () => {
    try {
      setAttendanceReportStatus('Preparing monthly report...')
      const params = new URLSearchParams({
        month: attendanceReportMonth,
        year: attendanceReportYear,
        format: attendanceReportFormat
      })

      const makeRequest = async (token: string) =>
        fetch(`/api/admin/attendance/report/monthly?${params.toString()}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

      let response = await makeRequest(accessToken)
      if (response.status === 401) {
        const nextAccessToken = await refreshAccessToken()
        response = await makeRequest(nextAccessToken)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to download report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resolveDownloadFilename(
        response,
        `monthly_attendance_report_${attendanceReportYear}_${attendanceReportMonth.padStart(2, '0')}.${attendanceReportFormat}`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setAttendanceReportStatus('Monthly report downloaded.')
      window.setTimeout(() => setAttendanceReportStatus(''), 2500)
    } catch (error) {
      setAttendanceReportStatus(error instanceof Error ? error.message : 'Failed to download monthly report')
    }
  }

  /**
   * Loads the monthly per-employee/per-day status matrix behind the heatmap.
   * Follows the same accessToken/refreshAccessToken/401-retry shape as the
   * report downloads above.
   */
  const fetchAttendanceHeatmapData = useCallback(async (month: number, year: number) => {
    if (!Number.isFinite(month) || !Number.isFinite(year)) {
      setAttendanceHeatmapStatus('Choose a valid month and year.')
      return
    }

    const requestId = heatmapRequestRef.current + 1
    heatmapRequestRef.current = requestId
    setAttendanceHeatmapLoading(true)
    setAttendanceHeatmapStatus('Loading attendance heatmap...')

    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) })
      const makeRequest = async (token: string) =>
        fetch(`/api/admin/attendance/heatmap?${params.toString()}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

      let response = await makeRequest(authRef.current.accessToken)
      if (response.status === 401) {
        const nextAccessToken = await authRef.current.refreshAccessToken()
        response = await makeRequest(nextAccessToken)
      }

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load attendance heatmap'))
      }

      const payload = await readJsonBody<AttendanceHeatmapApiResponse>(response, 'The attendance heatmap endpoint')
      if (heatmapRequestRef.current !== requestId) {
        return
      }
      setAttendanceHeatmapData(normaliseHeatmapResponse(payload, month, year))
      setAttendanceHeatmapStatus('')
    } catch (error) {
      if (heatmapRequestRef.current !== requestId) {
        return
      }
      setAttendanceHeatmapData(null)
      setAttendanceHeatmapStatus(error instanceof Error ? error.message : 'Failed to load attendance heatmap')
    } finally {
      if (heatmapRequestRef.current === requestId) {
        setAttendanceHeatmapLoading(false)
      }
    }
  }, [])

  /**
   * Applies a manual status correction to a single day. The cell is repainted
   * immediately and rolled back to its previous value if the PATCH fails.
   */
  const updateAttendanceCell = async (employeeId: string, date: string, status: AttendanceStatusCode) => {
    const previousCell = attendanceHeatmapData?.employees
      .find((employee) => employee.empCode === employeeId)?.days[date] ?? null
    const cellKey = `${employeeId}|${date}`

    setAttendanceHeatmapSavingCell(cellKey)
    setAttendanceHeatmapStatus('Updating attendance...')
    setAttendanceHeatmapData((current) => replaceHeatmapCell(current, employeeId, date, {
      date,
      status,
      workingHours: previousCell?.workingHours ?? null,
      source: 'manual',
      remarks: previousCell?.remarks ?? null
    }))

    try {
      const payload: AttendanceCellEditPayload = { emp_code: employeeId, date, status }
      const makeRequest = async (token: string) =>
        fetch('/api/admin/attendance/day', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

      let response = await makeRequest(authRef.current.accessToken)
      if (response.status === 401) {
        const nextAccessToken = await authRef.current.refreshAccessToken()
        response = await makeRequest(nextAccessToken)
      }

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to update attendance'))
      }

      // Repaint from the server's version of the cell so hours/remarks stay in sync.
      const result = await readJsonBody<AttendanceDayUpdateApiResponse>(response, 'The attendance update endpoint')
      const savedStatus = toStatusCode(result.cell?.status)
      if (savedStatus) {
        setAttendanceHeatmapData((current) => replaceHeatmapCell(current, employeeId, date, {
          date,
          status: savedStatus,
          workingHours: toWorkingHours(result.cell?.working_hours),
          source: toCellSource(result.cell?.source),
          remarks: result.cell?.remarks ?? null
        }))
      }

      setAttendanceHeatmapStatus(result.message || 'Attendance updated.')
      window.setTimeout(() => setAttendanceHeatmapStatus(''), 2500)
      return true
    } catch (error) {
      setAttendanceHeatmapData((current) => replaceHeatmapCell(current, employeeId, date, previousCell))
      setAttendanceHeatmapStatus(error instanceof Error ? error.message : 'Failed to update attendance')
      return false
    } finally {
      setAttendanceHeatmapSavingCell((current) => (current === cellKey ? null : current))
    }
  }

  const maxWeeklyAttendance = Math.max(...weeklyAttendanceTrend.map((item) => item.count), 1)
  const weeklyTrendPoints = weeklyAttendanceTrend.map((item, index) => {
    const x = weeklyAttendanceTrend.length > 1 ? (index / (weeklyAttendanceTrend.length - 1)) * 100 : 50
    const y = 100 - (item.count / maxWeeklyAttendance) * 100
    return `${x},${y}`
  }).join(' ')

  return {
    attendanceReportMonth,
    setAttendanceReportMonth,
    attendanceReportYear,
    setAttendanceReportYear,
    attendanceReportFormat,
    setAttendanceReportFormat,
    attendanceReportStatus,
    reportDateMode,
    setReportDateMode,
    reportStartDate,
    setReportStartDate,
    reportEndDate,
    setReportEndDate,
    downloadRangeReport,
    downloadDailyAttendanceReport,
    downloadMonthlyAttendanceReport,
    attendanceHeatmapData,
    attendanceHeatmapLoading,
    attendanceHeatmapStatus,
    attendanceHeatmapSavingCell,
    fetchAttendanceHeatmapData,
    updateAttendanceCell,
    maxWeeklyAttendance,
    weeklyTrendPoints
  }
}
