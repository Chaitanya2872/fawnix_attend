# Employee Edit/Update API

## Overview
New endpoints added to allow editing and updating employee details. HR/Admin users can now view and modify employee information.

## API Endpoints

### 1. Get Employee Details
**Endpoint:** `GET /api/users/{emp_code}`

**Headers:**
```
Authorization: Bearer <token>
```

**Example:**
```bash
curl -X GET http://localhost:5000/api/users/EMP001 \
  -H "Authorization: Bearer <your_token>"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "employee": {
      "id": 1,
      "emp_code": "EMP001",
      "emp_full_name": "Anusha Datti",
      "emp_email": "anusha.d@acstechnologies.co.in",
      "emp_contact": "6301561765",
      "emp_designation": "Software Engineer",
      "emp_department": "Software",
      "emp_manager": "EMP002",
      "emp_grade": "A",
      "emp_shift_id": 1,
      "emp_joined_date": "2023-01-15",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00"
    },
    "user": {
      "role": "employee",
      "is_active": true
    }
  }
}
```

**Error Responses:**
- 404: `{"success": false, "message": "Employee not found"}`
- 500: `{"success": false, "message": "Internal server error"}`

---

### 2. Update Employee Details
**Endpoint:** `PUT /api/users/{emp_code}`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body (all fields optional):**
```json
{
  "emp_full_name": "Anusha Datti Updated",
  "emp_contact": "9876543210",
  "emp_email": "anusha.new@acstechnologies.co.in",
  "emp_designation": "Senior Software Engineer",
  "emp_department": "Software",
  "emp_manager": "EMP002",
  "emp_grade": "B",
  "emp_shift_id": 2
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "id": 1,
    "emp_code": "EMP001",
    "emp_full_name": "Anusha Datti Updated",
    "emp_email": "anusha.new@acstechnologies.co.in",
    "emp_contact": "9876543210",
    "emp_designation": "Senior Software Engineer",
    "emp_department": "Software",
    "emp_manager": "EMP002",
    "emp_grade": "B",
    "emp_shift_id": 2,
    "emp_joined_date": "2023-01-15",
    "created_at": "2024-01-15 10:30:00",
    "updated_at": "2024-04-07 15:45:00"
  }
}
```

**Error Responses:**
- 400: `{"success": false, "message": "emp_code is required"}`
- 400: `{"success": false, "message": "No fields to update"}`
- 400: `{"success": false, "message": "No valid fields to update"}`
- 400: `{"success": false, "message": "Cannot update protected field: emp_code"}`
- 403: `{"success": false, "message": "Access denied"}`
- 404: `{"success": false, "message": "Employee not found"}`
- 409: `{"success": false, "message": "Email 'email@company.com' is already in use"}`
- 500: `{"success": false, "message": "Internal server error"}`

---

## Usage Examples

### Example 1: View Employee Profile
```bash
curl -X GET http://localhost:5000/api/users/EMP001 \
  -H "Authorization: Bearer <your_token>"
```

### Example 2: Update Employee Name and Designation
```bash
curl -X PUT http://localhost:5000/api/users/EMP001 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "emp_full_name": "Anusha Datti",
    "emp_designation": "Senior Software Engineer"
  }'
```

### Example 3: Update Contact Information
```bash
curl -X PUT http://localhost:5000/api/users/EMP001 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "emp_contact": "9876543210",
    "emp_email": "anusha.new@acstechnologies.co.in"
  }'
```

### Example 4: Update Manager Assignment
```bash
curl -X PUT http://localhost:5000/api/users/EMP001 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "emp_manager": "EMP002"
  }'
```

### Example 5: Update Department and Grade
```bash
curl -X PUT http://localhost:5000/api/users/EMP001 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "emp_department": "Software",
    "emp_grade": "A"
  }'
```

---

## Updateable Fields

| Field | Type | Description |
|-------|------|-------------|
| `emp_full_name` | String | Employee full name |
| `emp_contact` | String | Contact number |
| `emp_email` | String (unique) | Email address |
| `emp_designation` | String | Job title/designation |
| `emp_department` | String | Department name |
| `emp_manager` | String | Manager emp_code |
| `emp_grade` | String | Grade/Level |
| `emp_shift_id` | Integer | Shift assignment |
| `emp_joined_date` / `emp_joining_date` | Date | Joining date |

---

## Protected Fields

The following fields **cannot** be updated:
- `emp_code` - Employee code is immutable

---

## Security & Validation

✅ **Role-Based Access:** Only users with management permissions (admin, user_manager, hr, devtester) can update employee information

✅ **Email Uniqueness:** Updates validate that new emails are unique across the system

✅ **Transaction Safety:** All updates are atomic with rollback on errors

✅ **Field Validation:** Only known employee table columns are updated

✅ **Audit Trail:** Tracks who updated the employee record

---

## Access Control

The following users **can** update employee details:
- Users with role: `admin`, `user_manager`, `hr`
- Users with designation: `devtester`

All other users will receive a **403 Forbidden** response.