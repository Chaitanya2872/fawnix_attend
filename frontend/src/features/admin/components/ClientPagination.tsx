import './ClientPagination.css'

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function ClientPagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <footer className="client-pagination" aria-label="Pagination">
      <span>Showing {first}-{last} of {total}</span>
      <div>
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Previous</button>
        <strong>Page {page} of {totalPages}</strong>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next</button>
      </div>
    </footer>
  )
}
