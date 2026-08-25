import { useEffect } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type UseDialogFocusOptions = {
  /** The dialog/drawer element. */
  containerRef: RefObject<HTMLElement | null>
  /** Whether the dialog is currently open. */
  open: boolean
  /** Invoked on Escape. Omit to disable Escape-to-close. */
  onClose?: () => void
}

function getFocusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement
  )
}

/**
 * Keyboard behaviour every modal surface is expected to have: focus moves into
 * the dialog on open, Tab cycles within it rather than escaping to the page
 * behind, Escape closes, and focus returns to whatever opened it.
 *
 * Without this, keyboard and screen-reader users tab straight out of an open
 * drawer into content that is visually covered.
 */
export function useDialogFocus({ containerRef, open, onClose }: UseDialogFocusOptions) {
  useEffect(() => {
    if (!open) return

    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Prefer the first real control; fall back to the container itself so the
    // dialog is never left with focus on the page behind it.
    const initial = getFocusable(container)[0]
    if (initial) {
      initial.focus()
    } else {
      container.setAttribute('tabindex', '-1')
      container.focus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = getFocusable(container)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      // Wrap at both ends, and pull focus back in if it has escaped entirely.
      if (!container.contains(active)) {
        event.preventDefault()
        first.focus()
        return
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      // Only restore if focus is still inside the dialog being torn down.
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [containerRef, open, onClose])
}
