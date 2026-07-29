type AttendanceDatePickerProps = {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
}

/**
 * A deliberately native control: attendance is filtered by a single date, so
 * the operating system's date picker is faster and more predictable than a
 * custom calendar dialog.
 */
export default function AttendanceDatePicker({
  id = 'attendance-date',
  label = 'Date',
  value,
  onChange
}: AttendanceDatePickerProps) {
  return (
    <div className="attendance-filter attendance-filter-date">
      <label htmlFor={id}>{label}</label>
      <input
        className="attendance-native-date-input"
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
