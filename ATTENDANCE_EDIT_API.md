# Attendance Edit API Documentation

## New Endpoints Added

### 1. Get Attendance Record by ID
**Endpoint:** `GET /api/attendance/{attendance_id}`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "employee_email": "emp@company.com",
    "employee_name": "John Doe",
    "phone_number": "9876543210",
    "login_time": "2024-04-07 09:15:00",
    "logout_time": "2024-04-07 18:30:00",
    "login_location": "17.385044, 78.486671",
    "logout_location": "17.385044, 78.486671",
    "login_address": "Office, Hyderabad",
    "logout_address": "Office, Hyderabad",
    "date": "2024-04-07",
    "status": "logged_out",
    "attendance_type": "office",
    "working_hours": 9.25,
    "is_compoff_session": false
  }
}
```

**Error Responses:**
- 400: `{"success": false, "message": "Invalid attendance ID"}`
- 404: `{"success": false, "message": "Attendance record not found"}`

---

### 2. Edit Attendance Record
**Endpoint:** `PUT /api/attendance/{attendance_id}`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body (fields are optional - update only what you need):**
```json
{
  "login_time": "2024-04-07 09:30:00",
  "logout_time": "2024-04-07 18:30:00",
  "login_address": "Office Main Building",
  "logout_address": "Office Annex Building",
  "attendance_type": "office"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Attendance record updated successfully",
  "data": {
    "id": 123,
    "employee_email": "emp@company.com",
    "employee_name": "John Doe",
    "phone_number": "9876543210",
    "login_time": "2024-04-07 09:30:00",
    "logout_time": "2024-04-07 18:30:00",
    "login_location": "17.385044, 78.486671",
    "logout_location": "17.385044, 78.486671",
    "login_address": "Office Main Building",
    "logout_address": "Office Annex Building",
    "date": "2024-04-07",
    "status": "logged_out",
    "attendance_type": "office",
    "working_hours": 9.0,
    "is_compoff_session": false
  }
}
```

**Error Responses:**
- 400: `{"success": false, "message": "Invalid attendance ID"}`
- 400: `{"success": false, "message": "No fields to update"}`
- 400: `{"success": false, "message": "Invalid login_time format. Use YYYY-MM-DD HH:MM:SS"}`
- 400: `{"success": false, "message": "Clock-out time must be after clock-in time"}`
- 400: `{"success": false, "message": "Invalid attendance_type. Must be 'office' or 'site'"}`
- 403: `{"success": false, "message": "Unauthorized. Only HR/CMD/Admin can edit Todays Activity."}`
- 404: `{"success": false, "message": "Attendance record not found"}`

---

## Usage Examples

### Example 1: Correct a Clock-In Time
```bash
curl -X PUT http://localhost:5000/api/attendance/123 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "login_time": "2024-04-07 09:30:00"
  }'
```

### Example 2: Update Both Clock Times and Attendance Type
```bash
curl -X PUT http://localhost:5000/api/attendance/123 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "login_time": "2024-04-07 08:45:00",
    "logout_time": "2024-04-07 17:45:00",
    "attendance_type": "site"
  }'
```

### Example 3: Update Location Addresses
```bash
curl -X PUT http://localhost:5000/api/attendance/123 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "login_address": "Project Site A",
    "logout_address": "Project Site A"
  }'
```

### Example 4: Get Attendance Details
```bash
curl -X GET http://localhost:5000/api/attendance/123 \
  -H "Authorization: Bearer <your_token>"
```

---

## Features

✅ **Update Any Field:** Clock-in time, clock-out time, addresses, attendance type
✅ **Auto-Calculate Working Hours:** When both clock times are updated or one time is updated with an existing counterpart
✅ **Validation:** 
   - Ensures clock-out time is after clock-in time
   - Validates time format (YYYY-MM-DD HH:MM:SS)
   - Validates attendance type (office or site)
✅ **Transaction Safe:** All updates are atomic
✅ **Role-Based Access:** Only HR/CMD/Admin can edit Todays Activity
✅ **Audit Support:** Tracks who updated the record

---

## Field Descriptions

| Field | Format | Description |
|-------|--------|-------------|
| `login_time` | YYYY-MM-DD HH:MM:SS | Clock-in date and time |
| `logout_time` | YYYY-MM-DD HH:MM:SS | Clock-out date and time |
| `login_address` | String | Location/address of clock-in |
| `logout_address` | String | Location/address of clock-out |
| `attendance_type` | office \| site | Type of attendance |

---

## Security Notes

- Only HR/CMD/Admin users can edit Todays Activity
- All input is validated before updating
- Time formats must be YYYY-MM-DD HH:MM:SS (24-hour format)
- Updates are atomic (all-or-nothing transactions)
- Working hours are automatically recalculated when clock times change