# External CRM Leads API — Frontend Integration

This guide is for a web or mobile frontend that calls the external CRM lead service directly.

> Do not hardcode access tokens in the application. Obtain the token through the configured SSO flow and send it with each request.

## Base request format

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Use `multipart/form-data` instead of JSON for imports and contact-recording uploads.

Set the API base URL from environment-specific configuration, for example:

```text
CRM_API_BASE_URL=https://<crm-host>
```

## Lead endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/leads` | List, search, and filter leads |
| `GET` | `/api/leads/{id}` | Get a lead, including remarks, activities, recordings, and history |
| `POST` | `/api/leads` | Create a lead |
| `PATCH` | `/api/leads/{id}` | Partially update a lead |
| `DELETE` | `/api/leads/{id}` | Delete a lead |
| `PATCH` | `/api/leads/{id}/status` | Update status and follow-up |
| `PATCH` | `/api/leads/{id}/assign` | Assign or reassign a lead |
| `PATCH` | `/api/leads/{id}/priority` | Update priority |
| `POST` | `/api/leads/import` | Bulk import leads |
| `POST` | `/api/leads/{id}/contact-recordings` | Upload contact-call audio |
| `POST` | `/api/leads/{id}/remarks` | Add a remark |
| `PATCH` | `/api/leads/{id}/remarks/{remarkId}` | Edit a remark |
| `GET` | `/api/leads/{id}/questionnaire` | Get the WhatsApp questionnaire |
| `GET` | `/api/leads/notifications` | Get notification counts |
| `GET` | `/api/leads/notifications/stream` | Subscribe to server-sent notification events |

## List leads

```http
GET /api/leads?search=&status=ALL&source=ALL&priority=ALL&assignedTo=&questionnaireStatus=ALL&page=1&pageSize=10
```

Supported query parameters:

| Parameter | Values / format |
| --- | --- |
| `search` | Free-text search |
| `status` | `NEW`, `CONTACTED`, `FOLLOW_UP`, `QUALIFIED`, `UNQUALIFIED`, `ASSIGNED_TO_SALESPERSON`, `PROPOSAL_SENT`, `CONVERTED`, `LOST`, or `ALL` |
| `source` | `WEBSITE`, `REFERRAL`, `COLD_CALL`, `EMAIL`, `SOCIAL`, `EVENT`, `OTHER`, or `ALL` |
| `priority` | `LOW`, `MEDIUM`, `HIGH`, or `ALL` |
| `assignedTo` | Assigned user identifier/name, as defined by CRM |
| `questionnaireStatus` | CRM questionnaire status |
| `page` | 1-based page number; default `1` |
| `pageSize` | Page size; default `10` |

Expected response:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pageSize": 10,
  "totalPages": 0,
  "summary": {
    "totalPipelineValue": 0,
    "newCount": 0,
    "qualifiedCount": 0,
    "convertedCount": 0,
    "statusCounts": {}
  }
}
```

## Create a lead

```http
POST /api/leads
```

```json
{
  "name": "Anita Sharma",
  "company": "Acme Pvt Ltd",
  "email": "anita@acme.com",
  "phone": "+919876543210",
  "source": "WEBSITE",
  "status": "NEW",
  "priority": "HIGH",
  "assignedTo": "Sales Representative",
  "assignedToUserId": "user-id",
  "estimatedValue": 250000,
  "notes": "Requested a product demo.",
  "tags": ["enterprise", "hot"],
  "followUpAt": "2026-07-28T10:00:00Z",
  "projectStage": "Evaluation",
  "expectedTimeline": "30 days",
  "propertyType": "Commercial",
  "projectLocation": "Bengaluru"
}
```

Confirmed required fields: `name`, `company`. Validate the remaining fields in the frontend according to CRM error responses until the complete CRM schema is available.

## Uploads

### Bulk import

```http
POST /api/leads/import
Content-Type: multipart/form-data
```

Form field: `file`.

```json
{
  "total": 90,
  "updated": 5,
  "skipped": 5,
  "errors": [
    { "row": 12, "message": "Email is invalid." }
  ]
}
```

### Contact recording

```http
POST /api/leads/{id}/contact-recordings
Content-Type: multipart/form-data
```

| Form field | Required | Format |
| --- | --- | --- |
| `audio` | Yes | Audio file |
| `contactedAt` | No | ISO-8601 timestamp |

## Lead schedules

| Method | Endpoint |
| --- | --- |
| `GET` | `/api/leads/{leadId}/schedules` |
| `POST` | `/api/leads/{leadId}/schedules` |
| `PATCH` | `/api/leads/{leadId}/schedules/{scheduleId}` |

Create-schedule request:

```json
{
  "type": "DEMO_VISIT",
  "scheduledAt": "2026-07-30T10:00:00Z",
  "title": "Product demonstration",
  "durationMinutes": 60,
  "callType": "VIDEO_CALL"
}
```

Confirmed enum values from the supplied contract:

- `type`: `SITE_VISIT`, `DEMO_VISIT` (the source text is truncated after these values)
- `mode`: `IN_PERSON`, `ONLINE`, `ON_SITE`, `REMOTE`
- `callType`: `PHONE`, `WHATSAPP`, `VIDEO_CALL`

## Authorization

- Authenticated users can list leads.
- Creating and deleting leads requires `ADMIN` or `SALES_MANAGER`.
- Viewing a specific lead is allowed for the assigned user or an authorized lead manager.

## Using the Fawnix backend instead of the CRM directly

The current Fawnix backend only proxies a smaller lead API surface:

| Fawnix endpoint | External CRM call |
| --- | --- |
| `POST /api/leads` | `POST /api/leads` |
| `GET /api/leads` | `GET /api/leads` |
| `GET /api/leads/{id}` | `GET /api/leads/{id}` |
| `PATCH /api/leads/{id}` | `PATCH /api/leads/{id}` through the Fawnix proxy |
| `POST /api/leads/{id}/link-field-visit` | CRM field-visit link endpoint used by Fawnix; it is not documented in the supplied CRM contract |

For direct CRM integration, use the CRM endpoints and `PATCH` methods above. For Fawnix-mediated integration, use only the Fawnix endpoints currently implemented. The Fawnix list route also overrides `assignedTo` with the logged-in employee's email, so it is intentionally self-scoped.

## Items to confirm with the CRM owner

The supplied source contains incomplete request bodies for status, assignment, priority, and remarks. Confirm their exact JSON payloads before implementing those mutations; this guide does not infer undocumented fields.
