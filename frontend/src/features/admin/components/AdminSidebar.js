"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminSidebar;
var react_1 = require("react");
var SidebarIcon_1 = require("./navigation/SidebarIcon");
var adminPanelPaths_1 = require("../config/adminPanelPaths");
var sidebar_1 = require("../config/sidebar");
require("./AdminSidebar.css");
var COLLAPSE_STORAGE_KEY = 'admin-sidebar-collapsed';
function SidebarChromeIcon(_a) {
    var name = _a.name;
    var paths = {
        search: (<path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>),
        collapse: (<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>),
        'chevron-right': (<path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>),
        plus: (<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>),
        logout: (<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>),
    };
    return (<svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>);
}
function getInitials(name) {
    var parts = (name || 'Admin').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return 'A';
    return parts
        .slice(0, 2)
        .map(function (part) { return part.charAt(0).toUpperCase(); })
        .join('');
}
function AdminSidebar(_a) {
    var profile = _a.profile, activePanel = _a.activePanel, onSelectPanel = _a.onSelectPanel, onLogout = _a.onLogout, badgeCounts = _a.badgeCounts, onSearchClick = _a.onSearchClick, onCollapsedChange = _a.onCollapsedChange, onAddOrgUnit = _a.onAddOrgUnit;
    var _b = (0, react_1.useState)(false), mobileMenuOpen = _b[0], setMobileMenuOpen = _b[1];
    var _c = (0, react_1.useState)(function () {
        if (typeof window === 'undefined')
            return false;
        return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
    }), collapsed = _c[0], setCollapsed = _c[1];
    var _d = (0, react_1.useState)(true), railPreviewEnabled = _d[0], setRailPreviewEnabled = _d[1];
    var _e = (0, react_1.useState)(false), railPreviewOpen = _e[0], setRailPreviewOpen = _e[1];
    var _f = (0, react_1.useState)({ top: 0, height: 0, visible: false }), indicator = _f[0], setIndicator = _f[1];
    var navRef = (0, react_1.useRef)(null);
    var linkRefs = (0, react_1.useRef)(new Map());
    var visibleSections = sidebar_1.sidebarSections
        .map(function (section) { return (__assign(__assign({}, section), { items: section.items.filter(function (item) { return item.id !== 'api-telemetry' || (profile === null || profile === void 0 ? void 0 : profile.emp_code) === sidebar_1.API_TELEMETRY_EMP_CODE; }) })); })
        .filter(function (section) { return section.items.length > 0; });
    var visibleItems = visibleSections.flatMap(function (section) { return section.items; });
    /** An entry owns the active panel if it is that panel, or lists it in matchIds. */
    var ownsActivePanel = function (item) { var _a; return item.id === activePanel || Boolean((_a = item.matchIds) === null || _a === void 0 ? void 0 : _a.includes(activePanel)); };
    var activeItem = visibleItems.find(ownsActivePanel);
    var activeSection = visibleSections.find(function (section) { return section.items.some(ownsActivePanel); });
    (0, react_1.useEffect)(function () {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0');
        onCollapsedChange === null || onCollapsedChange === void 0 ? void 0 : onCollapsedChange(collapsed);
    }, [collapsed, onCollapsedChange]);
    // Glide the active-state rail to whichever nav button is currently active.
    (0, react_1.useLayoutEffect)(function () {
        var navEl = navRef.current;
        var activeEl = activeItem ? linkRefs.current.get(activeItem.id) : undefined;
        if (navEl && activeEl) {
            var navRect = navEl.getBoundingClientRect();
            var elRect = activeEl.getBoundingClientRect();
            setIndicator({
                top: elRect.top - navRect.top + navEl.scrollTop,
                height: elRect.height,
                visible: true,
            });
        }
        else {
            setIndicator(function (prev) { return (__assign(__assign({}, prev), { visible: false })); });
        }
    }, [activePanel, activeItem, mobileMenuOpen, collapsed, visibleItems.length]);
    var handleSelectPanel = function (id) {
        onSelectPanel(id);
        setMobileMenuOpen(false);
    };
    var handleLogout = function () {
        setMobileMenuOpen(false);
        onLogout();
    };
    var handleCollapseToggle = function () {
        if (collapsed) {
            setCollapsed(false);
            setRailPreviewOpen(false);
            setRailPreviewEnabled(true);
            return;
        }
        // Keep the newly collapsed rail compact until the pointer leaves it once.
        setCollapsed(true);
        setRailPreviewOpen(false);
        setRailPreviewEnabled(false);
    };
    var handleRailPointerEnter = function () {
        if (collapsed && railPreviewEnabled)
            setRailPreviewOpen(true);
    };
    var handleRailPointerLeave = function () {
        if (!collapsed)
            return;
        setRailPreviewOpen(false);
        setRailPreviewEnabled(true);
    };
    var handleRailFocus = function () {
        if (collapsed && railPreviewEnabled)
            setRailPreviewOpen(true);
    };
    var handleRailBlur = function (event) {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setRailPreviewOpen(false);
        }
    };
    var profileName = (profile === null || profile === void 0 ? void 0 : profile.emp_full_name) || 'Admin';
    var profileSubtext = (profile === null || profile === void 0 ? void 0 : profile.emp_email) || (profile === null || profile === void 0 ? void 0 : profile.emp_designation) || (profile === null || profile === void 0 ? void 0 : profile.role) || 'Administrator';
    return (<aside className={"sidebar".concat(mobileMenuOpen ? ' sidebar--mobile-open' : '').concat(collapsed ? ' sidebar--rail' : '').concat(railPreviewOpen ? ' sidebar--rail-preview' : '')} onPointerEnter={handleRailPointerEnter} onPointerLeave={handleRailPointerLeave} onFocusCapture={handleRailFocus} onBlurCapture={handleRailBlur}>
      <div className="sidebar-mobile-bar">
        <div className="sidebar-mobile-brand">
          <div className="sidebar-logo" aria-hidden="true">HR</div>
          <div className="sidebar-brand-text">
            <div className="brand-name">Attendance Suite</div>
            <div className="brand-subtitle">Admin console</div>
          </div>
        </div>
        <div className="sidebar-mobile-active">
          <span>Viewing</span>
          <strong>
            {(activeSection === null || activeSection === void 0 ? void 0 : activeSection.title) ? "".concat(activeSection.title, " / ") : ''}
            {(activeItem === null || activeItem === void 0 ? void 0 : activeItem.label) || 'Dashboard'}
          </strong>
        </div>
        <button className="sidebar-mobile-toggle" type="button" aria-label="Open admin navigation" aria-expanded={mobileMenuOpen} onClick={function () { return setMobileMenuOpen(true); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <button className="sidebar-mobile-scrim" type="button" aria-label="Close admin navigation" onClick={function () { return setMobileMenuOpen(false); }}/>

      <div className="sidebar-panel">
        <div className="sidebar-panel-head">
          <div className="sidebar-brand">
            <div className="sidebar-logo" aria-hidden="true">HR</div>
            <div className="sidebar-brand-text">
              <div className="brand-name">Attendance Suite</div>
              <div className="brand-subtitle">Admin console</div>
            </div>
          </div>
          <button className="sidebar-collapse-btn" type="button" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={handleCollapseToggle}>
            <SidebarChromeIcon name="collapse"/>
          </button>
          <button className="sidebar-panel-close" type="button" aria-label="Close admin navigation" onClick={function () { return setMobileMenuOpen(false); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-search-wrap">
          <button className="sidebar-search" type="button" aria-label="Search" data-tip="Search" onClick={onSearchClick}>
            <span className="sidebar-search-icon">
              <SidebarChromeIcon name="search"/>
            </span>
            <span className="sidebar-search-placeholder">Search</span>
            <kbd>Ctrl K</kbd>
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation" ref={navRef}>
          <div className="sidebar-active-rail" style={{
            transform: "translateY(".concat(indicator.top, "px)"),
            height: indicator.height,
            opacity: indicator.visible ? 1 : 0,
        }} aria-hidden="true"/>
          {visibleSections.map(function (section, index) { return (<div className={"sidebar-section".concat(section.title ? '' : ' sidebar-section--primary')} key={section.title || "sidebar-section-".concat(index)}>
              {section.title ? <div className="sidebar-section-label">{section.title}</div> : null}
              <div className="sidebar-group">
                {section.items.map(function (item) {
                var isLive = sidebar_1.SIDEBAR_LIVE_ITEM_IDS.includes(item.id);
                var badgeCount = badgeCounts === null || badgeCounts === void 0 ? void 0 : badgeCounts[item.id];
                var showAddAction = Boolean(item.hasAddAction && onAddOrgUnit);
                return (
                // The row exists so the "+" can be a sibling button rather
                // than nested inside the nav button -- interactive content
                // inside a <button> is invalid and reads unpredictably to
                // assistive tech.
                <div className={"sidebar-link-row".concat(showAddAction ? ' sidebar-link-row--has-action' : '')} key={item.id}>
                      <a href={(0, adminPanelPaths_1.getAdminPanelPath)(item.id)} className={"sidebar-link".concat(ownsActivePanel(item) ? ' active' : '')} data-tip={item.label} aria-current={ownsActivePanel(item) ? 'page' : undefined} onClick={function (event) {
                        // Let the browser handle new-tab/new-window intents;
                        // only take over for a plain left click.
                        if (event.defaultPrevented ||
                            event.button !== 0 ||
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey) {
                            return;
                        }
                        event.preventDefault();
                        handleSelectPanel(item.id);
                    }} ref={function (el) {
                        if (el)
                            linkRefs.current.set(item.id, el);
                        else
                            linkRefs.current.delete(item.id);
                    }}>
                        <span className="sidebar-link-main">
                          <span className="sidebar-link-icon">
                            <SidebarIcon_1.default name={item.icon}/>
                          </span>
                          <span className="sidebar-link-label">{item.label}</span>
                        </span>
                        {isLive ? (<span className="sidebar-live-dot" aria-label="Live"/>) : badgeCount ? (<span className="sidebar-link-badge">{badgeCount}</span>) : null}
                      </a>
                      {showAddAction ? (<button type="button" className="sidebar-link-plus" aria-label={"Add ".concat(item.label.toLowerCase(), " record")} onClick={function () { return onAddOrgUnit === null || onAddOrgUnit === void 0 ? void 0 : onAddOrgUnit(); }}>
                          <SidebarChromeIcon name="plus"/>
                        </button>) : null}
                    </div>);
            })}
              </div>
            </div>); })}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-profile">
            <div className="sidebar-avatar" aria-hidden="true">
              {getInitials(profileName)}
            </div>
            <div className="sidebar-profile-info">
              <strong>{profileName}</strong>
              <span>{profileSubtext}</span>
            </div>
          </div>
          <button className="sidebar-logout-btn" type="button" onClick={handleLogout} title="Log out" aria-label="Log out" data-tip="Log out">
            <SidebarChromeIcon name="logout"/>
          </button>
        </div>
      </div>
    </aside>);
}
