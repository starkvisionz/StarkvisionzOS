"""Generate synthetic, deterministic Primavera P6 ``.xer`` exports for tests.

The generator emits the same five tables the parser reads — ``PROJECT``,
``CALENDAR``, ``PROJWBS``, ``TASK`` and ``TASKPRED`` — with a realistic column
set, so a test file exercises the real tokenizer rather than a toy dialect.

Everything is a pure function of the arguments: no randomness, no clock reads.
Test expectations can therefore be derived arithmetically from the task index.

Layout produced by :func:`make_xer` with ``n_tasks=N``:

* one project node plus ``n_wbs`` WBS children (``WBS.01`` … ), tasks assigned
  round-robin
* activity ids ``A1000``, ``A1010``, … (index * 10 + 1000)
* original duration hours ``(i % 10 + 1) * 8``  -> ``i % 10 + 1`` days
* remaining duration hours = original hours for even ``i``, half for odd ``i``
* total float hours ``(i % 7 - 1) * 8``          -> ``i % 7 - 1`` days
  (so ``i % 7 == 0`` yields -1 day and ``i % 7 == 1`` yields 0 -> both critical)
* relationships chain task ``i-1`` -> task ``i`` with link types cycling
  ``PR_FS, PR_SS, PR_FF, PR_SF`` and lag hours cycling ``0, 8, 16, -8``

Run as a script to write a file::

    python tests/fixtures/make_xer.py 100 /tmp/sample.xer
"""

from __future__ import annotations

import sys
from datetime import date, datetime, timedelta
from pathlib import Path

__all__ = [
    "ACTIVITY_ID_STEP",
    "DEFAULT_DATA_DATE",
    "LAG_HOURS_CYCLE",
    "LINK_TYPE_CYCLE",
    "activity_id_for",
    "expected_orig_dur_hours",
    "expected_rem_dur_hours",
    "expected_total_float_hours",
    "make_xer",
    "write_xer",
]

DEFAULT_DATA_DATE = date(2026, 2, 1)
DEFAULT_PROJ_ID = "4001"
DEFAULT_CALENDAR_ID = "1"
ACTIVITY_ID_BASE = 1000
ACTIVITY_ID_STEP = 10
LINK_TYPE_CYCLE = ("PR_FS", "PR_SS", "PR_FF", "PR_SF")
LAG_HOURS_CYCLE = (0, 8, 16, -8)

_TASK_START = datetime(2026, 1, 5, 8, 0)

_PROJECT_FIELDS = [
    "proj_id",
    "fy_start_month_num",
    "rsrc_self_add_flag",
    "allow_complete_flag",
    "clndr_id",
    "sum_data_date",
    "last_recalc_date",
    "plan_start_date",
    "plan_end_date",
    "scd_end_date",
    "proj_short_name",
    "chng_eff_cmp_pct_flag",
]

_CALENDAR_FIELDS = [
    "clndr_id",
    "default_flag",
    "clndr_name",
    "proj_id",
    "base_clndr_id",
    "clndr_type",
    "day_hr_cnt",
]

_PROJWBS_FIELDS = [
    "wbs_id",
    "proj_id",
    "obs_id",
    "seq_num",
    "est_wt",
    "proj_node_flag",
    "sum_data_flag",
    "status_code",
    "wbs_short_name",
    "wbs_name",
    "parent_wbs_id",
]

_TASK_FIELDS = [
    "task_id",
    "proj_id",
    "wbs_id",
    "clndr_id",
    "est_wt",
    "phys_complete_pct",
    "complete_pct_type",
    "task_type",
    "duration_type",
    "status_code",
    "task_code",
    "task_name",
    "total_float_hr_cnt",
    "free_float_hr_cnt",
    "remain_drtn_hr_cnt",
    "target_drtn_hr_cnt",
    "act_start_date",
    "act_end_date",
    "early_start_date",
    "early_end_date",
    "late_start_date",
    "late_end_date",
]

_TASKPRED_FIELDS = [
    "task_pred_id",
    "task_id",
    "pred_task_id",
    "proj_id",
    "pred_proj_id",
    "pred_type",
    "lag_hr_cnt",
    "comments",
]


# --------------------------------------------------------------------------- #
# Derivations the tests assert against
# --------------------------------------------------------------------------- #


def activity_id_for(index: int) -> str:
    """Activity id (``task_code``) of the zero-based task ``index``."""
    return f"A{ACTIVITY_ID_BASE + index * ACTIVITY_ID_STEP}"


def expected_orig_dur_hours(index: int) -> int:
    return (index % 10 + 1) * 8


def expected_rem_dur_hours(index: int) -> int:
    orig = expected_orig_dur_hours(index)
    return orig if index % 2 == 0 else orig // 2


def expected_total_float_hours(index: int) -> int:
    return (index % 7 - 1) * 8


# --------------------------------------------------------------------------- #
# Emitters
# --------------------------------------------------------------------------- #


def _stamp(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%d %H:%M")


def _table(name: str, fields: list[str], rows: list[list[str]]) -> list[str]:
    lines = ["%T\t" + name, "%F\t" + "\t".join(fields)]
    lines.extend("%R\t" + "\t".join(row) for row in rows)
    return lines


def _wbs_internal_id(index: int) -> str:
    """Internal ``wbs_id``; index 0 is the project node, 1..n are its children."""
    return str(5000 + index)


def make_xer(
    n_tasks: int = 100,
    *,
    n_relationships: int | None = None,
    n_wbs: int = 5,
    data_date: date = DEFAULT_DATA_DATE,
    proj_id: str = DEFAULT_PROJ_ID,
    project_code: str = "SVH-DEMO",
    duration_pct_type: bool = False,
) -> str:
    """Return a complete XER document as text.

    Args:
        n_tasks: number of ``TASK`` rows.
        n_relationships: number of ``TASKPRED`` rows; defaults to
            ``max(0, n_tasks - 1)`` (a straight chain).
        n_wbs: number of WBS child nodes below the project node.
        data_date: value written to ``PROJECT.last_recalc_date``.
        proj_id: internal project id shared by every child row.
        project_code: ``PROJECT.proj_short_name``.
        duration_pct_type: when true every task uses ``CP_Drtn`` so percent
            complete is derived from remaining/original duration; otherwise
            ``CP_Phys`` with a stored ``phys_complete_pct``.
    """
    if n_tasks < 0:
        raise ValueError("n_tasks must be >= 0")
    if n_wbs < 1:
        raise ValueError("n_wbs must be >= 1")
    if n_relationships is None:
        n_relationships = max(0, n_tasks - 1)
    if n_relationships > max(0, n_tasks - 1):
        raise ValueError("n_relationships cannot exceed n_tasks - 1 for a simple chain")

    recalc = datetime.combine(data_date, datetime.min.time()).replace(hour=8)
    pct_type = "CP_Drtn" if duration_pct_type else "CP_Phys"

    lines: list[str] = [
        "\t".join(
            [
                "ERMHDR",
                "19.12",
                data_date.isoformat(),
                "Project",
                "svh_admin",
                "Starkvisionz Holdings",
                "dbxDatabaseNoName",
                "Project Management",
                "USD",
            ]
        )
    ]

    # --- PROJECT ---------------------------------------------------------- #
    lines += _table(
        "PROJECT",
        _PROJECT_FIELDS,
        [
            [
                proj_id,
                "1",
                "N",
                "Y",
                DEFAULT_CALENDAR_ID,
                _stamp(recalc),
                _stamp(recalc),
                _stamp(_TASK_START),
                _stamp(_TASK_START + timedelta(days=max(n_tasks, 1))),
                _stamp(_TASK_START + timedelta(days=max(n_tasks, 1))),
                project_code,
                "N",
            ]
        ],
    )

    # --- CALENDAR --------------------------------------------------------- #
    lines += _table(
        "CALENDAR",
        _CALENDAR_FIELDS,
        [
            [DEFAULT_CALENDAR_ID, "Y", "Standard 5x8", "", "", "CA_Base", "8"],
            ["2", "N", "Site 6x10", proj_id, DEFAULT_CALENDAR_ID, "CA_Project", "10"],
        ],
    )

    # --- PROJWBS ---------------------------------------------------------- #
    wbs_rows = [
        [
            _wbs_internal_id(0),
            proj_id,
            "1",
            "0",
            "1",
            "Y",
            "Y",
            "WS_Open",
            project_code,
            f"{project_code} Project Root",
            "",
        ]
    ]
    for i in range(1, n_wbs + 1):
        wbs_rows.append(
            [
                _wbs_internal_id(i),
                proj_id,
                "1",
                str(i),
                "1",
                "N",
                "Y",
                "WS_Open",
                f"WBS.{i:02d}",
                f"Work Package {i:02d}",
                _wbs_internal_id(0),
            ]
        )
    lines += _table("PROJWBS", _PROJWBS_FIELDS, wbs_rows)

    # --- TASK ------------------------------------------------------------- #
    task_rows = []
    for i in range(n_tasks):
        orig_hours = expected_orig_dur_hours(i)
        rem_hours = expected_rem_dur_hours(i)
        float_hours = expected_total_float_hours(i)
        early_start = _TASK_START + timedelta(days=i)
        early_finish = early_start + timedelta(hours=orig_hours)
        late_start = early_start + timedelta(hours=max(float_hours, 0))
        late_finish = early_finish + timedelta(hours=max(float_hours, 0))
        started = i % 4 == 0
        finished = i % 8 == 0

        task_rows.append(
            [
                str(9000 + i),  # task_id
                proj_id,
                _wbs_internal_id(i % n_wbs + 1),
                DEFAULT_CALENDAR_ID,
                "1",
                str((i % 5) * 25),  # phys_complete_pct: 0/25/50/75/100
                pct_type,
                "TT_Task",
                "DT_FixedDrtn",
                "TK_Complete" if finished else ("TK_Active" if started else "TK_NotStart"),
                activity_id_for(i),
                f"Activity {i:05d}",
                str(float_hours),
                "0",
                str(rem_hours),
                str(orig_hours),
                _stamp(early_start) if started else "",
                _stamp(early_finish) if finished else "",
                _stamp(early_start),
                _stamp(early_finish),
                _stamp(late_start),
                _stamp(late_finish),
            ]
        )
    lines += _table("TASK", _TASK_FIELDS, task_rows)

    # --- TASKPRED --------------------------------------------------------- #
    pred_rows = []
    for i in range(n_relationships):
        pred_rows.append(
            [
                str(7000 + i),
                str(9000 + i + 1),  # successor task_id
                str(9000 + i),  # predecessor task_id
                proj_id,
                proj_id,
                LINK_TYPE_CYCLE[i % len(LINK_TYPE_CYCLE)],
                str(LAG_HOURS_CYCLE[i % len(LAG_HOURS_CYCLE)]),
                "",
            ]
        )
    lines += _table("TASKPRED", _TASKPRED_FIELDS, pred_rows)

    lines.append("%E")
    return "\n".join(lines) + "\n"


def write_xer(path: str | Path, n_tasks: int = 100, **kwargs) -> Path:
    """Write :func:`make_xer` output to ``path`` (cp1252, as P6 emits)."""
    target = Path(path)
    target.write_bytes(make_xer(n_tasks, **kwargs).encode("cp1252"))
    return target


if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    destination = sys.argv[2] if len(sys.argv) > 2 else "sample.xer"
    written = write_xer(destination, count)
    print(f"wrote {written} ({count} tasks)")
