import { useEffect, useState } from 'react'

function formatCoordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? positive : negative}`
}

export function useAdminLoginExperience(enabled: boolean) {
  const [loginSceneTime, setLoginSceneTime] = useState(() => new Date())
  const [loginLocationDetails, setLoginLocationDetails] = useState('Waiting for device location')

  useEffect(() => {
    if (!enabled) {
      return
    }

    setLoginSceneTime(new Date())
    const intervalId = window.setInterval(() => setLoginSceneTime(new Date()), 60000)

    return () => window.clearInterval(intervalId)
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (!('geolocation' in navigator)) {
      setLoginLocationDetails('Location unavailable in this browser')
      return
    }

    let cancelled = false
    setLoginLocationDetails('Locating device')

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
    }
  }, [enabled])

  return {
    loginSceneTime,
    loginLocationDetails
  }
}
