import type { EmployeeRow } from '../../../types/admin'

type Props = { employee: EmployeeRow; onClose: () => void; onEdit?: () => void }

const fields = [
  ['Employee code', 'emp_code'], ['Email', 'emp_email'], ['Contact', 'emp_contact'],
  ['Designation', 'emp_designation'], ['Grade', 'emp_grade'], ['Department', 'emp_department'],
  ['Manager', 'manager_name'], ['Manager code', 'emp_manager']
] as const

export default function EmployeeViewDrawer({ employee, onClose, onEdit }: Props) {
  const record = employee as Record<string, unknown>
  const name = employee.emp_full_name || employee.emp_code || 'Employee'
  return <>
    <button className="side-panel-scrim" type="button" aria-label="Close employee details" onClick={onClose} />
    <aside className="field-visit-panel employee-view-panel" aria-label={`${name} details`}>
      <header className="employee-panel-head employee-view-head">
        <div><span>Employee profile</span><h3>{name}</h3><p>{employee.is_active ? 'Active employee' : 'Inactive employee'}</p></div>
        <button className="field-visit-panel-close" type="button" onClick={onClose}>Close</button>
      </header>
      <section className="employee-view-grid" aria-label="Employee details">
        {fields.map(([label, field]) => <div className="employee-view-item" key={field}><span>{label}</span><strong>{String(record[field] || '—')}</strong></div>)}
      </section>
      {onEdit ? <footer className="employee-panel-actions employee-view-actions"><button className="cta" type="button" onClick={onEdit}>Edit employee</button></footer> : null}
    </aside>
  </>
}
