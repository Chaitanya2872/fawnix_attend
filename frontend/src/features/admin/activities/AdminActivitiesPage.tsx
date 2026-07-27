type ActivityRow = {
  id?: number | string
  employee_name?: string
  employee_email?: string
  activity_type?: string
  start_time?: string
  status?: string
}

type Props = {
  filteredActivities: ActivityRow[]
  formatDateTime: (value?: string) => string
  loadDashboard: () => void | Promise<void>
  setShowTodayActivities: (value: boolean | ((current: boolean) => boolean)) => void
  showTodayActivities: boolean
}

export default function AdminActivitiesPage({
  filteredActivities,
  formatDateTime,
  loadDashboard,
  setShowTodayActivities,
  showTodayActivities
}: Props) {
  return (
    <>
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Live Work</p>
          <h2>Activities</h2>
        </div>
        <div className="employee-actions">
          <button
            className="ghost dashboard-button"
            onClick={() => setShowTodayActivities((current: boolean) => !current)}
            type="button"
          >
            {showTodayActivities ? 'Show All' : 'Show Today'}
          </button>
          <button className="ghost dashboard-button" onClick={() => void loadDashboard()} type="button">
            Refresh
          </button>
        </div>
      </div>
      <div className="table-card">
        {filteredActivities.length ? (
          <div className="table-scroll">
            <table className="dashboard-table activity-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Activity</th>
                  <th>Started</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((row, index) => (
                  <tr key={`${row.id || row.employee_email || index}`}>
                    <td>
                      <strong>{row.employee_name || row.employee_email || 'Unknown employee'}</strong>
                    </td>
                    <td>{row.activity_type || 'Activity'}</td>
                    <td>{formatDateTime(row.start_time)}</td>
                    <td>
                      <span className="table-pill accent">{row.status || 'Unknown'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            {showTodayActivities ? 'No activities found for today.' : 'No activities found.'}
          </div>
        )}
      </div>
    </>
  )
}
