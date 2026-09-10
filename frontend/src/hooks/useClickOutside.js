"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useClickOutside = useClickOutside;
var react_1 = require("react");
function useClickOutside(ref, isActive, onDismiss, options) {
    if (options === void 0) { options = {}; }
    var _a = options.closeOnEscape, closeOnEscape = _a === void 0 ? true : _a;
    (0, react_1.useEffect)(function () {
        if (!isActive) {
            return undefined;
        }
        var handlePointerDown = function (event) {
            var _a;
            if (!((_a = ref.current) === null || _a === void 0 ? void 0 : _a.contains(event.target))) {
                onDismiss();
            }
        };
        var handleKeyDown = function (event) {
            if (closeOnEscape && event.key === 'Escape') {
                onDismiss();
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return function () {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeOnEscape, isActive, onDismiss, ref]);
}
