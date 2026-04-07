"""
Team Service
Handles team creation, updates, and member management
"""

from database.connection import get_db_connection, return_connection
import logging
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)


def create_team(team_name: str, description: str, team_lead_id: str, members: List[str], created_by: str) -> Tuple[Dict, int]:
    """
    Create a new team with members
    """
    if not team_name or not team_name.strip():
        return {"success": False, "message": "Team name is required"}, 400

    if not team_lead_id or team_lead_id not in members:
        return {"success": False, "message": "Team lead must be included in the members list"}, 400

    if not members or len(members) == 0:
        return {"success": False, "message": "At least one member is required"}, 400

    conn = get_db_connection()
    try:
        conn.autocommit = False  # Start transaction

        cur = conn.cursor()

        # Check if team_lead_id exists in employees
        cur.execute("SELECT emp_code FROM employees WHERE emp_code = %s", (team_lead_id,))
        if not cur.fetchone():
            conn.rollback()
            return {"success": False, "message": "Invalid team lead ID"}, 400

        # Check if created_by exists
        cur.execute("SELECT emp_code FROM employees WHERE emp_code = %s", (created_by,))
        if not cur.fetchone():
            conn.rollback()
            return {"success": False, "message": "Invalid creator ID"}, 400

        # Check all members exist
        for member in members:
            cur.execute("SELECT emp_code FROM employees WHERE emp_code = %s", (member,))
            if not cur.fetchone():
                conn.rollback()
                return {"success": False, "message": f"Invalid member ID: {member}"}, 400

        # Insert team
        cur.execute("""
            INSERT INTO teams (team_name, description, team_lead_id, created_by)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (team_name.strip(), description, team_lead_id, created_by))

        team_id = cur.fetchone()[0]

        # Insert team members
        for member in members:
            cur.execute("""
                INSERT INTO team_members (team_id, employee_id)
                VALUES (%s, %s)
            """, (team_id, member))

        conn.commit()

        return {
            "success": True,
            "message": "Team created successfully",
            "data": {
                "team_id": team_id,
                "team_name": team_name,
                "description": description,
                "team_lead_id": team_lead_id,
                "members": members,
                "created_by": created_by
            }
        }, 201

    except Exception as e:
        conn.rollback()
        logger.exception("Error creating team: %s", e)
        return {"success": False, "message": "Internal server error"}, 500
    finally:
        conn.autocommit = True
        cur.close()
        return_connection(conn)


def update_team(team_id: int, team_name: str, description: str, team_lead_id: str, members: List[str], updated_by: str) -> Tuple[Dict, int]:
    """
    Update an existing team
    """
    if not team_id or team_id <= 0:
        return {"success": False, "message": "Invalid team ID"}, 400

    if not team_name or not team_name.strip():
        return {"success": False, "message": "Team name is required"}, 400

    if not team_lead_id or team_lead_id not in members:
        return {"success": False, "message": "Team lead must be included in the members list"}, 400

    if not members or len(members) == 0:
        return {"success": False, "message": "At least one member is required"}, 400

    conn = get_db_connection()
    try:
        conn.autocommit = False  # Start transaction

        cur = conn.cursor()

        # Check if team exists
        cur.execute("SELECT id FROM teams WHERE id = %s", (team_id,))
        if not cur.fetchone():
            conn.rollback()
            return {"success": False, "message": "Team not found"}, 404

        # Check if team_lead_id exists in employees
        cur.execute("SELECT emp_code FROM employees WHERE emp_code = %s", (team_lead_id,))
        if not cur.fetchone():
            conn.rollback()
            return {"success": False, "message": "Invalid team lead ID"}, 400

        # Check all members exist
        for member in members:
            cur.execute("SELECT emp_code FROM employees WHERE emp_code = %s", (member,))
            if not cur.fetchone():
                conn.rollback()
                return {"success": False, "message": f"Invalid member ID: {member}"}, 400

        # Update team
        cur.execute("""
            UPDATE teams
            SET team_name = %s, description = %s, team_lead_id = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (team_name.strip(), description, team_lead_id, team_id))

        # Delete existing members
        cur.execute("DELETE FROM team_members WHERE team_id = %s", (team_id,))

        # Insert new members
        for member in members:
            cur.execute("""
                INSERT INTO team_members (team_id, employee_id)
                VALUES (%s, %s)
            """, (team_id, member))

        conn.commit()

        return {
            "success": True,
            "message": "Team updated successfully",
            "data": {
                "team_id": team_id,
                "team_name": team_name,
                "description": description,
                "team_lead_id": team_lead_id,
                "members": members
            }
        }, 200

    except Exception as e:
        conn.rollback()
        logger.exception("Error updating team: %s", e)
        return {"success": False, "message": "Internal server error"}, 500
    finally:
        conn.autocommit = True
        cur.close()
        return_connection(conn)