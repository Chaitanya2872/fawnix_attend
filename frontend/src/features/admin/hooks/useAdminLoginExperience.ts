import { useEffect, useState } from 'react'

function formatCoordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? positive : negative}`
}

export function useAdminLoginExperience(enabled: boolean) {
  const [loginSceneTime, setLoginSceneTime] = useState(() => new Date())
  const [loginLocationDetails, setLoginLocationDetails] = useState('Waiting for device location')
  const canUseGeolocation = 'geolocation' in navigator

  useEffect(() => {
    if (!enabled) {
      return
    }

    const intervalId = window.setInterval(() => setLoginSceneTime(new Date()), 60000)

    return () => window.clearInterval(intervalId)
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (!canUseGeolocation) {
      return
    }

    let cancelled = false
    const locatingTimerId = window.setTimeout(() => {
      if (!cancelled) {
        setLoginLocationDetails('Locating device')
      }
    }, 0)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) {
          return
        }

        const { latitude, longitude } = position.coords
        setLoginLocationDetails(
          `${formatCoordinate(latitude, 'N', 'S')} / ${formatCoordinate(longitude, 'E', 'W')}`
        )
      },
      () => {
        if (!cancelled) {
          setLoginLocationDetails('Location access is off')
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000
      }
    )

    return () => {
      cancelled = true
      window.clearTimeout(locatingTimerId)
    }
  }, [enabled, canUseGeolocation])

  return {
    loginSceneTime,
    loginLocationDetails: enabled && !canUseGeolocation
      ? 'Location unavailable in this browser'
      : loginLocationDetails
  }
}
