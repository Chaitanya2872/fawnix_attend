"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientPagination = ClientPagination;
require("./ClientPagination.css");
function ClientPagination(_a) {
    var page = _a.page, pageSize = _a.pageSize, total = _a.total, onPageChange = _a.onPageChange;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (total <= pageSize)
        return null;
    var first = (page - 1) * pageSize + 1;
    var last = Math.min(page * pageSize, total);
    return (<footer className="client-pagination" aria-label="Pagination">
      <span>Showing {first}-{last} of {total}</span>
      <div>
        <button type="button" onClick={function () { return onPageChange(page - 1); }} disabled={page <= 1}>Previous</button>
        <strong>Page {page} of {totalPages}</strong>
        <button type="button" onClick={function () { return onPageChange(page + 1); }} disabled={page >= totalPages}>Next</button>
      </div>
    </footer>);
}
