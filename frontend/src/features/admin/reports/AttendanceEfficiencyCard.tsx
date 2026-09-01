import type { AttendanceInsights } from '../../../types/admin'

type AttendanceEfficiencyCardProps = {
  insights: AttendanceInsights | null
  loading: boolean
  statusMessage: string
}

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Rating bands come from the backend; this only maps them onto a colour. */
function toneFor(rating: string) {
  const normalised = rating.toLowerCase()
  if (normalised === 'excellent') return 'is-excellent'
  if (normalised === 'good') return 'is-good'
  if (normalised === 'fair') return 'is-fair'
  if (normalised === 'no data') return 'is-idle'
  return 'is-poor'
}

function formatRange(start: string, end: string) {
  const parse = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const startDate = parse(start)
  const endDate = parse(end)
  if (!startDate || !endDate) {
    return ''
  }
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
  return `${startDate.toLocaleDateString(undefined, options)} – ${endDate.toLocaleDateString(undefined, options)}`
}

/**
 * Organisation-wide attendance efficiency for the current window, drawn as a
 * ring so the number reads at a glance. The score is the share of *expected*
 * attendance that was met — holidays and week offs are excluded server-side, so
 * a quiet Sunday never dents it.
 */
export default function AttendanceEfficiencyCard({
  insights,
  loading,
  statusMessage
}: AttendanceEfficiencyCardProps) {
  const efficiency = insights?.efficiency
  const score = efficiency?.score ?? null
  const rating = efficiency?.rating ?? 'No data'
  const delta = efficiency?.delta ?? null
  const progress = Math.min(Math.max(score ?? 0, 0), 100) / 100
  const tone = toneFor(rating)
  const markerAngle = progress * Math.PI * 2 - Math.PI / 2
  const markerX = 70 + RADIUS * Math.cos(markerAngle)
  const markerY = 70 + RADIUS * Math.sin(markerAngle)
  const deltaLabel = delta === null
    ? 'No comparison'
    : delta === 0
      ? 'No change'
      : `${delta > 0 ? '+' : ''}${delta} pts`

  return (
    <div className={`chart-card rp-efficiency-card ${tone}`}>
      <div className="chart-card-head">
        <div>
          <strong>Attendance Efficiency</strong>
          <span>
            {insights ? `Last ${insights.windowDays} days · ${formatRange(insights.startDate, insights.endDate)}` : 'Share of expected attendance met'}
          </span>
        </div>
      </div>

      <div className="rp-efficiency-body">
        <div className="rp-gauge">
          <svg viewBox="0 0 140 140" role="img" aria-label={`Attendance efficiency ${score === null ? 'unavailable' : `${score} percent`}`}>
            <circle className="rp-gauge-inner" cx="70" cy="70" r="42" />
            <circle className="rp-gauge-track" cx="70" cy="70" r={RADIUS} />
            <circle
              className="rp-gauge-value"
              cx="70"
              cy="70"
              r={RADIUS}
              strokeDasharray={`${CIRCUMFERENCE * progress} ${CIRCUMFERENCE}`}
              transform="rotate(-90 70 70)"
            />
            {score !== null ? <circle className="rp-gauge-marker" cx={markerX} cy={markerY} r="4" /> : null}
          </svg>
          <div className="rp-gauge-centre">
            <strong>{score === null ? (loading ? '…' : '—') : `${Math.round(score)}%`}</strong>
            <span>Efficiency</span>
          </div>
        </div>

        <div className="rp-efficiency-metrics">
          <div className="rp-efficiency-metric">
            <span>Coverage</span>
            <strong>{efficiency ? `${efficiency.presentDays} / ${efficiency.expectedDays}` : '—'}</strong>
            <small>Expected days</small>
          </div>
          <div className="rp-efficiency-metric">
            <span>Change</span>
            <strong className={delta === null ? 'is-flat' : delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat'}>
              {deltaLabel}
            </strong>
            <small>Previous {insights?.windowDays ?? 7} days</small>
          </div>
        </div>
      </div>

      {statusMessage ? <span className="report-status">{statusMessage}</span> : null}
    </div>
  )
}
