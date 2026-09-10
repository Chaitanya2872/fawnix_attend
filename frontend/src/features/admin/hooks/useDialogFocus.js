"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDialogFocus = useDialogFocus;
var react_1 = require("react");
var FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');
function getFocusable(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE)).filter(function (element) { return element.offsetParent !== null || element === document.activeElement; });
}
/**
 * Keyboard behaviour every modal surface is expected to have: focus moves into
 * the dialog on open, Tab cycles within it rather than escaping to the page
 * behind, Escape closes, and focus returns to whatever opened it.
 *
 * Without this, keyboard and screen-reader users tab straight out of an open
 * drawer into content that is visually covered.
 */
function useDialogFocus(_a) {
    var containerRef = _a.containerRef, open = _a.open, onClose = _a.onClose;
    var onCloseRef = (0, react_1.useRef)(onClose);
    (0, react_1.useEffect)(function () {
        onCloseRef.current = onClose;
    }, [onClose]);
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        var container = containerRef.current;
        if (!container)
            return;
        var previouslyFocused = document.activeElement;
        // Prefer the first real control; fall back to the container itself so the
        // dialog is never left with focus on the page behind it.
        var initial = getFocusable(container)[0];
        if (initial) {
            initial.focus();
        }
        else {
            container.setAttribute('tabindex', '-1');
            container.focus();
        }
        var onKeyDown = function (event) {
            if (event.key === 'Escape' && onCloseRef.current) {
                event.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab')
                return;
            var focusable = getFocusable(container);
            if (focusable.length === 0) {
                event.preventDefault();
                return;
            }
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            var active = document.activeElement;
            // Wrap at both ends, and pull focus back in if it has escaped entirely.
            if (!container.contains(active)) {
                event.preventDefault();
                first.focus();
                return;
            }
            if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
            else if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
        return function () {
            document.removeEventListener('keydown', onKeyDown, true);
            // Only restore if focus is still inside the dialog being torn down.
            if (previouslyFocused && document.body.contains(previouslyFocused)) {
                previouslyFocused.focus();
            }
        };
    }, [containerRef, open]);
}
