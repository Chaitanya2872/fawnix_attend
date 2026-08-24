import { useEffect, useMemo, useRef, useState } from "react";
import "./AdminTopbar.css";
import { sidebarItems, sidebarSections } from "../config/sidebar";
import type { SidebarId } from "../../../types/admin";

type AdminTopbarProps = {
  activePanel: SidebarId;
  onSelectPanel: (id: SidebarId) => void;
  onRefresh: () => void | Promise<void>;
  /** Resets the "synced" label whenever key shell data changes. */
  syncDeps: unknown[];
};

function prettifyPanelId(id: string) {
  const words = id
    .replace(/^employee-master-/, "")
    .split("-")
    .filter(Boolean);
  if (!words.length) return "Dashboard";
  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
}

export function AdminTopbar({
  activePanel,
  onSelectPanel,
  onRefresh,
  syncDeps,
}: AdminTopbarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [syncLabel, setSyncLabel] = useState("just now");
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Section lookup so the breadcrumb can show "Activities / Exceptions" ──
  const sectionById = useMemo(() => {
    const map = new Map<string, string>();
    sidebarSections.forEach((section) => {
      if (!section.title) return;
      section.items.forEach((item) =>
        map.set(item.id, section.title as string),
      );
    });
    return map;
  }, []);

  const activeItem = sidebarItems.find((item) => item.id === activePanel);
  const pageTitle = activeItem?.label ?? prettifyPanelId(String(activePanel));
  const pageSection = sectionById.get(String(activePanel)) ?? "Workspace";

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sidebarItems.slice(0, 6);
    return sidebarItems
      .filter((item) => {
        const haystack = `${item.label} ${item.groupLabel ?? ""} ${sectionById.get(item.id) ?? ""}`;
        return haystack.toLowerCase().includes(term);
      })
      .slice(0, 7);
  }, [query, sectionById]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSyncLabel("just now");
    const timer = window.setTimeout(() => setSyncLabel("moments ago"), 60000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, syncDeps);

  // ── Ctrl/Cmd + K focuses the jump field ──
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const timeLabel = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const dateLabel = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const closeJump = () => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const selectResult = (id: SidebarId) => {
    onSelectPanel(id);
    closeJump();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      closeJump();
      return;
    }
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => (current + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlight(
        (current) => (current - 1 + results.length) % results.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = results[highlight] ?? results[0];
      if (target) selectResult(target.id);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setSyncLabel("syncing…");
    try {
      await onRefresh();
      setSyncLabel("just now");
    } catch {
      setSyncLabel("retry needed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="shell-topbar">
      <div className="shell-topbar-crumb">
        <span className="shell-topbar-section">{pageSection}</span>
        <span className="shell-topbar-sep" aria-hidden="true" />
        <h1 className="shell-topbar-title">{pageTitle}</h1>
      </div>

      <div
        className={`shell-jump${open ? " is-open" : ""}`}
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setOpen(false);
          }
        }}
      >
        <svg
          className="shell-jump-icon"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="9"
            cy="9"
            r="5.25"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M13.4 13.4L17 17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="shell-jump-list"
          aria-label="Jump to a section"
          placeholder="Jump to a section…"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <kbd className="shell-jump-kbd" aria-hidden="true">
          ⌘K
        </kbd>

        {open ? (
          <div className="shell-jump-menu" id="shell-jump-list" role="listbox">
            {results.length ? (
              results.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={index === highlight}
                  className={`shell-jump-option${index === highlight ? " is-active" : ""}${
                    item.id === activePanel ? " is-current" : ""
                  }`}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectResult(item.id)}
                >
                  <span className="shell-jump-option-label">{item.label}</span>
                  <span className="shell-jump-option-meta">
                    {item.groupLabel ?? sectionById.get(item.id) ?? "Workspace"}
                  </span>
                </button>
              ))
            ) : (
              <p className="shell-jump-empty">
                No section matches “{query.trim()}”
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="shell-topbar-right">
        <div className="shell-clock" title="Local time">
          <span className="shell-clock-dot" aria-hidden="true" />
          <span className="shell-clock-time">{timeLabel}</span>
          <span className="shell-clock-date">{dateLabel}</span>
        </div>

        <span className="shell-sync">Synced {syncLabel}</span>

        <button
          type="button"
          className="shell-refresh"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          title="Refresh data"
        >
          <svg
            className={refreshing ? "shell-refresh-spin" : undefined}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M17 10a7 7 0 1 1-1.5-4.33"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M15.5 3.5l1 2.5 2.5-1"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
}

export default AdminTopbar;
