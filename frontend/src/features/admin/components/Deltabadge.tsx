type DeltaBadgeProps = {
  delta: number | null
  label: string
  good?: 'up' | 'down'
}

export function DeltaBadge({ delta, label, good = 'up' }: DeltaBadgeProps) {
  if (delta === null) return null
  const isFlat = delta === 0
  const isUp = delta > 0
  const isGood = isFlat ? null : good === 'up' ? isUp : !isUp
  const arrow = isFlat ? '→' : isUp ? '↑' : '↓'
  const cls = isFlat ? 'flat' : isGood ? 'good' : 'bad'
  return (
    <div className={`ov2-delta ${cls}`}>
      <span className="ov2-delta-arrow">{arrow}</span>
      <span className="ov2-delta-num">
        {isFlat ? 'No change' : `${delta > 0 ? '+' : ''}${delta}`}
      </span>
      <span className="ov2-delta-label">{label}</span>
    </div>
  )
}