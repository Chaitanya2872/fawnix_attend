# Attendance Exceptions API

Base path: `/api/attendance-exceptions`

Auth: all endpoints require the normal bearer token used by the mobile/frontend app.

## 1. Get My Exceptions

`GET /api/attendance-exceptions/my-exceptions`

Optional query params:
- `status`: `pending`, `approved`, `rejected`, `cancelled`
- `type`: `late_arrival`, `early_leave`

Example:

```http
GET /api/attendance-exceptions/my-exceptions?status=pending&type=late_arrival
Authorization: Bearer <token>
```

Example response:

```json
{
  "success": true,
  "data": {
    "exceptions": [
      {
        "id": 12,
        "attendance_id": null,
        "exception_type": "late_arrival",
        "exception_date": "2026-05-26",
        "exception_time": "09:20:00",
        "planned_arrival_time": "10:15",
        "late_by_minutes": null,
        "reason": "Traffic jam",
        "notes": "Heavy rain on ORR",
        "status": "pending",
        "requested_at": "2026-05-26 09:22:10",
        "reviewed_by": null,
        "reviewed_at": null,
        "manager_code": "M001",
        "manager_email": "manager@example.com",
        "manager_remarks": null
      }
    ],
    "count": 1,
    "summary": {
      "pending": 1,
      "approved": 3,
      "rejected": 0,
      "cancelled": 1
    }
  }
}
```

## 2. Get My Late Arrivals

`GET /api/attendance-exceptions/my-late-arrivals`

Optional query params:
- `status`: `pending`, `approved`, `rejected`, `cancelled`, `not_requested`

Example:

```http
GET /api/attendance-exceptions/my-late-arrivals?status=approved
Authorization: Bearer <token>
```

Example response:

```json
{
  "success": true,
  "data": {
    "exceptions": [
      {
        "attendance_id": 45,
        "exception_id": 12,
        "exception_type": "late_arrival",
        "exception_date": "2026-05-26",
        "actual_login_time": "10:25:00",
        "planned_arrival_time": "10:15",
        "late_by_minutes": 25,
        "status": "approved",
        "reason": "Traffic jam",
        "notes": "Heavy rain on ORR",
        "requested_at": "2026-05-26 09:22:10",
        "reviewed_by": "M001",
        "reviewed_at": "2026-05-26 09:40:00",
        "manager_code": "M001",
        "manager_email": "manager@example.com",
        "manager_remarks": "Approved"
      }
    ],
    "count": 1,
    "summary": {
      "pending": 0,
      "approved": 1,
      "rejected": 0,
      "cancelled": 0,
      "not_requested": 2
    }
  }
}
```

Notes:
- This endpoint is attendance-based.
- If the employee clocked in late and no exception was raised, that record is returned with `status: "not_requested"`.

## 3. Get My Early Leaves

`GET /api/attendance-exceptions/my-early-leaves`

Optional query params:
- `status`: `pending`, `approved`, `rejected`, `cancelled`, `not_requested`

Example:

```http
GET /api/attendance-exceptions/my-early-leaves?status=pending
Authorization: Bearer <token>
```

Example response:

```json
{
  "success": true,
  "data": {
    "exceptions": [
      {
        "attendance_id": 78,
        "exception_id": 21,
        "exception_type": "early_leave",
        "exception_date": "2026-05-26",
        "actual_logout_time": "16:20:00",
        "planned_leave_time": "16:30",
        "shift_end_time": "18:30:00",
        "early_by_minutes": 130,
        "status": "pending",
        "reason": "Medical emergency",
        "notes": "Doctor appointment",
        "requested_at": "2026-05-26 15:55:00",
        "reviewed_by": null,
        "reviewed_at": null,
        "manager_code": "M001",
        "manager_email": "manager@example.com",
        "manager_remarks": null
      }
    ],
    "count": 1,
    "summary": {
      "pending": 1,
      "approved": 0,
      "rejected": 0,
      "cancelled": 0,
      "not_requested": 0
    }
  }
}
```

Notes:
- This endpoint is attendance-based.
- If the employee left early without submitting an exception, that record is returned with `status: "not_requested"`.

## 4. Cancel Late Arrival

`POST /api/attendance-exceptions/late-arrival/cancel`

Request body:

```json
{
  "exception_id": 12
}
```

Success response:

```json
{
  "success": true,
  "message": "Late arrival exception cancelled successfully",
  "data": {
    "exception_id": 12,
    "attendance_id": null,
    "exception_type": "late_arrival",
    "status": "cancelled",
    "planned_arrival_time": "10:15",
    "late_by_minutes": 25,
    "cancelled_at": "2026-05-26 09:35:00"
  }
}
```

Common error responses:

```json
{
  "success": false,
  "message": "exception_id is required"
}
```

```json
{
  "success": false,
  "message": "Only pending late arrival requests can be cancelled. Current status: approved"
}
```

## 5. Cancel Early Leave

`POST /api/attendance-exceptions/early-leave/cancel`

Request body:

```json
{
  "exception_id": 21
}
```

Success response:

```json
{
  "success": true,
  "message": "Early leave exception cancelled successfully",
  "data": {
    "exception_id": 21,
    "attendance_id": 78,
    "exception_type": "early_leave",
    "status": "cancelled",
    "planned_leave_time": "16:30",
    "early_by_minutes": 130,
    "cancelled_at": "2026-05-26 15:58:00"
  }
}
```

Common error responses:

```json
{
  "success": false,
  "message": "exception_id is required"
}
```

```json
{
  "success": false,
  "message": "Only pending early leave requests can be cancelled. Current status: approved"
}
```

## Status Values

- `pending`: submitted, waiting for manager action
- `approved`: approved by manager
- `rejected`: rejected by manager
- `cancelled`: cancelled by employee before approval
- `not_requested`: attendance was late/early, but no exception request existed for that attendance
