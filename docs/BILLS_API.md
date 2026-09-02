# Bills API

Base path: `/bills`

Endpoints (examples use `http://localhost:5000`):

- Upload a bill file

```
curl -X POST "http://localhost:5000/bills/upload" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/bill.pdf"
```

- Create a bill (JSON)

```
curl -X POST "http://localhost:5000/bills/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"employee_id": 123, "amount": 1500, "date": "2026-09-01", "file_meta": {"file_path": "/uploads/bills/tst.bin"}}'
```

- Get a bill by id

```
curl -X GET "http://localhost:5000/bills/42" -H "Authorization: Bearer <token>"
```

- List bills by employee

```
curl -X GET "http://localhost:5000/bills?employee_id=123&limit=50" -H "Authorization: Bearer <token>"
```

- Approve a bill at a stage (HR review example)

```
curl -X POST "http://localhost:5000/bills/42/approve" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"approved","stage":"hr_review","comments":"HR validated receipts"}'
```

- List pending bills for a stage

```
curl -X GET "http://localhost:5000/bills/pending?stage=finance_approve" -H "Authorization: Bearer <token>"
```

Notes:
- The API requires authentication via `Authorization: Bearer <token>` header.
- Stage values: `hr_review`, `finance_approve`, `cfo`, `cmd`.
- Designation-based permissions are enforced: HR handles `hr_review`, Finance handles `finance_approve`, and so on. Admin role bypasses designation checks.
