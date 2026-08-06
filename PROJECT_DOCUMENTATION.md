# Fawnix Attend Project Documentation

## 1. Project Overview

Fawnix Attend is a monolithic employee attendance and workforce management system.
It contains:

- A Flask backend API.
- A PostgreSQL database layer with versioned SQL migrations.
- A React + TypeScript + Vite frontend for public pages and the admin dashboard.
- Background schedulers for auto clock-out and attendance reminders.
- Integrations for WhatsApp OTP, Firebase push notifications, CRM leads, S3 storage, and meeting-note AI processing.

The application supports employee authentication, attendance, activities, leaves, attendance exceptions, comp-off, field visits, location tracking, reports, lead integration, and admin operations.

## 2. Technology Stack

### Backend

- Python 3.11
- Flask 3
- Flask-CORS
- Gunicorn
- PostgreSQL
- psycopg2
- PyJWT
- APScheduler
- Firebase Admin SDK
- boto3
- reportlab and openpyxl for reports
- optional AI/audio dependencies for meeting notes

### Frontend

- React 19
- TypeScript
- Vite 8
- React Router
- Leaflet for map views
- ESLint

### Infrastructure

- Docker
- Docker Compose
- Nginx reverse proxy
- PostgreSQL container
- Gunicorn production server

## 3. Repository Structure

```text
fawnix_attend/
  app.py                         Flask app bootstrap and route registration
  run.py                         Local development runner
  config.py                      Environment-driven configuration
  requirements.txt               Python dependencies
  Dockerfile                     Production image build
  docker-compose.yml             App, PostgreSQL, worker, and Nginx stack
  nginx/default.conf             Reverse proxy configuration

  routes/                        Flask blueprints and API endpoints
    auth.py
    attendance.py
    activities.py
    admin.py
    leaves.py
    attendance_exceptions.py
    compoff.py
    tracking.py
    distance.py
    location.py
    leads.py
    meeting_notes.py
    teams.py
    project_teams.py

  services/                      Business logic and integrations
    auth_service.py
    attendance_service.py
    activity_service.py
    admin_service.py
    leaves_service.py
    attendance_exceptions_service.py
    auto_clockout_service.py
    field_visit_service.py
    lead_service.py
    meeting_notes_service.py
    notification_service.py
    fcm_service.py
    whatsapp_service.py
    s3_storage_service.py

  database/
    connection.py                Connection pool, bootstrap, migrations
    migrations/                  Versioned SQL migrations

  middleware/                    Auth, logging, admin, and error middleware
  schedulers/                    Attendance reminder scheduler helpers
  scripts/                       Worker and scheduler scripts
  tests/                         Backend test suite

  frontend/
    src/
      app/                       Router and providers
      components/                Shared React components
      features/public/           Home page
      features/privacy/          Privacy policy
      features/admin/            Admin dashboard and pages
      services/                  Frontend storage helpers
      types/                     Shared TypeScript types
      utils/                     Frontend utility functions
```

## 4. Main Application Flow

1. The Flask application starts from `app.py`.
2. Configuration is loaded from environment variables in `config.py`.
3. Database bootstrap and migrations run on startup.
4. Flask blueprints from `routes/` are registered under `/api/...`.
5. The Vite frontend build in `frontend/dist` is served by Flask in production.
6. In development, Vite serves the frontend and proxies `/api` and `/health` to Flask.
7. Background scheduler jobs run auto clock-out and attendance reminder workflows.

## 5. Local Development Setup

### Backend Setup

```powershell
cd C:\Users\USER\Desktop\fawnix_attend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

The backend runs on:

```text
http://localhost:5000
```

Useful backend checks:

```powershell
Invoke-WebRequest http://localhost:5000/health
Invoke-WebRequest http://localhost:5000/api/docs
```

### Frontend Setup

```powershell
cd C:\Users\USER\Desktop\fawnix_attend\frontend
npm install
npm run dev
```

The frontend usually runs on:

```text
http://localhost:5173
```

The Vite proxy sends `/api` and `/health` requests to:

```text
http://localhost:5000
```

You can override this with:

```env
VITE_API_PROXY_TARGET=http://localhost:5000
```

or:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### Production-Style Local Build

```powershell
cd C:\Users\USER\Desktop\fawnix_attend\frontend
npm run build

cd C:\Users\USER\Desktop\fawnix_attend
python run.py
```

When `frontend/dist/index.html` exists, Flask serves the frontend directly.

## 6. Docker Setup

Start the complete stack:

```powershell
docker compose up -d --build
```

Services:

- `postgres`: PostgreSQL 14 database.
- `app`: Flask + Gunicorn app.
- `meeting_notes_worker`: background meeting-notes queue worker.
- `nginx`: reverse proxy on port `80`.

Check logs:

```powershell
docker compose logs -f app
docker compose logs -f meeting_notes_worker
```

Stop services:

```powershell
docker compose down
```

## 7. Environment Variables

The app reads `.env` from the project root and environment variables supplied by Docker or the host.

### Core

```env
DEBUG=True
PORT=5000
SECRET_KEY=change-me
JWT_SECRET_KEY=change-me
JWT_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Database

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=Intimation
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

### Attendance

```env
DEFAULT_SHIFT_START=09:00
DEFAULT_SHIFT_END=18:00
LOGOUT_ALERT_TIME=18:40
ATTENDANCE_REMINDER_TIME=09:55
LUNCH_REMINDER_TIME=13:25
LATE_ARRIVAL_GRACE_PERIOD=15
LATE_LOGIN_CUTOFF=10:15
MAX_WORKING_HOURS=12
```

### Auto Clock-Out Scheduler

```env
RUN_SCHEDULER=true
AUTO_CLOCKOUT_SCHEDULE_MODE=production
AUTO_CLOCKOUT_PRODUCTION_TIMES=18:30,23:59
AUTO_CLOCKOUT_TEST_TIMES=03:00
AUTO_CLOCKOUT_TIMEZONE=Asia/Kolkata
AUTO_CLOCKOUT_MISFIRE_GRACE_SECONDS=900
AUTO_CLOCKOUT_MAX_INSTANCES=1
AUTO_CLOCKOUT_COALESCE=true
AUTO_CLOCKOUT_ENFORCE_SINGLE_PROCESS=true
```

### WhatsApp, Firebase, and Notifications

```env
FEATURE_WHATSAPP_OTP=True
WHATSAPP_TOKEN=
PHONE_NUMBER_ID=
WHATSAPP_TEMPLATE_NAME=sending_otp
FIREBASE_CREDENTIALS_JSON=
FCM_ENABLED=False
AWAY_ALERT_COOLDOWN_MINUTES=5
```

### Meeting Notes

```env
FEATURE_MEETING_NOTES=True
GEMINI_API_KEY=
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
MEETING_NOTES_MAX_UPLOAD_MB=100
MEETING_NOTES_QUEUE_POLL_SECONDS=5
MEETING_NOTES_QUEUE_MAX_RETRIES=3
MEETING_NOTES_QUEUE_RETRY_DELAY_SECONDS=30
```

### S3 Storage for Meeting Notes

```env
MEETING_NOTES_S3_BUCKET=
MEETING_NOTES_S3_REGION=ap-south-1
MEETING_NOTES_AWS_ACCESS_KEY_ID=
MEETING_NOTES_AWS_SECRET_ACCESS_KEY=
MEETING_NOTES_S3_AUDIO_PREFIX=meeting-notes/audio
MEETING_NOTES_S3_REPORT_PREFIX=meeting-notes/generated-reports
```

### CRM Lead Integration

```env
CRM_BASE_URL=https://fawnixverse.acstechnologies.co.in
CRM_TIMEOUT_SECONDS=20
CRM_SERVICE_TOKEN=
CRM_SSO_EXCHANGE_PATH=/api/auth/sso/fawnix
```

## 8. Database and Migrations

Database access is managed in `database/connection.py`.

Startup behavior:

1. `init_database()` creates bootstrap tables required for a fresh database.
2. `run_migrations()` runs SQL files from `database/migrations/` in filename order.
3. Executed migrations are recorded in `schema_migrations`.
4. Failed migrations roll back and stop application startup.

Migration rules:

- Add future schema changes as SQL files in `database/migrations/`.
- Use the next numeric prefix, for example `014_add_example_column.sql`.
- Do not add schema upgrade code inside `init_database()`.
- Keep migrations idempotent where practical.

Current migrations include attendance exceptions, attendance type changes, teams, scheduled notifications, comp-off lifecycle, meeting notes, and API logs.

## 9. Backend API Summary

The live API index is available at:

```text
GET /api/docs
```

### Auth

- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/{session_id}`
- `GET /api/auth/me`
- `GET /api/auth/verse-session`
- `POST /api/auth/account/delete`

### Users and Employees

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/{emp_code}`
- `PUT /api/users/{emp_code}`
- `DELETE /api/users/{emp_code}`
- `GET /api/admin/employees`
- `GET /api/admin/employees/report`

### Attendance

- `POST /api/attendance/login`
- `POST /api/attendance/logout`
- `POST /api/attendance/away`
- `GET /api/attendance/status`
- `GET /api/attendance/history`
- `GET /api/attendance/day-summary`
- `GET /api/attendance/team-status`
- `GET /api/attendance/team-history`
- `GET /api/attendance/team-day-summary`
- `GET /api/attendance/{attendance_id}`
- `PUT /api/attendance/{attendance_id}`

### Admin Attendance and Reports

- `GET /api/admin/attendance/status`
- `GET /api/admin/attendance/history`
- `GET /api/admin/attendance/report`
- `GET /api/admin/attendance/report/daily`
- `GET /api/admin/attendance/report/monthly`
- `GET /api/admin/attendance/summary`
- `GET /api/admin/calendar-summary`
- `GET /api/admin/overtime-records`

### Activities and Field Visits

- `POST /api/activities/start`
- `POST /api/activities/end`
- `GET /api/activities`
- `GET /api/activities/team`
- `GET /api/activities/route/{activity_id}`
- `POST /api/activities/destination/visit`
- `POST /api/activities/break/start`
- `POST /api/activities/break/end`
- `POST /api/activities/track`
- `GET /api/admin/activities`
- `GET /api/admin/field-visits/{field_visit_id}/tracking`

### Location Tracking and Distance

- `POST /api/tracking/track`
- `GET /api/tracking/active`
- `GET /api/tracking/history/{field_visit_id}`
- `GET /api/tracking/summary`
- `GET /api/tracking/route/{field_visit_id}`
- `GET /api/tracking/statistics/{field_visit_id}`
- `GET /api/reports/daily`
- `GET /api/reports/weekly`
- `POST /api/distance/check`
- `GET /api/distance/alerts`
- `POST /api/distance/clear/{attendance_id}`

### Leaves

- `POST /api/leaves/apply`
- `POST /api/leaves/approve`
- `POST /api/leaves/cancel`
- `GET /api/leaves/my-leaves`
- `GET /api/leaves/team-leaves`
- `GET /api/leaves/summary`
- `GET /api/admin/leaves`
- `POST /api/admin/leaves/import`

### Attendance Exceptions and Approvals

- `POST /api/attendance-exceptions/late-arrival`
- `POST /api/attendance-exceptions/early-leave`
- `POST /api/attendance-exceptions/early-leave/cancel`
- `POST /api/attendance-exceptions/late-arrival/cancel`
- `POST /api/attendance-exceptions/approve`
- `GET /api/attendance-exceptions/my-exceptions`
- `GET /api/attendance-exceptions/my-late-arrivals`
- `GET /api/attendance-exceptions/my-early-leaves`
- `GET /api/attendance-exceptions/team-exceptions`
- `GET /api/admin/team-exceptions`
- `GET /api/admin/late-arrivals`
- `GET /api/admin/early-leaves`
- `GET /api/admin/attendance-exceptions`
- `POST /api/approvals/late-arrival/request`
- `POST /api/approvals/early-leave/request`
- `POST /api/approvals/approve`
- `GET /api/approvals/my-requests`
- `GET /api/approvals/team-requests`

### Comp-Off

- `POST /api/compoff/scan-attendance`
- `GET /api/compoff/overtime-records`
- `POST /api/compoff/request`
- `GET /api/compoff/my-requests`
- `GET /api/compoff/my-avail-requests`
- `POST /api/compoff/approve`
- `POST /api/compoff/cancel`
- `POST /api/compoff/avail-request`
- `POST /api/compoff/approve-avail`
- `GET /api/compoff/balance`
- `GET /api/compoff/team-requests`
- `GET /api/compoff/team-avail-requests`
- `GET /api/compoff/config`
- `POST /api/compoff/process-expiry`
- `GET /api/compoff/statistics`

### Holidays, Teams, Leads, Devices, and Meeting Notes

- `GET /api/holidays`
- `GET /api/holidays/years`
- `POST /api/teams`
- `PUT /api/teams/{team_id}`
- `POST /api/project-teams`
- `PUT /api/project-teams/{project_team_id}`
- `POST /api/leads`
- `GET /api/leads`
- `GET /api/leads/{lead_id}`
- `PATCH /api/leads/{lead_id}`
- `POST /api/leads/{lead_id}/link-field-visit`
- `POST /api/devices/register`
- `POST /api/devices/deactivate`
- `GET /api/meeting-notes`
- `GET /api/meeting-notes/{meeting_note_id}`
- `POST /api/meeting-notes/upload`
- `POST /api/meeting-notes/generate`

### Admin Notifications and Telemetry

- `POST /api/admin/test-push`
- `POST /api/admin/scheduled-notifications/trigger`
- `GET /api/admin/scheduled-notifications/candidates`
- `POST /api/admin/scheduled-notifications`
- `GET /api/admin/scheduled-notifications`
- `GET /api/admin/scheduled-notifications/logs`
- `GET /api/admin/api-logs`

## 10. Frontend Routes and Screens

### Public Routes

- `/` - public home page.
- `/privacy-policy` - privacy policy.
- `/privacy` - redirects to `/privacy-policy`.

### Admin Routes

- `/admin` - dashboard overview.
- `/admin/employees` - employee list, edit, create, delete, import, export.
- `/admin/attendance` - today's activities/attendance view.
- `/admin/attendance-records` - attendance records.
- `/admin/leaves` - leave records and filters.
- `/admin/activities` - activity records and filters.
- `/admin/field-visits` - field visit tracking and map details.
- `/admin/calendar` - calendar view.
- `/admin/attendance-exceptions` - late arrival and early leave exceptions.
- `/admin/reports` - reports and analytics.
- `/admin/api-telemetry` - API log inspection.

The admin sidebar is configured in:

```text
frontend/src/features/admin/config/sidebar.ts
```

The admin panel routing map is inside:

```text
frontend/src/features/admin/pages/FawnixApp.tsx
```

## 11. Feature Modules

### Authentication

Employees request an OTP, verify it, receive an access token and refresh token, and then access protected endpoints with:

```http
Authorization: Bearer <access_token>
```

Admin pages use the same API auth flow and automatically refresh the session where possible.

### Attendance

Attendance supports:

- clock in
- clock out
- GPS coordinates
- geocoded addresses
- attendance type
- working-hour calculation
- day summaries
- admin history and reports
- manual attendance edit APIs
- away notifications
- automatic clock-out

### Activities

Activities support:

- starting and ending activities
- break start/end
- field visit linkage
- route/tracking data
- admin activity log filters

### Leaves

Leaves support:

- applying for leave
- manager approval/rejection
- cancellation
- team leave views
- summary and balance calculations
- late-arrival LOP calculations
- admin leave import and filters

### Attendance Exceptions

Attendance exceptions support:

- late arrival request
- early leave request
- cancellation of pending requests
- approval and rejection
- employee and team history
- admin filtering

### Field Visits and Tracking

Field visit tracking supports:

- periodic location points
- active visit lookup
- route history
- distance calculation
- visit statistics
- admin map dialogs

### Meeting Notes

Meeting notes support:

- audio upload
- S3 audio storage
- asynchronous queue processing
- AI transcription and summarization
- generated report storage
- worker process through `scripts/run_meeting_notes_worker.py`

### CRM Leads

Lead endpoints proxy to the configured CRM backend and support linking leads to field visits.

## 12. Background Jobs

### Auto Clock-Out

Implemented in:

```text
services/auto_clockout_service.py
```

Registered in:

```text
app.py
```

Default production schedule:

```text
18:30 and 23:59 Asia/Kolkata
```

The job:

- clocks out active attendance sessions
- closes active activities
- closes active field visits
- calculates comp-off eligibility
- marks records as auto-clocked-out

### Attendance Reminders

Implemented in:

```text
schedulers/attendance_reminder_scheduler.py
```

Default reminder settings are controlled by:

```env
ATTENDANCE_REMINDER_TIME=09:55
LUNCH_REMINDER_TIME=13:25
```

### Meeting Notes Worker

Run manually:

```powershell
python scripts/run_meeting_notes_worker.py
```

Docker Compose also starts it as the `meeting_notes_worker` service.

## 13. Testing and Quality Checks

### Backend Tests

```powershell
pytest
```

Run a single test file:

```powershell
pytest tests/test_leaves.py
```

### Frontend Checks

```powershell
cd frontend
npm run lint
npm run build
```

### Useful Manual Checks

```powershell
Invoke-WebRequest http://localhost:5000/health
Invoke-WebRequest http://localhost:5000/api/docs
Invoke-WebRequest http://localhost:5173/admin
```

## 14. Deployment Notes

The Dockerfile builds the frontend first, copies `frontend/dist` into the Python image, then runs Flask through Gunicorn:

```text
gunicorn --preload -w 4 -b 0.0.0.0:5000 --timeout 300 --graceful-timeout 30 app:app
```

`--preload` is used so startup database bootstrap and migrations run once in the Gunicorn master process before workers fork.

Recommended production requirements:

- strong `SECRET_KEY` and `JWT_SECRET_KEY`
- production PostgreSQL credentials
- HTTPS at Nginx/load-balancer level
- secure CORS policy instead of wildcard origins
- protected Firebase, WhatsApp, S3, AI, and CRM credentials
- persistent logs and database backups

## 15. Common Development Tasks

### Add a New Backend Endpoint

1. Add or update a route in `routes/`.
2. Put business logic in a matching `services/` module.
3. Register a new blueprint in `app.py` if creating a new route module.
4. Add tests in `tests/`.
5. Update this documentation or the relevant feature API doc.

### Add a New Database Change

1. Create `database/migrations/014_short_description.sql`.
2. Use PostgreSQL SQL.
3. Prefer idempotent statements such as `CREATE TABLE IF NOT EXISTS`.
4. Run the app locally and confirm migration success.
5. Add or update tests.

### Add a New Admin Page

1. Add the page under `frontend/src/features/admin/`.
2. Add the sidebar item in `frontend/src/features/admin/config/sidebar.ts`.
3. Update `SidebarId` in `frontend/src/features/admin/types/sidebar.ts`.
4. Add the route mapping and rendering in `FawnixApp.tsx`.
5. Add any API calls through the existing `apiRequest` helper.
6. Run `npm run lint` and `npm run build`.

## 16. Troubleshooting

### Frontend Login Shows "Request Failed" or "Unexpected Error"

Most likely cause: the frontend dev server is running, but the Flask backend is not running or not reachable.

Check backend:

```powershell
Invoke-WebRequest http://localhost:5000/health
```

Start backend:

```powershell
cd C:\Users\USER\Desktop\fawnix_attend
python run.py
```

Then retry the frontend login at:

```text
http://localhost:5173/admin
```

### API Proxy Returns Backend Unavailable

The Vite proxy targets `http://localhost:5000` by default. If the backend runs elsewhere, set:

```env
VITE_API_PROXY_TARGET=http://localhost:<backend-port>
```

### Database Connection Fails

Check PostgreSQL:

```powershell
docker compose ps
```

or test locally:

```powershell
psql -U postgres -d Intimation
```

Verify `.env` database values match the running PostgreSQL instance.

### Migrations Fail on Startup

Check the failed migration filename in logs. The migration will not be recorded in `schema_migrations` until it succeeds, so startup will retry it after the SQL is fixed.

### Auto Clock-Out Does Not Run

Check:

```env
RUN_SCHEDULER=true
AUTO_CLOCKOUT_SCHEDULE_MODE=production
AUTO_CLOCKOUT_TIMEZONE=Asia/Kolkata
```

Also check application logs in:

```text
logs/app.log
```

### Meeting Notes Fail

Check:

- `FEATURE_MEETING_NOTES=True`
- S3 bucket and AWS credentials
- Gemini/OpenAI configuration
- worker logs from `meeting_notes_worker`
- upload file extension and max upload size

## 17. Existing Feature Docs

The repository also includes focused API documentation files:

- `ATTENDANCE_EDIT_API.md`
- `ATTENDANCE_EXCEPTIONS_API.md`
- `EMPLOYEE_EDIT_API.md`
- `TEAM_API_DOCUMENTATION.md`
- `MEETING_NOTES_API.md`
- `EXTERNAL_CRM_LEADS_FRONTEND_API.md`
- `database/migrations/README.md`
- `database/migrations/TRIGGER_SYSTEM.md`

Use those files for detailed request and response examples for specific modules.

