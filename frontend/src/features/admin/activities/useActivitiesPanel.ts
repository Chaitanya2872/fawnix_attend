import { useState } from 'react'
import { isSameDate, toDateInputValue } from '../../../utils/date/dateUtils'
import type { ActivityRow } from '../../../types/admin'

type UseActivitiesPanelOptions = {
  activityRows: ActivityRow[]
}

export function useActivitiesPanel({ activityRows }: UseActivitiesPanelOptions) {
  const [showTodayActivities, setShowTodayActivities] = useState(true)
  const todayDateValue = toDateInputValue(new Date())
  const filteredActivities = showTodayActivities
    ? activityRows.filter((row) => isSameDate(row.start_time, todayDateValue))
    : activityRows

  return {
    showTodayActivities,
    setShowTodayActivities,
    filteredActivities
  }
}
