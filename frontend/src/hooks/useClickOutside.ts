import { useEffect } from 'react'
import type { RefObject } from 'react'

type UseClickOutsideOptions = {
  closeOnEscape?: boolean
}

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  isActive: boolean,
  onDismiss: () => void,
  options: UseClickOutsideOptions = {}
) {
  const { closeOnEscape = true } = options

  useEffect(() => {
    if (!isActive) {
      return undefined
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onDismiss()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onDismiss()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeOnEscape, isActive, onDismiss, ref])
}
