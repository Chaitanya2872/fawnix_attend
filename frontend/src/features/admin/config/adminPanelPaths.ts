import { appRoutes } from '../../../app/config/routes'
import type { SidebarId } from '../../../types/admin'

/**
 * Panel <-> URL mapping, shared by the app shell and the sidebar.
 *
 * The sidebar renders real anchors from this, so nav items can be
 * middle-clicked, opened in a new tab and copied like any other link.
 */
export const adminPanelPathMap: Record<SidebarId, string> = {
  dashboard: "",
  employees: "employees",
  "employee-master-working-units": "employee-master/working-units",
  "employee-master-payroll-units": "employee-master/payroll-units",
  "employee-master-designations": "employee-master/designations",
  "employee-master-departments": "employee-master/departments",
  attendance: "attendance",
  "attendance-records": "attendance-records",
  "attendance-exceptions": "attendance-exceptions",
  "overtime-records": "overtime-records",
  inbox: "inbox",
  calendar: "calendar",
  reports: "reports",
  leaves: "leaves",
  activities: "activities",
  "field-visits": "field-visits",
  "api-telemetry": "api-telemetry",
};

export function getAdminPanelPath(panel: SidebarId) {
  const slug = adminPanelPathMap[panel];
  return slug ? `${appRoutes.admin}/${slug}` : appRoutes.admin;
}

export function getAdminPanelFromPath(pathname: string): SidebarId {
  const normalizedPath = pathname.replace(/\/+$/, "");
  if (normalizedPath === appRoutes.admin) {
    return "dashboard";
  }

  const prefix = `${appRoutes.admin}/`;
  if (!normalizedPath.startsWith(prefix)) {
    return "dashboard";
  }

  const slug = normalizedPath.slice(prefix.length);
  const matched = Object.entries(adminPanelPathMap).find(
    ([, value]) => value === slug,
  );
  return (matched?.[0] as SidebarId | undefined) || "dashboard";
}
