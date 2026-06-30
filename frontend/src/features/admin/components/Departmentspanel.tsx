type DeptEntry = [string, { head: number; present: number }]

type DepartmentsPanelProps = {
  deptEntries: DeptEntry[]
  selectedDateLabel: string
}

function shortenDeptLabel(value: string) {
  return value.length > 10 ? `${value.slice(0, 10)}...` : value
}

export function DepartmentsPanel({ deptEntries, selectedDateLabel }: DepartmentsPanelProps) {
  const maxValue = Math.max(...deptEntries.map(([, entry]) => entry.head), 1)

  return (
    <div className="ov2-card">
      <div className="ov2-card-head">
        <div>
          <div className="ov2-card-title">Departments</div>
          <div className="ov2-card-sub">
            Head count vs present count for {selectedDateLabel}
          </div>
        </div>
        <span className="ov2-count-badge">{deptEntries.length} depts</span>
      </div>

      <div className="ov2-dept-chart-legend" aria-label="Department chart legend">
        <span className="ov2-dept-legend-pill">
          <span className="ov2-dept-legend-swatch head" />
          Head Count
        </span>
        <span className="ov2-dept-legend-pill">
          <span className="ov2-dept-legend-swatch present" />
          Present Today
        </span>
      </div>

      <div className="ov2-dept-chart">
        {deptEntries.map(([dept, entry]) => {
          const headHeight = Math.max(Math.round((entry.head / maxValue) * 100), 8)
          const presentHeight = Math.max(Math.round((entry.present / maxValue) * 100), 8)

          return (
            <div key={dept} className="ov2-dept-chart-col">
              <div className="ov2-dept-chart-values">
                <span>{entry.head}</span>
                <span>{entry.present}</span>
              </div>
              <div className="ov2-dept-chart-bars">
                <div className="ov2-dept-chart-bar-wrap">
                  <div
                    className="ov2-dept-chart-bar head"
                    style={{ height: `${headHeight}%` }}
                    aria-label={`${dept} head count ${entry.head}`}
                  />
                </div>
                <div className="ov2-dept-chart-bar-wrap">
                  <div
                    className="ov2-dept-chart-bar present"
                    style={{ height: `${presentHeight}%` }}
                    aria-label={`${dept} present count ${entry.present}`}
                  />
                </div>
              </div>
              <div className="ov2-dept-chart-meta">
                <span className="ov2-dept-name" title={dept}>
                  {shortenDeptLabel(dept)}
                </span>
                <span className="ov2-dept-count">
                  {entry.present}/{entry.head}
                </span>
              </div>
            </div>
          )
        })}

        {deptEntries.length === 0 && <div className="ov2-empty">No department data</div>}
      </div>
    </div>
  )
}
