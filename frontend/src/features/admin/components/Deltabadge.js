"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeltaBadge = DeltaBadge;
function DeltaBadge(_a) {
    var delta = _a.delta, label = _a.label, _b = _a.good, good = _b === void 0 ? 'up' : _b;
    if (delta === null)
        return null;
    var isFlat = delta === 0;
    var isUp = delta > 0;
    var isGood = isFlat ? null : good === 'up' ? isUp : !isUp;
    var arrow = isFlat ? '→' : isUp ? '↑' : '↓';
    var cls = isFlat ? 'flat' : isGood ? 'good' : 'bad';
    return (<div className={"ov2-delta ".concat(cls)}>
      <span className="ov2-delta-arrow">{arrow}</span>
      <span className="ov2-delta-num">
        {isFlat ? 'No change' : "".concat(delta > 0 ? '+' : '').concat(delta)}
      </span>
      <span className="ov2-delta-label">{label}</span>
    </div>);
}
