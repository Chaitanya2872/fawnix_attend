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
const VIEW_HEIGHT = 232
const PADDING = { top: 24, right: 18, bottom: 34, left: 44 }
const TICKS = [1, 0.75, 0.5, 0.25, 0]

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

type PlotPoint = {
  x: number
  y: number
}

function smoothPath(points: PlotPoint[]) {
  if (!points.length) {
    return ''
  }

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index]
    const controlX = (previous.x + point.x) / 2
    return `${path} C ${controlX},${previous.y} ${controlX},${point.y} ${point.x},${point.y}`
  }, `M ${points[0].x},${points[0].y}`)
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

  const points = series.map((point, index) => ({
    x: xFor(index, series.length),
    y: yFor(point.ratio)
  }))
  const linePath = smoothPath(points)
  const baseline = yFor(0)
  const areaPath = `${linePath} L ${points.at(-1)?.x ?? PADDING.left},${baseline} L ${points[0].x},${baseline} Z`
  const scoredSeries = series.filter((point) => !point.isMuted)
  const summarySeries = scoredSeries.length ? scoredSeries : series
  const averageRatio = summarySeries.reduce((total, point) => total + point.ratio, 0) / summarySeries.length
  const bestPoint = summarySeries.reduce((best, point) => point.ratio > best.ratio ? point : best)
  const latestPoint = summarySeries.at(-1) ?? series.at(-1)
  const averageLabel = isPercentage
    ? `${Math.round(averageRatio * 100)}%`
    : String(Math.round(averageRatio * maxValue))
  const averageY = yFor(averageRatio)

  return (
    <div className={`rp-trend${loading ? ' is-refreshing' : ''}`}>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="rp-trend-svg" role="img" aria-label="Attendance trend">
        <defs>
          <linearGradient id="attendanceTrendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1fa7a4" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#1fa7a4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <rect
          className="rp-trend-plot"
          x={PADDING.left}
          y={PADDING.top}
          width={PLOT_WIDTH}
          height={PLOT_HEIGHT}
          rx="8"
        />
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

        <path className="rp-trend-area" d={areaPath} />
        <line
          className="rp-trend-average"
          x1={PADDING.left}
          x2={VIEW_WIDTH - PADDING.right}
          y1={averageY}
          y2={averageY}
        />
        <text
          className="rp-trend-average-label"
          x={VIEW_WIDTH - PADDING.right - 4}
          y={Math.max(PADDING.top + 11, averageY - 7)}
          textAnchor="end"
        >
          AVG {averageLabel}
        </text>
        <path className="rp-trend-line" d={linePath} />

        {series.map((point, index) => (
          <g key={point.key}>
            {point.key === latestPoint?.key ? (
              <circle
                className="rp-trend-dot-halo"
                cx={xFor(index, series.length)}
                cy={yFor(point.ratio)}
                r="9"
              />
            ) : null}
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

      <div className="rp-trend-summary">
        <div className="rp-trend-summary-item">
          <span>Average</span>
          <strong>{averageLabel}</strong>
        </div>
        <div className="rp-trend-summary-item">
          <span>Best day</span>
          <strong>{bestPoint.label} · {bestPoint.valueLabel}</strong>
        </div>
        <div className="rp-trend-summary-item">
          <span>Latest</span>
          <strong>{latestPoint ? `${latestPoint.label} · ${latestPoint.valueLabel}` : '—'}</strong>
        </div>
      </div>
    </div>
  )
}
