# Team Management and Project Team Assignment APIs

## Database Schema

### Tables Created

#### teams
```sql
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    description TEXT,
    team_lead_id VARCHAR(50) NOT NULL REFERENCES employees(emp_code),
    created_by VARCHAR(50) NOT NULL REFERENCES employees(emp_code),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### team_members
```sql
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(emp_code),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, employee_id)
);
```

#### project_teams
```sql
CREATE TABLE project_teams (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    team_id INTEGER NOT NULL REFERENCES teams(id),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    assigned_by VARCHAR(50) NOT NULL REFERENCES employees(emp_code),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, team_id)
);
```

### Indexes
```sql
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_employee_id ON team_members(employee_id);
CREATE INDEX idx_project_teams_project_id ON project_teams(project_id);
CREATE INDEX idx_project_teams_team_id ON project_teams(team_id);
```

## API Endpoints

### 1. Create Team
**Endpoint:** `POST /api/teams`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "team_name": "Development Team Alpha",
  "description": "Main development team for project Alpha",
  "team_lead_id": "EMP001",
  "members": ["EMP001", "EMP002", "EMP003"]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Team created successfully",
  "data": {
    "team_id": 1,
    "team_name": "Development Team Alpha",
    "description": "Main development team for project Alpha",
    "team_lead_id": "EMP001",
    "members": ["EMP001", "EMP002", "EMP003"],
    "created_by": "EMP001"
  }
}
```

**Error Responses:**
- 400: `{"success": false, "message": "Team name is required"}`
- 400: `{"success": false, "message": "Team lead must be included in the members list"}`
- 400: `{"success": false, "message": "Invalid team lead ID"}`

### 2. Edit Team
**Endpoint:** `PUT /api/teams/{team_id}`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "team_name": "Development Team Alpha Updated",
  "description": "Updated description",
  "team_lead_id": "EMP002",
  "members": ["EMP002", "EMP003", "EMP004"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Team updated successfully",
  "data": {
    "team_id": 1,
    "team_name": "Development Team Alpha Updated",
    "description": "Updated description",
    "team_lead_id": "EMP002",
    "members": ["EMP002", "EMP003", "EMP004"]
  }
}
```

### 3. Create Project Team Assignment
**Endpoint:** `POST /api/project-teams`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "project_id": 1,
  "team_id": 1,
  "start_date": "2024-01-15",
  "end_date": "2024-06-15"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Team assigned to project successfully",
  "data": {
    "project_team_id": 1,
    "project_id": 1,
    "team_id": 1,
    "start_date": "2024-01-15",
    "end_date": "2024-06-15",
    "status": "active",
    "assigned_by": "EMP001"
  }
}
```

**Error Responses:**
- 409: `{"success": false, "message": "Team is already assigned to this project"}`
- 400: `{"success": false, "message": "End date must be after start date"}`

### 4. Edit Project Team Assignment
**Endpoint:** `PUT /api/project-teams/{project_team_id}`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "team_id": 2,
  "start_date": "2024-02-01",
  "end_date": "2024-07-01",
  "status": "active"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Project team assignment updated successfully",
  "data": {
    "project_team_id": 1,
    "project_id": 1,
    "team_id": 2,
    "start_date": "2024-02-01",
    "end_date": "2024-07-01",
    "status": "active"
  }
}
```

## Validation Rules

1. **Team Creation:**
   - `team_name` is required and non-empty
   - `team_lead_id` must exist in employees table
   - `team_lead_id` must be in the `members` list
   - All `members` must exist in employees table
   - At least one member required

2. **Team Updates:**
   - Same validations as creation
   - Team must exist

3. **Project Team Assignment:**
   - `project_id` and `team_id` must exist
   - `start_date` is required
   - `end_date` must be after `start_date` if provided
   - No duplicate assignments (same team to same project with active status)

4. **Project Team Updates:**
   - Assignment must exist
   - `status` must be 'active' or 'completed'
   - Date validations apply

## Architecture

- **Routes:** Handle HTTP requests, authentication, input validation
- **Services:** Business logic, database operations, transactions
- **Database:** PostgreSQL with proper relationships and constraints

## Security

- All endpoints require authentication via `token_required` middleware
- Input validation and sanitization
- SQL injection prevention using parameterized queries
- Transaction rollback on errors

## Error Handling

- Comprehensive error messages
- Proper HTTP status codes
- Database transaction management
- Logging for debugging