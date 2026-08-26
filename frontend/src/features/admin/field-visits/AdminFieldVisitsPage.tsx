/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { ClientPagination } from '../components/ClientPagination'
type Props = any

export default function AdminFieldVisitsPage({
  fieldVisitDurationTick,
  fieldVisitRows,
  formatDateTime,
  formatDistanceKm,
  formatVisitDuration,
  loadDashboard,
  openFieldVisitPanel,
  openMapForFieldVisit,
  resolveVisitDurationMinutes
}: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(fieldVisitRows.length / pageSize))
  const visiblePage = Math.min(currentPage, totalPages)
  const pageRows = fieldVisitRows.slice((visiblePage - 1) * pageSize, visiblePage * pageSize)
  const completedVisits = fieldVisitRows.filter((row: any) => row.isCompleted).length
  const activeVisits = fieldVisitRows.length - completedVisits
  const destinationCompleted = fieldVisitRows.filter((row: any) => row.destinationVisited).length

  return (
    <div className="admin-aligned-page admin-aligned-page--field-visits">
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Movement</p>
          <h2>Field Visits</h2>
        </div>
        <button className="ghost dashboard-button" onClick={() => void loadDashboard()} type="button">Refresh</button>
      </div>

      <div className="kpi-cards admin-kpi-cards field-visit-kpi-cards" aria-label="Field visit summary">
        <div className="kpi-card admin-kpi-card-static">
          <div className="kpi-body">
            <span className="kpi-count">{fieldVisitRows.length}</span>
            <span className="kpi-label">Total Visits</span>
          </div>
        </div>
        <div className="kpi-card admin-kpi-card-static">
          <div className="kpi-body">
            <span className="kpi-count">{activeVisits}</span>
            <span className="kpi-label">In Progress</span>
          </div>
        </div>
        <div className="kpi-card admin-kpi-card-static">
          <div className="kpi-body">
            <span className="kpi-count">{completedVisits}</span>
            <span className="kpi-label">Completed</span>
          </div>
        </div>
        <div className="kpi-card admin-kpi-card-static">
          <div className="kpi-body">
            <span className="kpi-count">{destinationCompleted}</span>
            <span className="kpi-label">Destination Hit</span>
          </div>
        </div>
      </div>

      <div className="table-card">
        {fieldVisitRows.length ? (
          <div className="table-scroll">
            <table className="dashboard-table field-visit-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Visit Type</th>
                  <th>Destination Location</th>
                  <th>Destination Visited</th>
                  <th>Visited Flag</th>
                  <th>Start Location</th>
                  <th>End Location</th>
                  <th>Hours There</th>
                  <th>Distance</th>
                  <th>Status</th>
                  <th>Map</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row: any) => {
                  const showRouteDetails = row.isCompleted
                  const durationMinutes = resolveVisitDurationMinutes(row.durationMinutes, row.visitStartTime || row.visitDate, row.visitEndTime, row.isCompleted, fieldVisitDurationTick)
                  return (
                    <tr key={row.activityId} className="table-clickable-row" onClick={() => void openFieldVisitPanel(row)}>
                      <td><strong>{row.employee}</strong></td>
                      <td>{formatDateTime(row.visitDate)}</td>
                      <td>{row.visitType}</td>
                      <td>{row.destinationLocation || '--'}</td>
                      <td>
                        {row.destinationVisited === null ? '--' : (
                          <span className={`table-pill ${row.destinationVisited ? 'active' : (row.destinationVisitedCount || 0) > 0 ? 'accent' : 'inactive'}`}>
                            {row.destinationVisited ? 'Completed' : (row.destinationVisitedCount || 0) > 0 ? `Partial (${row.destinationVisitedCount}/${row.destinationTotalCount || 0})` : 'Pending'}
                          </span>
                        )}
                      </td>
                      <td>{row.destinationVisitFlag === null ? '--' : <span className={`table-pill ${row.destinationVisitFlag ? 'active' : 'inactive'}`}>{row.destinationVisitFlag ? 'True' : 'False'}</span>}</td>
                      <td><strong>{row.startName || 'Start location unavailable'}</strong><span className="table-meta">{row.startAddress || row.location || '--'}</span></td>
                      <td><strong>{showRouteDetails ? row.endName || 'End location unavailable' : '--'}</strong><span className="table-meta">{showRouteDetails ? row.endAddress || '--' : 'Visit in progress'}</span></td>
                      <td>{formatVisitDuration(durationMinutes)}</td>
                      <td>{showRouteDetails ? formatDistanceKm(row.distanceKm) : '--'}</td>
                      <td><span className="table-pill accent">{row.status}</span></td>
                      <td>
                        <button className="map-button" onClick={(event) => { event.stopPropagation(); void openMapForFieldVisit(row) }} aria-label="Open map" title="Open map" type="button">
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M12 2c-3.6 0-6.5 2.9-6.5 6.5 0 4.7 6.5 12 6.5 12s6.5-7.3 6.5-12C18.5 4.9 15.6 2 12 2zm0 9.2c-1.5 0-2.7-1.2-2.7-2.7S10.5 5.8 12 5.8s2.7 1.2 2.7 2.7S13.5 11.2 12 11.2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <ClientPagination page={visiblePage} pageSize={pageSize} total={fieldVisitRows.length} onPageChange={setCurrentPage} />
          </div>
        ) : (
          <div className="empty-state">No field visits found in the latest activity feed.</div>
        )}
      </div>
    </div>
  )
}
