# Meeting Notes API

Base path: `/api/meeting-notes`

Auth: all endpoints require the normal bearer token used by the app.

## 1. List Meeting Notes

`GET /api/meeting-notes`

Optional query params:
- `status`: optional status filter
- `limit`: optional max records, default `50`, max `100`

Example:

```http
GET /api/meeting-notes?status=generated&limit=25
Authorization: Bearer <token>
```

Example response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "meeting_note_id": "mn_001",
        "status": "generated",
        "provider": "gemini",
        "file_name": "weekly-sync.mp3",
        "meeting_title": "Weekly Sync",
        "language": "en",
        "transcript": "Speaker 1: ...",
        "summary": "- Summary point 1",
        "minutes_of_meeting": "# Minutes of Meeting\n...",
        "important_points": [
          "Point 1",
          "Point 2"
        ],
        "audio_storage": {
          "provider": "s3"
        },
        "report_storage": {
          "provider": "s3"
        },
        "generated_at": "2026-07-14T10:00:00",
        "created_at": "2026-07-14T09:45:00",
        "updated_at": "2026-07-14T10:00:00",
        "error_message": null
      }
    ],
    "count": 1,
    "total_count": 1,
    "limit": 25,
    "status_filter": "generated"
  }
}
```

Notes:
- Records are limited to the logged-in employee.
- Results are ordered by `created_at DESC`.

## 2. Get One Meeting Note

`GET /api/meeting-notes/<meeting_note_id>`

Example:

```http
GET /api/meeting-notes/mn_detail_001
Authorization: Bearer <token>
```

Example response:

```json
{
  "success": true,
  "data": {
    "meeting_note_id": "mn_detail_001",
    "status": "generated",
    "provider": "gemini",
    "file_name": "meeting.mp3",
    "meeting_title": "Client Call",
    "language": "en",
    "transcript": "Speaker 1: ...",
    "summary": "- Summary point 1",
    "minutes_of_meeting": "# Minutes of Meeting\n...",
    "important_points": [
      "Decision confirmed",
      "Follow-up required"
    ],
    "audio_storage": {
      "provider": "s3"
    },
    "report_storage": {
      "provider": "s3"
    },
    "generated_at": "2026-07-14T10:00:00",
    "created_at": "2026-07-14T09:45:00",
    "updated_at": "2026-07-14T10:00:00",
    "error_message": null
  }
}
```

Common error response:

```json
{
  "success": false,
  "message": "Meeting note not found"
}
```

## 3. Upload Audio Only

`POST /api/meeting-notes/upload`

Content type: `multipart/form-data`

Form fields:
- `audio`: required audio file
- `meeting_title`: optional title
- `language`: optional language hint

Example response:

```json
{
  "success": true,
  "message": "Audio uploaded successfully",
  "data": {
    "meeting_note_id": "mn_001",
    "file_name": "meeting.mp3",
    "meeting_title": "Weekly Sync",
    "language": "en",
    "audio_storage": {
      "provider": "s3"
    },
    "status": "uploaded"
  }
}
```

Notes:
- This only uploads the source audio and creates a saved record.
- It does not generate transcript or minutes by itself.

## 4. Generate From New Upload

`POST /api/meeting-notes/generate`

Content type: `multipart/form-data`

Form fields:
- `audio`: required audio file
- `meeting_title`: optional title
- `language`: optional language hint for transcription
- `wait`: optional boolean

Behavior:
- `wait=true`: generate synchronously in the request
- `wait=false` or omitted: upload audio, queue background generation, and return immediately

Example synchronous success response:

```json
{
  "success": true,
  "message": "Meeting notes generated successfully",
  "data": {
    "provider": "gemini",
    "file_name": "meeting.mp3",
    "meeting_title": "Weekly Sync",
    "transcript": "Speaker 1: ...",
    "summary": "- Summary point 1",
    "minutes_of_meeting": "# Minutes of Meeting\n...",
    "important_points": [
      "Action assigned",
      "Decision logged"
    ],
    "audio_storage": {
      "provider": "s3"
    },
    "report_storage": {
      "provider": "s3"
    }
  }
}
```

Example queued response:

```json
{
  "success": true,
  "message": "Meeting notes generation queued",
  "data": {
    "meeting_note_id": "mn_001",
    "provider": "gemini",
    "job_id": "job_001",
    "job_status": "queued"
  }
}
```

## 5. Generate From Saved Upload

`POST /api/meeting-notes/generate`

Content type: `application/json`

Request body:
- `meeting_note_id`: required saved meeting note id
- `wait`: optional boolean
- `force`: optional boolean

Example request:

```json
{
  "meeting_note_id": "mn_001",
  "wait": false,
  "force": false
}
```

Behavior:
- `wait=true`: process the saved uploaded audio synchronously
- `wait=false`: queue background generation
- `force=true`: supersede an active queued or stale processing job when allowed

Example queued response:

```json
{
  "success": true,
  "message": "Meeting notes generation queued",
  "data": {
    "meeting_note_id": "mn_001",
    "status": "queued",
    "provider": "gemini",
    "file_name": "meeting.mp3",
    "meeting_title": "Weekly Sync",
    "language": "en",
    "transcript": null,
    "summary": null,
    "minutes_of_meeting": null,
    "important_points": [],
    "audio_storage": {
      "provider": "s3"
    },
    "report_storage": null,
    "generated_at": null,
    "created_at": "2026-07-14T09:45:00",
    "updated_at": "2026-07-14T09:46:00",
    "error_message": null,
    "job_id": "job_001",
    "job_status": "queued"
  }
}
```

Example already-active response:

```json
{
  "success": true,
  "message": "Meeting notes generation is already queued",
  "data": {
    "meeting_note_id": "mn_001",
    "job_id": "job_001",
    "job_status": "queued"
  }
}
```

Example force-conflict response:

```json
{
  "success": false,
  "message": "Meeting notes generation is actively processing and cannot be force re-queued yet",
  "data": {
    "meeting_note_id": "mn_001",
    "job_id": "job_001",
    "job_status": "processing"
  }
}
```

## Response Payload Fields

Meeting note records are returned with these fields:
- `meeting_note_id`
- `status`
- `provider`
- `file_name`
- `meeting_title`
- `language`
- `transcript`
- `summary`
- `minutes_of_meeting`
- `important_points`
- `audio_storage`
- `report_storage`
- `generated_at`
- `created_at`
- `updated_at`
- `error_message`

Queued generation responses may also include:
- `job_id`
- `job_status`

## Status Values

Meeting note record statuses:
- `uploaded`
- `queued`
- `processing`
- `generated`
- `failed`

Job statuses:
- `queued`
- `processing`
- `retrying`
- `completed`
- `failed`

## Common Error Responses

Missing meeting note id:

```json
{
  "success": false,
  "message": "meeting_note_id is required"
}
```

Missing audio file:

```json
{
  "success": false,
  "message": "audio file is required"
}
```

Unsupported extension:

```json
{
  "success": false,
  "message": "Unsupported audio format. Allowed formats: mp3, wav, m4a"
}
```

Feature disabled:

```json
{
  "success": false,
  "message": "Meeting notes feature is disabled"
}
```

AI provider not configured:

```json
{
  "success": false,
  "message": "Meeting notes AI is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY first."
}
```

S3 not configured for upload endpoints:

```json
{
  "success": false,
  "message": "S3 is not configured"
}
```
