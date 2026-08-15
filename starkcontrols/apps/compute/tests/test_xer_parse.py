"""Parser tests: counts, unit conversion, link-type mapping, numeric types."""

from __future__ import annotations

from datetime import UTC, date
from decimal import Decimal

import pytest

from core.xer_parse import (
    CleanRoomXerParser,
    XerParseError,
    parse_xer,
    tokenize,
)
from tests.fixtures.make_xer import (
    LAG_HOURS_CYCLE,
    LINK_TYPE_CYCLE,
    activity_id_for,
    expected_orig_dur_hours,
    expected_rem_dur_hours,
    expected_total_float_hours,
    make_xer,
    write_xer,
)

N_TASKS = 100
N_WBS = 5


@pytest.fixture(scope="module")
def schedule():
    return parse_xer(make_xer(N_TASKS).encode("cp1252"))


# --------------------------------------------------------------------------- #
# Counts and identity
# --------------------------------------------------------------------------- #


def test_exact_counts(schedule):
    assert len(schedule.activities) == N_TASKS
    assert len(schedule.relationships) == N_TASKS - 1
    # one project node plus its work packages
    assert len(schedule.wbs) == N_WBS + 1


def test_data_date_comes_from_last_recalc_date(schedule):
    assert schedule.data_date == date(2026, 2, 1)
    assert isinstance(schedule.data_date, date)


def test_activity_ids_are_task_codes_in_file_order(schedule):
    assert [a.activity_id for a in schedule.activities] == [
        activity_id_for(i) for i in range(N_TASKS)
    ]


def test_wbs_hierarchy_resolves_parent_codes(schedule):
    root = schedule.wbs[0]
    assert root.code == "SVH-DEMO"
    assert root.parent_code is None

    children = schedule.wbs[1:]
    assert [n.code for n in children] == [f"WBS.{i:02d}" for i in range(1, N_WBS + 1)]
    assert all(n.parent_code == "SVH-DEMO" for n in children)


def test_activities_are_linked_to_their_wbs_code(schedule):
    for i, activity in enumerate(schedule.activities):
        assert activity.wbs_code == f"WBS.{i % N_WBS + 1:02d}"


# --------------------------------------------------------------------------- #
# Hour -> day conversion
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("index", [0, 1, 3, 7, 42, 99])
def test_durations_convert_hours_to_days_at_8h(schedule, index):
    activity = schedule.activities[index]
    assert activity.orig_dur_days == Decimal(expected_orig_dur_hours(index)) / 8
    assert activity.rem_dur_days == Decimal(expected_rem_dur_hours(index)) / 8
    assert activity.total_float_days == Decimal(expected_total_float_hours(index)) / 8


def test_spot_checked_field_values(schedule):
    first = schedule.activities[0]
    assert first.activity_id == "A1000"
    assert first.name == "Activity 00000"
    assert first.orig_dur_days == Decimal("1.00")  # 8 hr / 8 hr-per-day
    assert first.rem_dur_days == Decimal("1.00")
    assert first.total_float_days == Decimal("-1.00")  # -8 hr / 8 hr-per-day
    assert first.calendar_id == "1"

    fourth = schedule.activities[3]
    assert fourth.activity_id == "A1030"
    assert fourth.orig_dur_days == Decimal("4.00")  # 32 hr
    assert fourth.rem_dur_days == Decimal("2.00")  # 16 hr, odd index -> halved
    assert fourth.total_float_days == Decimal("2.00")  # 16 hr


def test_every_numeric_is_decimal_never_float(schedule):
    for activity in schedule.activities:
        for value in (
            activity.orig_dur_days,
            activity.rem_dur_days,
            activity.total_float_days,
            activity.pct_complete,
        ):
            assert value is None or isinstance(value, Decimal)
    for link in schedule.relationships:
        assert link.lag_days is None or isinstance(link.lag_days, Decimal)


def test_fractional_day_conversion():
    """A 6-hour task is 0.75 days on an 8 hr/day basis — not 0, not 1."""
    xer = "\n".join(
        [
            "%T\tPROJECT",
            "%F\tproj_id\tlast_recalc_date",
            "%R\t1\t2026-02-01 08:00",
            "%T\tTASK",
            "%F\ttask_id\tproj_id\ttask_code\ttask_name\ttarget_drtn_hr_cnt"
            "\tremain_drtn_hr_cnt\ttotal_float_hr_cnt",
            "%R\t10\t1\tA1\tSix hour task\t6\t2\t4",
            "%E",
        ]
    )
    activity = parse_xer(xer).activities[0]
    assert activity.orig_dur_days == Decimal("0.75")
    assert activity.rem_dur_days == Decimal("0.25")
    assert activity.total_float_days == Decimal("0.50")


def test_hours_per_day_is_configurable():
    parser = CleanRoomXerParser(hours_per_day=Decimal("10"))
    schedule = parser.parse(make_xer(4))
    # index 0 has 8 original hours -> 0.8 days on a 10 hr calendar
    assert schedule.activities[0].orig_dur_days == Decimal("0.80")


def test_rejects_non_positive_hours_per_day():
    with pytest.raises(ValueError):
        CleanRoomXerParser(hours_per_day=Decimal("0"))


# --------------------------------------------------------------------------- #
# Relationships
# --------------------------------------------------------------------------- #


def test_link_types_map_from_p6_codes(schedule):
    observed = [link.link_type for link in schedule.relationships]
    assert set(observed) == {"FS", "SS", "FF", "SF"}
    for i, link_type in enumerate(observed):
        assert link_type == LINK_TYPE_CYCLE[i % 4].removeprefix("PR_")


def test_relationships_reference_activity_ids_not_internal_task_ids(schedule):
    known = {a.activity_id for a in schedule.activities}
    for i, link in enumerate(schedule.relationships):
        assert link.pred_activity_id == activity_id_for(i)
        assert link.succ_activity_id == activity_id_for(i + 1)
        assert link.pred_activity_id in known
        assert link.succ_activity_id in known


def test_lag_converts_hours_to_days_including_negatives(schedule):
    for i, link in enumerate(schedule.relationships):
        assert link.lag_days == Decimal(LAG_HOURS_CYCLE[i % 4]) / 8
    assert Decimal("-1.00") in {link.lag_days for link in schedule.relationships}


def test_unknown_link_type_becomes_null():
    xer = "\n".join(
        [
            "%T\tPROJECT",
            "%F\tproj_id\tlast_recalc_date",
            "%R\t1\t2026-02-01 08:00",
            "%T\tTASK",
            "%F\ttask_id\tproj_id\ttask_code\ttask_name",
            "%R\t10\t1\tA1\tOne",
            "%R\t11\t1\tA2\tTwo",
            "%T\tTASKPRED",
            "%F\ttask_pred_id\ttask_id\tpred_task_id\tproj_id\tpred_type\tlag_hr_cnt",
            "%R\t1\t11\t10\t1\tPR_WEIRD\t0",
            "%E",
        ]
    )
    link = parse_xer(xer).relationships[0]
    assert link.link_type is None


def test_dangling_predecessor_is_dropped():
    xer = "\n".join(
        [
            "%T\tPROJECT",
            "%F\tproj_id\tlast_recalc_date",
            "%R\t1\t2026-02-01 08:00",
            "%T\tTASK",
            "%F\ttask_id\tproj_id\ttask_code\ttask_name",
            "%R\t10\t1\tA1\tOne",
            "%T\tTASKPRED",
            "%F\ttask_pred_id\ttask_id\tpred_task_id\tproj_id\tpred_type\tlag_hr_cnt",
            "%R\t1\t10\t999\t1\tPR_FS\t0",
            "%E",
        ]
    )
    assert parse_xer(xer).relationships == []


# --------------------------------------------------------------------------- #
# Dates and percent complete
# --------------------------------------------------------------------------- #


def test_datetimes_are_timezone_aware_utc(schedule):
    activity = schedule.activities[0]
    assert activity.early_start is not None
    assert activity.early_start.tzinfo is not None
    assert activity.early_start.utcoffset().total_seconds() == 0
    assert activity.early_start == activity.early_start.astimezone(UTC)


def test_unstarted_activities_have_no_actual_dates(schedule):
    # make_xer marks a task started when i % 4 == 0 and finished when i % 8 == 0
    assert schedule.activities[1].actual_start is None
    assert schedule.activities[0].actual_start is not None
    assert schedule.activities[0].actual_finish is not None
    assert schedule.activities[4].actual_finish is None


def test_physical_pct_complete_is_read_verbatim(schedule):
    assert [a.pct_complete for a in schedule.activities[:5]] == [
        Decimal("0.00"),
        Decimal("25.00"),
        Decimal("50.00"),
        Decimal("75.00"),
        Decimal("100.00"),
    ]


def test_duration_pct_complete_is_derived():
    schedule = parse_xer(make_xer(4, duration_pct_type=True))
    # even index: remaining == original -> 0% complete
    assert schedule.activities[0].pct_complete == Decimal("0.00")
    # odd index: remaining is half of original -> 50% complete
    assert schedule.activities[1].pct_complete == Decimal("50.00")


# --------------------------------------------------------------------------- #
# Tokenizer and input handling
# --------------------------------------------------------------------------- #


def test_tokenize_exposes_the_five_tables_we_read():
    tables = tokenize(make_xer(3))
    assert {"PROJECT", "CALENDAR", "PROJWBS", "TASK", "TASKPRED"} <= set(tables)
    assert len(tables["TASK"].rows) == 3
    assert tables["TASK"].rows[0]["task_code"] == "A1000"


def test_short_rows_are_padded_not_dropped():
    xer = "\n".join(
        [
            "%T\tPROJECT",
            "%F\tproj_id\tlast_recalc_date",
            "%R\t1\t2026-02-01 08:00",
            "%T\tTASK",
            "%F\ttask_id\tproj_id\ttask_code\ttask_name\ttarget_drtn_hr_cnt",
            "%R\t10\t1\tA1\tTruncated row",
            "%E",
        ]
    )
    activity = parse_xer(xer).activities[0]
    assert activity.activity_id == "A1"
    assert activity.orig_dur_days is None


def test_accepts_bytes_str_and_path(tmp_path):
    text = make_xer(5)
    from_str = parse_xer(text)
    from_bytes = parse_xer(text.encode("cp1252"))
    path = write_xer(tmp_path / "sample.xer", 5)
    from_path = parse_xer(path)

    assert len(from_str.activities) == 5
    assert from_bytes.model_dump() == from_str.model_dump()
    assert from_path.model_dump() == from_str.model_dump()


def test_non_utf8_bytes_decode_via_cp1252():
    # 0xB0 is DEGREE SIGN in cp1252 and invalid as standalone UTF-8.
    raw = make_xer(1).replace("Activity 00000", "Pour slab 90°").encode("cp1252")
    assert parse_xer(raw).activities[0].name == "Pour slab 90°"


def test_rejects_a_file_that_is_not_an_xer():
    with pytest.raises(XerParseError):
        parse_xer(b"not,an,xer\n1,2,3\n")


def test_rejects_an_xer_without_a_project_table():
    with pytest.raises(XerParseError, match="no PROJECT table"):
        parse_xer("%T\tTASK\n%F\ttask_id\n%R\t1\n%E\n")


def test_empty_schedule_is_valid():
    schedule = parse_xer(make_xer(0))
    assert schedule.activities == []
    assert schedule.relationships == []
    assert schedule.data_date == date(2026, 2, 1)


def test_multi_project_xer_is_scoped_to_the_primary_project():
    xer = "\n".join(
        [
            "%T\tPROJECT",
            "%F\tproj_id\tlast_recalc_date",
            "%R\t1\t2026-02-01 08:00",
            "%R\t2\t2026-03-01 08:00",
            "%T\tTASK",
            "%F\ttask_id\tproj_id\ttask_code\ttask_name",
            "%R\t10\t1\tA1\tMine",
            "%R\t11\t2\tB1\tTheirs",
            "%E",
        ]
    )
    schedule = parse_xer(xer)
    assert [a.activity_id for a in schedule.activities] == ["A1"]
    assert schedule.data_date == date(2026, 2, 1)
