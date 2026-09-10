import services.activity_service as activity_service


CURRENT_USER = {"emp_email": "rep@example.com", "emp_code": "E100"}


def _stub_lookup(monkeypatch, leads_by_id, calls):
    def fake_fetch(lead_id, current_user):
        calls.append(lead_id)
        return leads_by_id.get(lead_id)

    monkeypatch.setattr(activity_service, "fetch_lead_for_notification", fake_fetch)


def test_attach_lead_details_dedupes_lookups_and_fills_every_activity(monkeypatch):
    calls = []
    _stub_lookup(
        monkeypatch,
        {
            "lead-1": {
                "id": "lead-1",
                "name": "Asha Rao",
                "company": "Vertex Interiors",
                "status": "QUALIFIED",
                "phone": "9876543210",
            }
        },
        calls,
    )

    activities = [
        {"id": 1, "lead_id": "lead-1"},
        {"id": 2, "lead_id": "lead-1"},
    ]

    activity_service.attach_lead_details(activities, CURRENT_USER)

    # Two activities against the same lead must cost a single upstream call.
    assert calls == ["lead-1"]
    for activity in activities:
        assert activity["lead_name"] == "Asha Rao"
        assert activity["lead_company"] == "Vertex Interiors"
        assert activity["lead_status"] == "QUALIFIED"
        assert activity["lead_phone"] == "9876543210"


def test_attach_lead_details_leaves_unlinked_activities_alone(monkeypatch):
    calls = []
    _stub_lookup(monkeypatch, {"lead-1": {"id": "lead-1", "name": "Asha Rao"}}, calls)

    activities = [
        {"id": 1, "lead_id": "lead-1"},
        {"id": 2, "lead_id": None},
        {"id": 3},
        {"id": 4, "lead_id": ""},
    ]

    activity_service.attach_lead_details(activities, CURRENT_USER)

    assert calls == ["lead-1"]
    assert activities[0]["lead_name"] == "Asha Rao"
    for activity in activities[1:]:
        assert "lead_name" not in activity


def test_attach_lead_details_is_non_fatal_when_crm_lookup_fails(monkeypatch):
    calls = []
    _stub_lookup(monkeypatch, {}, calls)  # every lookup misses

    activities = [{"id": 1, "lead_id": "lead-1"}]

    activity_service.attach_lead_details(activities, CURRENT_USER)

    assert calls == ["lead-1"]
    # The raw link survives so the client can still tell the visit is attached to a lead.
    assert activities[0]["lead_id"] == "lead-1"
    assert "lead_name" not in activities[0]


def test_attach_lead_details_caps_distinct_lead_lookups(monkeypatch):
    calls = []
    cap = activity_service.MAX_LEAD_LOOKUPS_PER_LIST
    leads = {f"lead-{i}": {"id": f"lead-{i}", "name": f"Lead {i}"} for i in range(cap + 5)}
    _stub_lookup(monkeypatch, leads, calls)

    activities = [{"id": i, "lead_id": f"lead-{i}"} for i in range(cap + 5)]

    activity_service.attach_lead_details(activities, CURRENT_USER)

    assert len(calls) == cap
    assert activities[0]["lead_name"] == "Lead 0"
    assert "lead_name" not in activities[-1]


def test_attach_lead_details_no_ops_without_activities_or_user(monkeypatch):
    calls = []
    _stub_lookup(monkeypatch, {"lead-1": {"id": "lead-1", "name": "Asha Rao"}}, calls)

    assert activity_service.attach_lead_details([], CURRENT_USER) == []

    activities = [{"id": 1, "lead_id": "lead-1"}]
    activity_service.attach_lead_details(activities, None)

    assert calls == []
    assert "lead_name" not in activities[0]
