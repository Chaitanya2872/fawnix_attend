# TODO: Re-add employee search + Duplicate /team-exceptions endpoint in admin.py

## Steps
1. ✅ [Complete] Create TODO.md with updated plan
2. ✅ [Complete] Restore employee search functionality in frontend/src/App.tsx:
   - Verify `employeeSearch` state & filter logic (name, code, email, designation, dept, manager)
   - Confirm search input UI in Employees panel
3. ✅ [Complete] Duplicate @exceptions_bp.route('/team-exceptions') endpoint into routes/admin.py (on admin_bp):
   - Added import from services.attendance_exceptions_service
   - Added @admin_bp.route('/team-exceptions') with @hr_or_devtester_required
4. ⏳ [Pending] Test frontend: `cd frontend && npm run dev`, admin dashboard → Employees List → Verify search works
5. ⏳ [Pending] Test endpoint: Admin login → GET /api/admin/team-exceptions?status=pending
6. ⏳ [Pending] attempt_completion

