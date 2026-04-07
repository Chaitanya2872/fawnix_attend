"""
Project Team Service
Handles project team assignments and updates
"""

from database.connection import get_db_connection, return_connection
import logging
from datetime import date
from typing import Dict, Tuple

logger = logging.getLogger(__name__)


def assign_team_to_project(project_id: int, team_id: int, assigned_by: str, start_date: date, end_date: date = None) -> Tuple[Dict, int]:
    """
    Assign a team to a project
    """
    if not project_id or project_id <= 0:
        return {"success": False, "message": "Invalid project ID"}, 400

    if not team_id or team_id <= 0:
        return {"success": False, "message": "Invalid team ID"}, 400

    if not start_date:
        return {"success": False, "message": "Start date is required"}, 400

    if end_date and end_date < start_date:
        return {"success": False, "message": "End date must be after start date"}, 400

    conn = get_db_connection()
    try:
        conn.autocommit = False  # Start transaction

        cur = conn.cursor()

        # Check if project exists
        cur.execute("SELECT id FROM projects WHERE id = %s", (project_id,))
        if not cur.fetchone():
            conn.rollback()
            return {"success": False, "message": "Project not found"}, 404

        # Check if team exists
        cur.execute("SELECT id FROM teams WHERE id = %s", (team_id,))
        if not cur.fetchone():
            conn.rollback()
            return {"success": False, "message": "Team not found"}, 404

        # Check if assigned_by exists
        cur.execute("SELECT emp_code FROM employees WHERE emp_code = %s", (assigned_by,))
        if not cur.fetchone():
            conn.rollback()
            return {"success": False, "message": "Invalid assigner ID"}, 400

        # Check for duplicate assignment
        cur.execute("""
            SELECT id FROM project_teams
            WHERE project_id = %s AND team_id = %s AND status = 'active'
        """, (project_id, team_id))
        if cur.fetchone():
            conn.rollback()
            return {"success": False, "message": "Team is already assigned to this project"}, 409

        # Insert project team assignment
        cur.execute("""
            INSERT INTO project_teams (project_id, team_id, start_date, end_date, assigned_by)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (project_id, team_id, start_date, end_date, assigned_by))

        project_team_id = cur.fetchone()[0]

        conn.commit()

        return {
            "success": True,
            "message": "Team assigned to project successfully",
            "data": {
                "project_team_id": project_team_id,
                "project_id": project_id,
                "team_id": team_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat() if end_date else None,
                "status": "active",
                "assigned_by": assigned_by
            }
        }, 201

    except Exception as e:
        conn.rollback()
        logger.exception("Error assigning team to project: %s", e)
        return {"success": False, "message": "Internal server error"}, 500
    finally:
        conn.autocommit = True
        cur.close()
        return_connection(conn)


def update_project_team(project_team_id: int, team_id: int = None, start_date: date = None, end_date: date = None, status: str = None, updated_by: str = None) -> Tuple[Dict, int]:
    """
    Update a project team assignment
    """
    if not project_team_id or project_team_id <= 0:
        return {"success": False, "message": "Invalid project team ID"}, 400

    if status and status not in ['active', 'completed']:
        return {"success": False, "message": "Invalid status. Must be 'active' or 'completed'"}, 400

    if start_date and end_date and end_date < start_date:
        return {"success": False, "message": "End date must be after start date"}, 400

    conn = get_db_connection()
    try:
        conn.autocommit = False  # Start transaction

        cur = conn.cursor()

        # Check if project team exists
        cur.execute("SELECT project_id, team_id, start_date, end_date, status FROM project_teams WHERE id = %s", (project_team_id,))
        row = cur.fetchone()
        if not row:
            conn.rollback()
            return {"success": False, "message": "Project team assignment not found"}, 404

        current_project_id, current_team_id, current_start_date, current_end_date, current_status = row

        # If updating team_id, check if new team exists
        if team_id is not None:
            if team_id <= 0:
                conn.rollback()
                return {"success": False, "message": "Invalid team ID"}, 400
            cur.execute("SELECT id FROM teams WHERE id = %s", (team_id,))
            if not cur.fetchone():
                conn.rollback()
                return {"success": False, "message": "Team not found"}, 404

            # Check for duplicate if changing team
            if team_id != current_team_id:
                cur.execute("""
                    SELECT id FROM project_teams
                    WHERE project_id = %s AND team_id = %s AND status = 'active' AND id != %s
                """, (current_project_id, team_id, project_team_id))
                if cur.fetchone():
                    conn.rollback()
                    return {"success": False, "message": "Team is already assigned to this project"}, 409

        # Prepare update values
        update_fields = []
        update_values = []

        if team_id is not None:
            update_fields.append("team_id = %s")
            update_values.append(team_id)

        if start_date is not None:
            update_fields.append("start_date = %s")
            update_values.append(start_date)

        if end_date is not None:
            update_fields.append("end_date = %s")
            update_values.append(end_date)

        if status is not None:
            update_fields.append("status = %s")
            update_values.append(status)

        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_values.append(project_team_id)

        if not update_fields:
            conn.rollback()
            return {"success": False, "message": "No fields to update"}, 400

        # Update
        query = f"UPDATE project_teams SET {', '.join(update_fields[:-1])} WHERE id = %s"
        cur.execute(query, update_values)

        conn.commit()

        # Get updated data
        cur.execute("SELECT project_id, team_id, start_date, end_date, status FROM project_teams WHERE id = %s", (project_team_id,))
        row = cur.fetchone()
        project_id, team_id, start_date, end_date, status = row

        return {
            "success": True,
            "message": "Project team assignment updated successfully",
            "data": {
                "project_team_id": project_team_id,
                "project_id": project_id,
                "team_id": team_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat() if end_date else None,
                "status": status
            }
        }, 200

    except Exception as e:
        conn.rollback()
        logger.exception("Error updating project team: %s", e)
        return {"success": False, "message": "Internal server error"}, 500
    finally:
        conn.autocommit = True
        cur.close()
        return_connection(conn)