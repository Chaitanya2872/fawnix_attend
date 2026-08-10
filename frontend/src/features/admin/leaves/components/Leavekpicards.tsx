import type { AdminLeaveKpis } from '../../../../types/admin'
// Styles now live in AdminLeavesPage.css (the only page that renders this
// component), replacing the old teal-palette LeaveKpiCards.css.

type Props = {
  kpis: AdminLeaveKpis
  loading: boolean
  onFilterByStatus?: (status: string) => void
}

const AGE_BUCKETS = [
  { key: 'under_7', label: '< 7 days' },
  { key: 'd7_30', label: '7–30' },
  { key: 'd30_90', label: '30–90' },
  { key: 'over_90', label: '90+' },
] as const

function initialsOf(name: string | null | undefined): string {
  if (!name) return '--'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}

function formatDays(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export default function LeaveKpiCards({ kpis, loading, onFilterByStatus }: Props) {
  const trend = kpis.previous_month_total
    ? ((kpis.current_month_total - kpis.previous_month_total) / kpis.previous_month_total) * 100
    : kpis.current_month_total > 0
      ? 100
      : 0
  const trendUp = trend >= 0
  const dailyTrend = kpis.daily_trend || []
  const maxTrendCount = Math.max(1, ...dailyTrend.map((point) => point.count))

  const buckets = kpis.age_buckets || { under_7: 0, d7_30: 0, d30_90: 0, over_90: 0 }
  const maxBucket = Math.max(1, buckets.under_7, buckets.d7_30, buckets.d30_90, buckets.over_90)

  const leaderboard = (kpis.top_leave_days || []).slice(0, 2)
  const totalDaysBooked = (kpis.top_leave_days || []).reduce((sum, entry) => sum + entry.total_days, 0)

  return (
    <div className="lv-kpi-wrap">
      <div className="lv-kpi-grid">
        {/* ─── Leave requests ───────────────────────────────────── */}
        <div className="lv-kpi-card">
          <div className="lv-kpi-card__label">Leave Requests</div>
          <div className="lv-kpi-card__row">
            {loading ? (
              <span className="lv-kpi__skeleton" />
            ) : (
              <span className="lv-kpi-card__value">{kpis.total.toLocaleString()}</span>
            )}
            {!loading && (
              <span className={`lv-trend-pill ${trendUp ? 'lv-trend-pill--up' : 'lv-trend-pill--down'}`}>
                {trendUp ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs last month
              </span>
            )}
          </div>
          <div className="lv-kpi-card__sub">
            This month {kpis.current_month_total.toLocaleString()} · last month {kpis.previous_month_total.toLocaleString()}
          </div>
          <div className="lv-sparkline">
            {dailyTrend.length ? (
              dailyTrend.map((point, index) => (
                <span
                  key={point.date}
                  className={`lv-sparkline__bar${index === dailyTrend.length - 1 ? ' lv-sparkline__bar--current' : ''}`}
                  style={{ height: `${Math.max(6, Math.round((point.count / maxTrendCount) * 100))}%` }}
                  title={`${point.date}: ${point.count}`}
                />
              ))
            ) : (
              <span className="lv-sparkline__empty">No recent activity</span>
            )}
          </div>
        </div>

        {/* ─── Awaiting approval ────────────────────────────────── */}
        <div
          className={`lv-kpi-card${onFilterByStatus ? ' lv-kpi-card--clickable' : ''}`}
          role={onFilterByStatus ? 'button' : undefined}
          tabIndex={onFilterByStatus ? 0 : undefined}
          onClick={onFilterByStatus ? () => onFilterByStatus('pending') : undefined}
          onKeyDown={
            onFilterByStatus
              ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onFilterByStatus('pending')
                }
              }
              : undefined
          }
        >
          <div className="lv-kpi-card__label">Awaiting Approval</div>
          <div className="lv-kpi-card__row">
            {loading ? (
              <span className="lv-kpi__skeleton" />
            ) : (
              <span className="lv-kpi-card__value">{kpis.pending.toLocaleString()}</span>
            )}
            {!loading && (
              <span className="lv-kpi-card__row-sub">
                across {kpis.pending_employee_count} employee{kpis.pending_employee_count === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="lv-kpi-card__sub">
            {kpis.pending === 0
              ? 'Nothing waiting on a manager'
              : kpis.oldest_pending_days != null
                ? `Oldest has been waiting ${kpis.oldest_pending_days} day${kpis.oldest_pending_days === 1 ? '' : 's'}`
                : 'Waiting on manager review'}
          </div>
          <div className="lv-age-histogram">
            {AGE_BUCKETS.map((bucket) => (
              <div className="lv-age-histogram__col" key={bucket.key}>
                <span
                  className="lv-age-histogram__bar"
                  style={{ height: `${Math.max(8, Math.round((buckets[bucket.key] / maxBucket) * 100))}%` }}
                  title={`${buckets[bucket.key]} requests`}
                />
                <span className="lv-age-histogram__label">{bucket.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Most leave days ──────────────────────────────────── */}
        <div className="lv-kpi-card">
          <div className="lv-kpi-card__label-row">
            <div className="lv-kpi-card__label">Most Leave Days</div>
            <div className="lv-kpi-card__label-hint">
              {loading ? '' : `${formatDays(totalDaysBooked)} days booked`}
            </div>
          </div>
          {loading ? (
            <div className="lv-leaderboard lv-leaderboard--loading">
              <span className="lv-kpi__skeleton" />
              <span className="lv-kpi__skeleton" />
            </div>
          ) : leaderboard.length ? (
            <div className="lv-leaderboard">
              {leaderboard.map((person, index) => (
                <div className="lv-leaderboard__row" key={`${person.employee_code || person.employee_name}-${index}`}>
                  <span className="lv-leaderboard__avatar">{initialsOf(person.employee_name)}</span>
                  <div className="lv-leaderboard__info">
                    <div className="lv-leaderboard__name">{person.employee_name || 'Unknown'}</div>
                    <div className="lv-leaderboard__dept">{person.department || '--'}</div>
                  </div>
                  <div className="lv-leaderboard__stats">
                    <div>
                      <strong>{formatDays(person.casual_days)}</strong>
                      <span>CASUAL</span>
                    </div>
                    <div>
                      <strong>{formatDays(person.sick_days)}</strong>
                      <span>SICK</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="lv-leaderboard__empty">No approved or pending leave in this filter.</div>
          )}
        </div>
      </div>
    </div>
  )
}
