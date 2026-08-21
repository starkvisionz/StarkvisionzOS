import { HTTPException } from 'hono/http-exception'

import type { Sql } from '../lib/db.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A project row narrowed to what the routes actually need. */
export interface OwnedProject {
  id: string
  code: string
  name: string
}

export function assertUuid(value: string, label = 'id'): string {
  if (!UUID_PATTERN.test(value)) {
    throw new HTTPException(404, { message: `${label} not found` })
  }
  return value
}

/**
 * Resolve a project **within the caller's org**, or 404.
 *
 * Postgres RLS is the authority on tenancy, but the Worker connects through
 * Hyperdrive with a pooled role rather than an end-user JWT, so the org filter
 * is repeated in SQL here: defence in depth, and it makes a cross-org read
 * indistinguishable from a missing project rather than leaking existence
 * through a 403.
 */
export async function requireProjectInOrg(
  sql: Sql,
  projectId: string,
  orgId: string,
): Promise<OwnedProject> {
  assertUuid(projectId, 'project')

  const rows = await sql<OwnedProject[]>`
    select id, code, name
      from projects
     where id = ${projectId}
       and org_id = ${orgId}
     limit 1
  `

  const project = rows[0]
  if (!project) {
    throw new HTTPException(404, { message: 'project not found' })
  }
  return project
}
