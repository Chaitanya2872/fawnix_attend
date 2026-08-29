import type { AttendanceTrendSeriesPoint } from './useReportsPanel'

type WeeklyTrendChartProps = {
  series: AttendanceTrendSeriesPoint[]
  /** True when the y axis is an attendance rate rather than a headcount. */
  isPercentage: boolean
  /** Top of the axis when plotting headcounts. */
  maxValue: number
  loading: boolean
}

const VIEW_WIDTH = 640
const VIEW_HEIGHT = 260
const PADDING = { top: 18, right: 18, bottom: 38, left: 44 }
const TICKS = [1, 0.8, 0.6, 0.4, 0.2, 0]

const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom

function xFor(index: number, count: number) {
  if (count <= 1) {
    return PADDING.left + PLOT_WIDTH / 2
  }
  return PADDING.left + (index / (count - 1)) * PLOT_WIDTH
}

function yFor(ratio: number) {
  const clamped = Math.min(Math.max(ratio, 0), 1)
  return PADDING.top + (1 - clamped) * PLOT_HEIGHT
}

/**
 * Attendance rate across the trailing window. Drawn on a fixed viewBox with a
 * real axis so the line keeps its stroke weight at any width — the older
 * `preserveAspectRatio="none"` chart stretched it.
 */
export default function WeeklyTrendChart({ series, isPercentage, maxValue, loading }: WeeklyTrendChartProps) {
  if (!series.length) {
    return <div className="empty-state">{loading ? 'Loading attendance trend…' : 'No attendance data for this window yet.'}</div>
  }

  const linePoints = series.map((point, index) => `${xFor(index, series.length)},${yFor(point.ratio)}`).join(' ')
  const areaPoints = `${PADDING.left},${yFor(0)} ${linePoints} ${xFor(series.length - 1, series.length)},${yFor(0)}`

  return (
    <div className={`rp-trend${loading ? ' is-refreshing' : ''}`}>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="rp-trend-svg" role="img" aria-label="Attendance trend">
        {TICKS.map((tick) => (
          <g key={tick}>
            <line
              className="rp-trend-grid"
              x1={PADDING.left}
              x2={VIEW_WIDTH - PADDING.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
            />
            <text className="rp-trend-axis" x={PADDING.left - 10} y={yFor(tick) + 4} textAnchor="end">
              {isPercentage ? `${Math.round(tick * 100)}%` : Math.round(tick * maxValue)}
            </text>
          </g>
        ))}

        <polygon className="rp-trend-area" points={areaPoints} />
        <polyline className="rp-trend-line" points={linePoints} />

        {series.map((point, index) => (
          <g key={point.key}>
            <circle
              className={`rp-trend-dot${point.isMuted ? ' is-muted' : ''}`}
              cx={xFor(index, series.length)}
              cy={yFor(point.ratio)}
              r="4.5"
            >
              <title>{`${point.label}: ${point.valueLabel} (${point.caption})`}</title>
            </circle>
            <text
              className={`rp-trend-label${point.isMuted ? ' is-muted' : ''}`}
              x={xFor(index, series.length)}
              y={VIEW_HEIGHT - 14}
              textAnchor="middle"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="rp-trend-readout" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}>
        {series.map((point) => (
          <div key={point.key} className={`rp-trend-readout-item${point.isMuted ? ' is-muted' : ''}`}>
            <strong>{point.valueLabel}</strong>
            <span>{point.caption}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
