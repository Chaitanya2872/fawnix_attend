import type { ReactNode } from 'react'
import { DeltaBadge } from './Deltabadge'

type KpiCardProps = {
  label: string
  period: string
  color: 'green' | 'blue' | 'amber' | 'red'
  icon: ReactNode
  value: string | number
  sub: string
  delta: number | null
  deltaLabel: string
  deltaGood: 'up' | 'down'
  liveChip?: boolean
  sparkData?: number[]
  progressPct?: number
  miniList?: string[]
  celebration?: boolean
}

export function KpiCard({
  label,
  period,
  color,
  icon,
  value,
  sub,
  delta,
  deltaLabel,
  deltaGood,
  liveChip,
  sparkData,
  progressPct,
  miniList,
  celebration = false,
}: KpiCardProps) {
  return (
    <div
      className={`ov2-kpi-card${celebration ? ' birthday-celebration' : color === 'red' ? ' exceptions' : ''}`}
    >
      <div className="ov2-kpi-top">
        <div className={`ov2-kpi-icon-wrap ${color}`}>{icon}</div>
        <div>
          <div className="ov2-kpi-label">{label}</div>
          <div className="ov2-kpi-period">{period}</div>
        </div>
        {liveChip && <span className="ov2-live-chip">LIVE</span>}
      </div>

      <div className={`ov2-kpi-num ${color}`}>{value}</div>
      <div className="ov2-kpi-sub">{sub}</div>

      <DeltaBadge delta={delta} label={deltaLabel} good={deltaGood} />

      {sparkData && (
        <div className="ov2-sparkline">
          {sparkData.map((h, i) => (
            <div key={i} className={`ov2-spark-bar ${color}`} style={{ height: `${h}%` }} />
          ))}
        </div>
      )}

      {progressPct !== undefined && (
        <div className="ov2-kpi-progress-wrap">
          <div
            className={`ov2-kpi-progress ${color}`}
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
      )}

      {miniList && miniList.length > 0 && (
        <div className="ov2-exc-mini-list">
          {miniList.map((name, i) => (
            <div key={i} className="ov2-exc-mini-item">
              <span className="ov2-exc-mini-dot red" />
              <span>{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type KpiStripProps = {
  averageWeeklyAttendance: number
  presentToday: number
  totalEmployees: number
  weekLabel: string
  attendanceDelta: number | null
  sparkData: number[]

  missedLoginEmployeeName: string
  missedLoginCount: number

  monthlyLeaveRequests: number
  previousMonthLeaveRequests: number
  monthlyLabel: string
  leavesDelta: number | null
  leaveSparkData: number[]
  leavePrevMonthLabel: string

  upcomingBirthdayCount: number
  nextBirthdayName: string

  prevMonthLabel: string
}

export function KpiStrip({
  averageWeeklyAttendance,
  presentToday,
  totalEmployees,
  weekLabel,
  attendanceDelta,
  sparkData,
  missedLoginEmployeeName,
  missedLoginCount,
  monthlyLeaveRequests,
  previousMonthLeaveRequests,
  monthlyLabel,
  leavesDelta,
  leaveSparkData,
  leavePrevMonthLabel,
  upcomingBirthdayCount,
  nextBirthdayName,
  prevMonthLabel,
}: KpiStripProps) {
  return (
    <div className="ov2-kpi-row">
      <KpiCard
        label="Attendance Rate"
        period={`Weekly \u00b7 ${weekLabel}`}
        color="green"
        icon={
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M2.5 14c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        }
        value={`${averageWeeklyAttendance}%`}
        sub={`${presentToday} / ${totalEmployees} present today`}
        delta={attendanceDelta}
        deltaLabel={`vs ${prevMonthLabel}`}
        deltaGood="up"
        sparkData={sparkData}
      />

      <KpiCard
        label="Most Missed Logins"
        period="Last 30 days · Non-flexible"
        color="blue"
        icon={
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        }
        value={missedLoginCount}
        sub={missedLoginEmployeeName || 'No missed logins'}
        delta={null}
        deltaLabel="Approved leaves excluded"
        deltaGood="down"
      />

      <KpiCard
        label="Leave Requests"
        period={`Monthly \u00b7 ${monthlyLabel}`}
        color="amber"
        icon={
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        }
        value={monthlyLeaveRequests}
        sub={`This month ${monthlyLeaveRequests} \u00b7 last month ${previousMonthLeaveRequests}`}
        delta={leavesDelta}
        deltaLabel={`vs ${leavePrevMonthLabel}`}
        deltaGood="down"
        sparkData={leaveSparkData}
      />

      <KpiCard
        label="Upcoming Birthdays"
        period="Next 30 days"
        color="red"
        celebration
        icon={
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <path
              d="M2 6.5h12v7.75H2V6.5zM1.5 4h13v2.5h-13V4zM8 4v10.25"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 4H5.65a1.55 1.55 0 1 1 0-3.1C7.35.9 8 4 8 4zm0 0h2.35a1.55 1.55 0 1 0 0-3.1C8.65.9 8 4 8 4z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        value={upcomingBirthdayCount}
        sub={nextBirthdayName ? `Next: ${nextBirthdayName}` : 'No birthdays scheduled'}
        delta={null}
        deltaLabel=""
        deltaGood="up"
      />
    </div>
  )
}
