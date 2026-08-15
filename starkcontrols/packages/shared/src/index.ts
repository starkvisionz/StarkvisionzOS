export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from './database.types.js'

/** Primavera P6 relationship types, normalised from the XER `PR_*` codes. */
export const LINK_TYPES = ['FS', 'SS', 'FF', 'SF'] as const
export type LinkType = (typeof LINK_TYPES)[number]

/** Lifecycle of a potential change order. */
export const PCO_STATUSES = [
  'draft',
  'submitted',
  'negotiation',
  'approved',
  'rejected',
  'withdrawn',
] as const
export type PcoStatus = (typeof PCO_STATUSES)[number]

/**
 * Shape returned by the compute service from `POST /xer/parse`.
 * Numerics arrive as strings so no precision is lost crossing the wire —
 * never coerce these with `parseFloat` before persisting.
 */
export interface ParsedWbsNode {
  code: string
  name: string
  parent_code: string | null
}

export interface ParsedActivity {
  activity_id: string
  name: string
  wbs_code: string | null
  orig_dur_days: string | null
  rem_dur_days: string | null
  early_start: string | null
  early_finish: string | null
  late_start: string | null
  late_finish: string | null
  actual_start: string | null
  actual_finish: string | null
  total_float_days: string | null
  pct_complete: string | null
  calendar_id: string | null
}

export interface ParsedRelationship {
  pred_activity_id: string
  succ_activity_id: string
  link_type: LinkType | null
  lag_days: string | null
}

export interface ParsedSchedule {
  data_date: string
  wbs: ParsedWbsNode[]
  activities: ParsedActivity[]
  relationships: ParsedRelationship[]
}

/** Shape returned by the compute service from `POST /xer/import`. */
export interface ImportResult {
  snapshot_id: string
  counts: {
    wbs: number
    activities: number
    relationships: number
  }
  data_date: string
}

/** R2 object key layout for uploaded schedule files. */
export function xerObjectKey(
  orgId: string,
  projectId: string,
  uploadId: string,
): string {
  return `orgs/${orgId}/projects/${projectId}/xer/${uploadId}.xer`
}
