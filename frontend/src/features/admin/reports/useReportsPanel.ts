import { useState } from 'react'
import { toDateInputValue } from '../../../utils/date/dateUtils'

type WeeklyTrendPoint = { dateKey: string; count: number; label: string }

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
    downloadDailyAttendanceReport,
    downloadMonthlyAttendanceReport,
    maxWeeklyAttendance,
    weeklyTrendPoints
  }
}
