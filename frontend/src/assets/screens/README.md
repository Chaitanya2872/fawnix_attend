# App screenshots (product tour device wall)

The ten real mobile-app captures live in **this folder** and appear
automatically in the product tour, inside the _"Explore the workspace"_
section. No code changes are needed — the gallery globs this directory at
build time, so replacing a file is enough to update the tour.

## Accepted files

`*.png`, `*.jpg`, `*.jpeg`, `*.webp`, `*.avif`

## Naming

A file binds to a screen when the screen's slug appears anywhere in the file
name. Anything unmatched is assigned in file-name order, so simple numbering
works too.

| #   | Slug           | Screen                                    |
| --- | -------------- | ----------------------------------------- |
| 01  | `clockout`     | Clock out + live shift hours              |
| 02  | `assistant`    | Fawnix Assistant chat                     |
| 03  | `team`         | My team, with the date picker             |
| 04  | `explore`      | Explore menu (tools, requests, documents) |
| 05  | `exception`    | Attendance exceptions list                |
| 06  | `compoff`      | Comp off / overtime records               |
| 07  | `notification` | Notifications feed                        |
| 08  | `meeting`      | Meeting note — name & add audio           |
| 09  | `holiday`      | Holiday calendar                          |
| 10  | `leave`        | Leaves + leave balance                    |

Currently shipped: `01-clockout.jpg`, `02-assistant.jpg`, … `10-leave.jpg`.

## Guidance

- Portrait phone captures, ideally **1170 × 2532** (or any 9:19.5-ish ratio).
- The frame crops from the top, so keep the important content high.
- Screenshots that already include the phone status bar are fine — the mock
  status bar and notch are only drawn when no screenshot is present.
- Keep each file under ~400 KB where possible; they ship in the bundle.
- Replacing a screen is a straight file swap: keep the slug in the name and the
  wall picks it up on the next build.

Screens without a screenshot keep rendering their animated placeholder, so the
tour always looks complete while files are being added one at a time.
