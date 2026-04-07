BEGIN;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    description TEXT,
    team_lead_id VARCHAR(50) NOT NULL REFERENCES employees(emp_code),
    created_by VARCHAR(50) NOT NULL REFERENCES employees(emp_code),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(emp_code),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, employee_id)
);

-- Create project_teams table
-- Assuming projects table exists with id as primary key
CREATE TABLE IF NOT EXISTS project_teams (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_employee_id ON team_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_project_id ON project_teams(project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_team_id ON project_teams(team_id);

COMMIT;