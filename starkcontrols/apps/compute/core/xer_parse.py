"""Clean-room parser for Primavera P6 ``.xer`` exports.

An XER file is a tab-delimited, table-oriented text dump.  Every logical line
starts with a marker:

    ERMHDR<TAB>19.12<TAB>2026-01-15<TAB>...     file header
    %T<TAB>TASK                                 begin table TASK
    %F<TAB>task_id<TAB>proj_id<TAB>...          field (column) names
    %R<TAB>1234<TAB>5678<TAB>...                one data row
    %E                                          end of file

This module reads the five tables StarkControls needs — ``PROJECT``,
``PROJWBS``, ``TASK``, ``TASKPRED`` and ``CALENDAR`` — and returns a
:class:`ParsedSchedule` whose field names match the ``db/migrations/0001_core.sql``
columns one-for-one, so the import path is a straight column copy.

Unit handling
-------------
P6 stores durations, float and lag in *hours*.  StarkControls stores *days*.
Conversion uses :data:`DEFAULT_HOURS_PER_DAY` (8.0) unless a caller overrides it.
Every numeric is a :class:`decimal.Decimal` end to end — never a float.

Swapping in another parser
--------------------------
The public surface is the :class:`ScheduleParser` protocol plus
:func:`parse_xer`.  The existing SVH parser can be dropped in later with::

    from core.xer_parse import set_parser
    set_parser(SvhLegacyParser())

and every caller (``app/routers/xer.py`` included) picks it up unchanged.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Protocol, runtime_checkable

from pydantic import BaseModel, Field

__all__ = [
    "DEFAULT_HOURS_PER_DAY",
    "Activity",
    "CleanRoomXerParser",
    "ParsedSchedule",
    "Relationship",
    "ScheduleParser",
    "WbsNode",
    "XerParseError",
    "XerTable",
    "get_parser",
    "parse_xer",
    "set_parser",
    "tokenize",
]

# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #

#: P6 stores durations in hours; StarkControls stores days.
DEFAULT_HOURS_PER_DAY = Decimal("8.0")

#: Precision of the target columns: numeric(8,2) for durations, numeric(5,2) for pct.
_DURATION_QUANT = Decimal("0.01")
_PCT_QUANT = Decimal("0.01")

#: XER writes dates as local wall-clock with no offset.  Rule 2 of the platform
#: spec requires every stored instant be timezone-aware UTC, so wall-clock values
#: are attached to UTC here and the project's `timezone` column remains the
#: record of the site-local zone.  See DECISIONS.md.
_DATE_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d",
)

#: P6 relationship codes -> the `link_type` check-constraint values.
_LINK_TYPE_MAP = {
    "PR_FS": "FS",
    "PR_SS": "SS",
    "PR_FF": "FF",
    "PR_SF": "SF",
}

_TEXT_ENCODINGS = ("utf-8-sig", "cp1252", "latin-1")


class XerParseError(ValueError):
    """Raised when a file is not a usable XER export."""


# --------------------------------------------------------------------------- #
# Output models — field names mirror the database columns exactly
# --------------------------------------------------------------------------- #


class WbsNode(BaseModel):
    code: str
    name: str
    parent_code: str | None = None


class Activity(BaseModel):
    activity_id: str
    name: str
    wbs_code: str | None = None
    orig_dur_days: Decimal | None = None
    rem_dur_days: Decimal | None = None
    early_start: datetime | None = None
    early_finish: datetime | None = None
    late_start: datetime | None = None
    late_finish: datetime | None = None
    actual_start: datetime | None = None
    actual_finish: datetime | None = None
    total_float_days: Decimal | None = None
    pct_complete: Decimal | None = None
    calendar_id: str | None = None


class Relationship(BaseModel):
    pred_activity_id: str
    succ_activity_id: str
    link_type: str | None = None
    lag_days: Decimal | None = None


class ParsedSchedule(BaseModel):
    data_date: date
    wbs: list[WbsNode] = Field(default_factory=list)
    activities: list[Activity] = Field(default_factory=list)
    relationships: list[Relationship] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Tokenizer
# --------------------------------------------------------------------------- #


@dataclass
class XerTable:
    """One ``%T`` block: its column names and its ``%R`` rows."""

    name: str
    fields: list[str] = field(default_factory=list)
    rows: list[dict[str, str]] = field(default_factory=list)


def _decode(raw: bytes) -> str:
    for encoding in _TEXT_ENCODINGS:
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    # latin-1 maps every byte, so this is unreachable in practice.
    return raw.decode("latin-1", errors="replace")


def tokenize(source: bytes | str | os.PathLike[str]) -> dict[str, XerTable]:
    """Split an XER file into ``{TABLE_NAME: XerTable}``.

    Accepts raw bytes, the decoded text, or a path to a file on disk.
    Rows shorter than the header are padded with empty strings; rows longer are
    truncated.  Unknown markers and blank lines are ignored, which is what P6
    itself does when re-reading its own exports.
    """
    if isinstance(source, os.PathLike):
        text = _decode(Path(source).read_bytes())
    elif isinstance(source, bytes | bytearray):
        text = _decode(bytes(source))
    elif isinstance(source, str) and "\n" not in source and Path(source).is_file():
        text = _decode(Path(source).read_bytes())
    else:
        text = str(source)

    tables: dict[str, XerTable] = {}
    current: XerTable | None = None

    for line in text.splitlines():
        if not line:
            continue
        parts = line.split("\t")
        marker = parts[0]

        if marker == "%T":
            if len(parts) < 2 or not parts[1]:
                raise XerParseError("%T marker without a table name")
            current = XerTable(name=parts[1])
            tables[current.name] = current
        elif marker == "%F":
            if current is None:
                raise XerParseError("%F field list before any %T table marker")
            current.fields = parts[1:]
        elif marker == "%R":
            if current is None:
                raise XerParseError("%R row before any %T table marker")
            values = parts[1:]
            width = len(current.fields)
            if len(values) < width:
                values = values + [""] * (width - len(values))
            current.rows.append(dict(zip(current.fields, values[:width], strict=True)))
        elif marker == "%E":
            break
        # ERMHDR and anything else: ignored.

    if not tables:
        raise XerParseError("no XER tables found — file is not a P6 .xer export")
    return tables


# --------------------------------------------------------------------------- #
# Scalar coercion
# --------------------------------------------------------------------------- #


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _to_decimal(value: str | None) -> Decimal | None:
    text = _clean(value)
    if text is None:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _to_datetime(value: str | None) -> datetime | None:
    """Parse a P6 wall-clock stamp into a timezone-aware UTC datetime."""
    text = _clean(value)
    if text is None:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=UTC)
        except ValueError:
            continue
    return None


def _hours_to_days(value: str | None, hours_per_day: Decimal) -> Decimal | None:
    hours = _to_decimal(value)
    if hours is None:
        return None
    return (hours / hours_per_day).quantize(_DURATION_QUANT)


# --------------------------------------------------------------------------- #
# Parser
# --------------------------------------------------------------------------- #


@runtime_checkable
class ScheduleParser(Protocol):
    """Contract every schedule parser implementation must satisfy."""

    def parse(self, source: bytes | str | os.PathLike[str]) -> ParsedSchedule: ...


class CleanRoomXerParser:
    """Reference XER implementation, written against the published format only."""

    def __init__(self, hours_per_day: Decimal = DEFAULT_HOURS_PER_DAY) -> None:
        if hours_per_day <= 0:
            raise ValueError("hours_per_day must be positive")
        self.hours_per_day = hours_per_day

    # -- public ------------------------------------------------------------- #

    def parse(self, source: bytes | str | os.PathLike[str]) -> ParsedSchedule:
        tables = tokenize(source)

        proj_id, data_date = self._parse_project(tables.get("PROJECT"))
        calendar_ids = self._parse_calendars(tables.get("CALENDAR"))

        wbs_by_id, wbs_nodes = self._parse_wbs(tables.get("PROJWBS"), proj_id)
        activities, task_code_by_id = self._parse_tasks(
            tables.get("TASK"), proj_id, wbs_by_id, calendar_ids
        )
        relationships = self._parse_relationships(
            tables.get("TASKPRED"), proj_id, task_code_by_id
        )

        return ParsedSchedule(
            data_date=data_date,
            wbs=wbs_nodes,
            activities=activities,
            relationships=relationships,
        )

    # -- tables ------------------------------------------------------------- #

    def _parse_project(self, table: XerTable | None) -> tuple[str | None, date]:
        """Return the primary project's id and its data date.

        A multi-project XER lists several PROJECT rows; the first row that is not
        a template is treated as primary and every child table is filtered to it.
        """
        if table is None or not table.rows:
            raise XerParseError("XER contains no PROJECT table")

        row = table.rows[0]
        proj_id = _clean(row.get("proj_id"))

        recalc = _to_datetime(row.get("last_recalc_date"))
        if recalc is None:
            # Fall back to the plan start so an import never dies on a missing
            # recalc stamp; the caller can still override the snapshot date.
            recalc = _to_datetime(row.get("plan_start_date"))
        if recalc is None:
            raise XerParseError(
                "PROJECT row has neither last_recalc_date nor plan_start_date"
            )
        return proj_id, recalc.date()

    def _parse_calendars(self, table: XerTable | None) -> set[str]:
        if table is None:
            return set()
        ids = set()
        for row in table.rows:
            clndr_id = _clean(row.get("clndr_id"))
            if clndr_id:
                ids.add(clndr_id)
        return ids

    def _parse_wbs(
        self, table: XerTable | None, proj_id: str | None
    ) -> tuple[dict[str, str], list[WbsNode]]:
        """Return ``{wbs_id: code}`` and the WBS nodes in file order."""
        if table is None:
            return {}, []

        rows = [r for r in table.rows if self._in_project(r, proj_id)]

        # First pass: internal id -> short name, needed to resolve parent codes.
        code_by_id: dict[str, str] = {}
        for row in rows:
            wbs_id = _clean(row.get("wbs_id"))
            code = _clean(row.get("wbs_short_name"))
            if wbs_id and code:
                code_by_id[wbs_id] = code

        nodes: list[WbsNode] = []
        seen: set[str] = set()
        for row in rows:
            wbs_id = _clean(row.get("wbs_id"))
            code = _clean(row.get("wbs_short_name"))
            if not wbs_id or not code or code in seen:
                continue
            seen.add(code)
            parent_id = _clean(row.get("parent_wbs_id"))
            parent_code = code_by_id.get(parent_id) if parent_id else None
            if parent_code == code:  # self-reference guard
                parent_code = None
            nodes.append(
                WbsNode(
                    code=code,
                    name=_clean(row.get("wbs_name")) or code,
                    parent_code=parent_code,
                )
            )
        return code_by_id, nodes

    def _parse_tasks(
        self,
        table: XerTable | None,
        proj_id: str | None,
        wbs_by_id: dict[str, str],
        calendar_ids: set[str],
    ) -> tuple[list[Activity], dict[str, str]]:
        """Return the activities and a ``{task_id: activity_id}`` map."""
        if table is None:
            return [], {}

        activities: list[Activity] = []
        task_code_by_id: dict[str, str] = {}
        seen: set[str] = set()

        for row in table.rows:
            if not self._in_project(row, proj_id):
                continue
            activity_id = _clean(row.get("task_code"))
            if not activity_id:
                continue

            task_id = _clean(row.get("task_id"))
            if task_id:
                task_code_by_id[task_id] = activity_id
            if activity_id in seen:
                # `unique (snapshot_id, activity_id)` — keep the first occurrence.
                continue
            seen.add(activity_id)

            orig = _hours_to_days(row.get("target_drtn_hr_cnt"), self.hours_per_day)
            rem = _hours_to_days(row.get("remain_drtn_hr_cnt"), self.hours_per_day)

            clndr_id = _clean(row.get("clndr_id"))
            if clndr_id and calendar_ids and clndr_id not in calendar_ids:
                clndr_id = None

            activities.append(
                Activity(
                    activity_id=activity_id,
                    name=_clean(row.get("task_name")) or activity_id,
                    wbs_code=wbs_by_id.get(_clean(row.get("wbs_id")) or ""),
                    orig_dur_days=orig,
                    rem_dur_days=rem,
                    early_start=_to_datetime(row.get("early_start_date")),
                    early_finish=_to_datetime(row.get("early_end_date")),
                    late_start=_to_datetime(row.get("late_start_date")),
                    late_finish=_to_datetime(row.get("late_end_date")),
                    actual_start=_to_datetime(row.get("act_start_date")),
                    actual_finish=_to_datetime(row.get("act_end_date")),
                    total_float_days=_hours_to_days(
                        row.get("total_float_hr_cnt"), self.hours_per_day
                    ),
                    pct_complete=self._pct_complete(row, orig, rem),
                    calendar_id=clndr_id,
                )
            )
        return activities, task_code_by_id

    def _parse_relationships(
        self,
        table: XerTable | None,
        proj_id: str | None,
        task_code_by_id: dict[str, str],
    ) -> list[Relationship]:
        if table is None:
            return []

        links: list[Relationship] = []
        for row in table.rows:
            # TASKPRED carries the successor's proj_id in `proj_id` and the
            # predecessor's in `pred_proj_id`; keep links whose successor is in
            # the primary project so cross-project links are not silently kept.
            if not self._in_project(row, proj_id):
                continue

            pred = task_code_by_id.get(_clean(row.get("pred_task_id")) or "")
            succ = task_code_by_id.get(_clean(row.get("task_id")) or "")
            if not pred or not succ:
                # Dangling reference (external/deleted task) — not importable
                # against `relationships`, which is keyed on activity ids.
                continue

            lag = _hours_to_days(row.get("lag_hr_cnt"), self.hours_per_day)
            links.append(
                Relationship(
                    pred_activity_id=pred,
                    succ_activity_id=succ,
                    link_type=_LINK_TYPE_MAP.get(_clean(row.get("pred_type")) or ""),
                    lag_days=lag if lag is not None else Decimal("0.00"),
                )
            )
        return links

    # -- helpers ------------------------------------------------------------ #

    @staticmethod
    def _in_project(row: dict[str, str], proj_id: str | None) -> bool:
        if proj_id is None:
            return True
        row_proj = _clean(row.get("proj_id"))
        return row_proj is None or row_proj == proj_id

    @staticmethod
    def _pct_complete(
        row: dict[str, str], orig: Decimal | None, rem: Decimal | None
    ) -> Decimal | None:
        """Resolve percent complete honouring the activity's % complete type.

        P6 activities carry three percentages and a `complete_pct_type` selecting
        which one is authoritative.  Duration % complete is derived rather than
        stored, so it is computed here from the original/remaining durations.
        """
        pct_type = _clean(row.get("complete_pct_type"))

        if pct_type == "CP_Drtn":
            if orig is not None and orig > 0 and rem is not None:
                pct = (Decimal(1) - (rem / orig)) * Decimal(100)
                pct = max(Decimal(0), min(Decimal(100), pct))
                return pct.quantize(_PCT_QUANT)
            return Decimal("0.00")

        column = "act_complete_pct" if pct_type == "CP_Units" else "phys_complete_pct"
        pct = _to_decimal(row.get(column))
        if pct is None:
            pct = _to_decimal(row.get("phys_complete_pct"))
        if pct is None:
            return None
        return max(Decimal(0), min(Decimal(100), pct)).quantize(_PCT_QUANT)


# --------------------------------------------------------------------------- #
# Swappable module-level parser
# --------------------------------------------------------------------------- #

_active_parser: ScheduleParser = CleanRoomXerParser()


def get_parser() -> ScheduleParser:
    """Return the parser implementation currently wired into the service."""
    return _active_parser


def set_parser(parser: ScheduleParser) -> None:
    """Replace the active parser (e.g. swap in the existing SVH parser)."""
    global _active_parser
    _active_parser = parser


def parse_xer(source: bytes | str | os.PathLike[str]) -> ParsedSchedule:
    """Parse an XER export with the active parser."""
    return _active_parser.parse(source)
