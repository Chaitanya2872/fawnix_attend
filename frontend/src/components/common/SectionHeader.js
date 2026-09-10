"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionHeader = SectionHeader;
function SectionHeader(_a) {
    var eyebrow = _a.eyebrow, title = _a.title, description = _a.description;
    return (<div className="section-head">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>);
}
