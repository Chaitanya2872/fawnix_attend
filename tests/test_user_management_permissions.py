from services.user_management_service import can_manage_users


def test_can_manage_users_allows_devtester_without_admin_flags():
    assert can_manage_users(
        {
            "emp_designation": "DevTester",
            "role": "employee",
            "can_write": False,
        }
    ) is True


def test_can_manage_users_denies_hr():
    assert can_manage_users(
        {
            "emp_designation": "HR",
            "role": "hr",
            "can_write": False,
        }
    ) is False


def test_can_manage_users_denies_read_only_admin():
    assert can_manage_users(
        {
            "emp_designation": "Manager",
            "role": "admin",
            "can_read": True,
            "can_write": False,
        }
    ) is False


def test_can_manage_users_allows_write_admin():
    assert can_manage_users(
        {
            "emp_designation": "Manager",
            "role": "admin",
            "can_read": True,
            "can_write": True,
        }
    ) is True


def test_can_manage_users_allows_user_manager():
    assert can_manage_users(
        {
            "emp_designation": "Manager",
            "role": "user_manager",
            "can_write": False,
        }
    ) is True
