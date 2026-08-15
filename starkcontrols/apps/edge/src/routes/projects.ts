import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { withDb, type Env, type Sql } from '../lib/db.js'
import type { Variables } from '../middleware/auth.js'
import { postSigned } from '../middleware/hmac.js'
import { requireProjectInOrg } from '../middleware/tenant.js'

const projects = new Hono<{ Bindings: Env; Variables: Variables }>()

/** Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = '23505'

/** Money arrives as a decimal string and stays one — never a JS number. */
const MONEY_PATTERN = /^-?\d{1,13}(\.\d{1,2})?$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const CURRENCY_PATTERN = /^[A-Z]{3}$/

export interface ProjectRow {
  id: string
  org_id: string
  code: string
  name: string
  currency: string | null
  timezone: string | null
  data_date: string | null
  budget_at_completion: string | null
  created_at: string
}

interface CreateProjectBody {
  code?: unknown
  name?: unknown
  currency?: unknown
  timezone?: unknown
  data_date?: unknown
  budget_at_completion?: unknown
}

interface ImportBody {
  r2_key?: unknown
  is_baseline?: unknown
}

function badRequest(message: string): HTTPException {
  return new HTTPException(400, { message })
}

function requireString(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest(`${field} is required`)
  }
  const trimmed = value.trim()
  if (trimmed.length > max) {
    throw badRequest(`${field} exceeds ${max} characters`)
  }
  return trimmed
}

function optionalMoney(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  // A JS number cannot represent every numeric(15,2) exactly, so decimals must
  // arrive as strings and are handed to Postgres untouched.
  if (typeof value !== 'string' || !MONEY_PATTERN.test(value)) {
    throw badRequest(`${field} must be a decimal string such as "1250000.00"`)
  }
  return value
}

async function insertProject(
  sql: Sql,
  orgId: string,
  body: CreateProjectBody,
): Promise<ProjectRow> {
  const code = requireString(body.code, 'code', 64)
  const name = requireString(body.name, 'name', 200)
  const budget = optionalMoney(body.budget_at_completion, 'budget_at_completion')

  let currency = 'USD'
  if (body.currency !== undefined && body.currency !== null) {
    currency = requireString(body.currency, 'currency', 3).toUpperCase()
    if (!CURRENCY_PATTERN.test(currency)) {
      throw badRequest('currency must be a 3-letter ISO 4217 code')
    }
  }

  let timezone = 'America/Chicago'
  if (body.timezone !== undefined && body.timezone !== null) {
    timezone = requireString(body.timezone, 'timezone', 64)
  }

  let dataDate: string | null = null
  if (body.data_date !== undefined && body.data_date !== null) {
    dataDate = requireString(body.data_date, 'data_date', 10)
    if (!DATE_PATTERN.test(dataDate)) {
      throw badRequest('data_date must be an ISO date (YYYY-MM-DD)')
    }
  }

  const rows = await sql<ProjectRow[]>`
    insert into projects (org_id, code, name, currency, timezone, data_date, budget_at_completion)
    values (${orgId}, ${code}, ${name}, ${currency}, ${timezone}, ${dataDate}, ${budget})
    returning id, org_id, code, name, currency, timezone, data_date,
              budget_at_completion, created_at
  `

  const project = rows[0]
  if (!project) {
    throw new HTTPException(500, { message: 'project insert returned no row' })
  }
  return project
}

/** `POST /projects` — create a project owned by the caller's org. */
projects.post('/', async (c) => {
  const body = await c.req.json<CreateProjectBody>().catch(() => {
    throw badRequest('body must be JSON')
  })
  const orgId = c.get('orgId')

  try {
    const project = await withDb(c.env, c.executionCtx, (sql) =>
      insertProject(sql, orgId, body),
    )
    return c.json(project, 201)
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      throw new HTTPException(409, {
        message: 'a project with that code already exists',
      })
    }
    throw error
  }
})

/** `GET /projects` — list the caller's org's projects. */
projects.get('/', async (c) => {
  const orgId = c.get('orgId')
  const rows = await withDb(
    c.env,
    c.executionCtx,
    (sql) => sql<ProjectRow[]>`
      select id, org_id, code, name, currency, timezone, data_date,
             budget_at_completion, created_at
        from projects
       where org_id = ${orgId}
       order by code
    `,
  )
  return c.json({ projects: [...rows] })
})

/**
 * `POST /projects/:id/import` — hand an uploaded XER to the compute service.
 *
 * Ownership is checked here before the call goes out, so the compute service
 * never sees a project id the caller has no claim to.
 */
projects.post('/:id/import', async (c) => {
  const projectId = c.req.param('id')
  const orgId = c.get('orgId')

  const body = await c.req.json<ImportBody>().catch(() => {
    throw badRequest('body must be JSON')
  })
  const r2Key = requireString(body.r2_key, 'r2_key', 512)
  const isBaseline = body.is_baseline === true

  // The key encodes its own tenancy; refuse anything outside the caller's org
  // even if the project check would otherwise pass.
  if (!r2Key.startsWith(`orgs/${orgId}/`)) {
    throw new HTTPException(404, { message: 'object not found' })
  }

  await withDb(c.env, c.executionCtx, async (sql) => {
    await requireProjectInOrg(sql, projectId, orgId)
  })

  if (!c.env.COMPUTE_API_URL || !c.env.COMPUTE_API_KEY) {
    throw new HTTPException(503, { message: 'compute service is not configured' })
  }

  const response = await postSigned(
    c.env.COMPUTE_API_URL,
    '/xer/import',
    { r2_key: r2Key, project_id: projectId, is_baseline: isBaseline },
    c.env.COMPUTE_API_KEY,
  )

  const payload = await response.text()
  // Pass the compute service's result through verbatim: it is the authority on
  // import outcomes, and re-encoding would risk mangling decimal strings.
  return new Response(payload, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
})

export default projects
