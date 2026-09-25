from decimal import Decimal

from services import payroll_service


def test_salary_breakup_matches_supplied_workbook_example():
    breakup = payroll_service.salary_breakup_from_gross(35000)

    assert breakup["basic_salary"] == Decimal("17500.00")
    assert breakup["hra"] == Decimal("8750.00")
    assert breakup["da"] == Decimal("1750.00")
    assert breakup["bonus"] == Decimal("2332.00")
    assert breakup["special_allowance"] == Decimal("4668.00")
    assert breakup["gross_pay"] == Decimal("35000.00")
    assert breakup["pf_employee"] == Decimal("1800.00")
    assert breakup["esi_employee"] == Decimal("0.00")
    assert breakup["professional_tax"] == Decimal("200.00")
    assert breakup["total_deduction"] == Decimal("2000.00")
    assert breakup["net_pay"] == Decimal("33000.00")
    assert breakup["pf_employer"] == Decimal("1950.00")
    assert breakup["esi_employer"] == Decimal("0.00")
    assert breakup["ctc"] == Decimal("36950.00")


def test_salary_breakup_template_returns_workbook_rows():
    response = payroll_service.salary_breakup_template(35000)

    assert response["success"] is True
    rows = response["data"]["rows"]
    by_particular = {row["particulars"]: row for row in rows}

    assert response["data"]["gross_monthly"] == "35000.00"
    assert by_particular["Basic @ 50% of the Gross"]["monthly"] == "17500.00"
    assert by_particular["HRA @ 50% of the Basic"]["annual"] == "105000.00"
    assert by_particular["Gross Salary (A)"]["monthly"] == "35000.00"
    assert by_particular["Total Employee Ded. (B)"]["monthly"] == "2000.00"
    assert by_particular["Net Salary (Take Home) - C (A-B)"]["annual"] == "396000.00"
    assert by_particular["Total Employer Ded. (D)"]["monthly"] == "1950.00"
    assert by_particular["CTC (A+D)"]["annual"] == "443400.00"


def test_payroll_header_columns_match_workbook_header_count_and_labels():
    labels = [label for _key, label, _source in payroll_service.HEADER_COLUMNS]

    assert len(labels) == 33
    assert labels[:7] == [
        "S#",
        "EMP ID",
        "PROJECT",
        "NAME",
        "DESIGNATION",
        "DOJ",
        "Offer Type",
    ]
    assert labels[-5:] == ["TOTAL PAY", "PF 13%", "ESI@ 3.25", "CTC", "Remark"]
