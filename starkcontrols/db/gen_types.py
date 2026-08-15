#!/usr/bin/env python3
"""Emit packages/shared/src/database.types.ts by introspecting a Postgres database.

The canonical generator is:

    supabase gen types typescript --linked --schema public \
      > packages/shared/src/database.types.ts

That command shells out to Docker.  This script is the docker-free equivalent
used when a Docker daemon is unavailable (CI containers, restricted sandboxes);
it reads information_schema/pg_catalog directly and emits the same file shape.

Usage:
    python db/gen_types.py "$DATABASE_URL" > packages/shared/src/database.types.ts
"""

from __future__ import annotations

import sys
from collections import defaultdict

import psycopg

# Postgres type -> TypeScript type.  numeric maps to `number` to match the
# Supabase generator; application code that does money arithmetic must round-trip
# through the compute service, which uses Decimal.
TYPE_MAP = {
    "uuid": "string",
    "text": "string",
    "character": "string",
    "character varying": "string",
    "numeric": "number",
    "integer": "number",
    "bigint": "number",
    "smallint": "number",
    "double precision": "number",
    "real": "number",
    "boolean": "boolean",
    "date": "string",
    "timestamp with time zone": "string",
    "timestamp without time zone": "string",
    "jsonb": "Json",
    "json": "Json",
}

HEADER = """// AUTO-GENERATED — DO NOT EDIT BY HAND.
//
// Canonical regeneration (requires Docker):
//   supabase gen types typescript --linked --schema public \\
//     > packages/shared/src/database.types.ts
//
// Docker-free equivalent (used to produce this file):
//   python db/gen_types.py "$DATABASE_URL" > packages/shared/src/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
"""

FOOTER = """    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
"""

COLUMN_SQL = """
select c.table_name,
       c.column_name,
       c.data_type,
       c.is_nullable,
       c.column_default,
       c.is_generated,
       c.identity_generation
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema and t.table_name = c.table_name
where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
order by c.table_name, c.ordinal_position
"""

FK_SQL = """
select con.conname                       as constraint_name,
       cl.relname                        as table_name,
       att.attname                       as column_name,
       fcl.relname                       as referenced_table,
       fatt.attname                      as referenced_column
from pg_constraint con
join pg_class cl   on cl.oid = con.conrelid
join pg_class fcl  on fcl.oid = con.confrelid
join unnest(con.conkey)  with ordinality as k(attnum, ord)  on true
join unnest(con.confkey) with ordinality as fk(attnum, ord) on fk.ord = k.ord
join pg_attribute att  on att.attrelid = con.conrelid  and att.attnum = k.attnum
join pg_attribute fatt on fatt.attrelid = con.confrelid and fatt.attnum = fk.attnum
where con.contype = 'f' and cl.relnamespace = 'public'::regnamespace
order by cl.relname, con.conname, k.ord
"""


def ts_type(data_type: str) -> str:
    return TYPE_MAP.get(data_type, "unknown")


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    with psycopg.connect(sys.argv[1]) as conn:
        columns = conn.execute(COLUMN_SQL).fetchall()
        fks = conn.execute(FK_SQL).fetchall()

    by_table: dict[str, list[tuple]] = defaultdict(list)
    for row in columns:
        by_table[row[0]].append(row[1:])

    fk_by_table: dict[str, list[dict]] = defaultdict(list)
    for name, table, column, ref_table, ref_column in fks:
        fk_by_table[table].append(
            {
                "foreignKeyName": name,
                "columns": [column],
                "isOneToOne": False,
                "referencedRelation": ref_table,
                "referencedColumns": [ref_column],
            }
        )

    out = [HEADER]
    for table in sorted(by_table):
        out.append(f"      {table}: {{\n")

        # --- Row ---
        out.append("        Row: {\n")
        for col, dtype, nullable, _default, _generated, _identity in by_table[table]:
            suffix = " | null" if nullable == "YES" else ""
            out.append(f"          {col}: {ts_type(dtype)}{suffix}\n")
        out.append("        }\n")

        # --- Insert: generated columns dropped; defaulted/nullable optional ---
        out.append("        Insert: {\n")
        for col, dtype, nullable, default, generated, identity in by_table[table]:
            if generated == "ALWAYS" or identity == "ALWAYS":
                continue
            optional = "?" if (default is not None or nullable == "YES") else ""
            suffix = " | null" if nullable == "YES" else ""
            out.append(f"          {col}{optional}: {ts_type(dtype)}{suffix}\n")
        out.append("        }\n")

        # --- Update: everything optional ---
        out.append("        Update: {\n")
        for col, dtype, nullable, _default, generated, identity in by_table[table]:
            if generated == "ALWAYS" or identity == "ALWAYS":
                continue
            suffix = " | null" if nullable == "YES" else ""
            out.append(f"          {col}?: {ts_type(dtype)}{suffix}\n")
        out.append("        }\n")

        # --- Relationships ---
        rels = fk_by_table.get(table, [])
        if not rels:
            out.append("        Relationships: []\n")
        else:
            out.append("        Relationships: [\n")
            for rel in rels:
                cols = ", ".join(f'"{c}"' for c in rel["columns"])
                ref_cols = ", ".join(f'"{c}"' for c in rel["referencedColumns"])
                out.append("          {\n")
                out.append(f'            foreignKeyName: "{rel["foreignKeyName"]}"\n')
                out.append(f"            columns: [{cols}]\n")
                out.append("            isOneToOne: false\n")
                out.append(
                    f'            referencedRelation: "{rel["referencedRelation"]}"\n'
                )
                out.append(f"            referencedColumns: [{ref_cols}]\n")
                out.append("          },\n")
            out.append("        ]\n")

        out.append("      }\n")

    out.append(FOOTER)
    sys.stdout.write("".join(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
