import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/index.js'
import { resetDbFactory, setDbFactory } from '../src/lib/db.js'
import { SIGNATURE_HEADER, signBody } from '../src/middleware/hmac.js'
import {
  COMPUTE_KEY,
  COMPUTE_URL,
  ORG_A,
  ORG_B,
  PROJECT_A,
  PROJECT_B,
  authHeaders,
  createCtx,
  createEnv,
  createFakeDb,
  createFetchStub,
  mintToken,
  type CapturedQuery,
} from './harness.js'

const app = createApp()

const projectRow = {
  id: PROJECT_A,
  org_id: ORG_A,
  code: 'SVH-DEMO',
  name: 'Demo Project',
  currency: 'USD',
  timezone: 'America/Chicago',
  data_date: null,
  budget_at_completion: '12500000.00',
  created_at: '2026-08-01T00:00:00.000Z',
}

/**
 * Stand-in for the real table: a select only returns rows whose org matches the
 * bound org_id, which is exactly the guarantee `requireProjectInOrg` relies on.
 */
function ownedByOrgA(query: CapturedQuery): unknown[] {
  if (!query.text.startsWith('select')) return [projectRow]
  const [projectId, orgId] = query.params as string[]
  if (query.text.includes('from projects where id')) {
    return projectId === PROJECT_A && orgId === ORG_A ? [projectRow] : []
  }
  return query.params.includes(ORG_A) ? [projectRow] : []
}

let token: string

beforeEach(async () => {
  token = await mintToken({ orgId: ORG_A })
  setDbFactory(() => createFakeDb(ownedByOrgA).sql)
})

afterEach(() => {
  resetDbFactory()
  vi.unstubAllGlobals()
})

async function request(path: string, init: RequestInit = {}, env = createEnv()) {
  return app.fetch(
    new Request(`https://edge.test${path}`, {
      ...init,
      headers: { ...authHeaders(token), ...(init.headers ?? {}) },
    }),
    env,
    createCtx(),
  )
}

// --------------------------------------------------------------------------- //
// GET /projects
// --------------------------------------------------------------------------- //

describe('GET /projects', () => {
  it('lists only the caller org’s projects', async () => {
    const db = createFakeDb(ownedByOrgA)
    setDbFactory(() => db.sql)

    const response = await request('/projects')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ projects: [projectRow] })

    const [query] = db.queries
    expect(query?.text).toContain('where org_id =')
    expect(query?.params).toEqual([ORG_A])
  })

  it('returns nothing for an org with no projects', async () => {
    token = await mintToken({ orgId: ORG_B })
    const response = await request('/projects')
    expect(await response.json()).toEqual({ projects: [] })
  })
})

// --------------------------------------------------------------------------- //
// POST /projects
// --------------------------------------------------------------------------- //

describe('POST /projects', () => {
  it('creates a project owned by the JWT’s org', async () => {
    const db = createFakeDb(ownedByOrgA)
    setDbFactory(() => db.sql)

    const response = await request('/projects', {
      method: 'POST',
      body: JSON.stringify({
        code: 'SVH-DEMO',
        name: 'Demo Project',
        budget_at_completion: '12500000.00',
      }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(projectRow)

    const [query] = db.queries
    expect(query?.text).toContain('insert into projects')
    // org_id is taken from the token, never from the request body
    expect(query?.params[0]).toBe(ORG_A)
  })

  it('ignores an org_id supplied in the body', async () => {
    const db = createFakeDb(ownedByOrgA)
    setDbFactory(() => db.sql)

    await request('/projects', {
      method: 'POST',
      body: JSON.stringify({ code: 'X', name: 'Y', org_id: ORG_B }),
    })

    expect(db.queries[0]?.params).not.toContain(ORG_B)
  })

  it('applies the documented currency and timezone defaults', async () => {
    const db = createFakeDb(ownedByOrgA)
    setDbFactory(() => db.sql)

    await request('/projects', {
      method: 'POST',
      body: JSON.stringify({ code: 'X', name: 'Y' }),
    })

    expect(db.queries[0]?.params).toEqual([
      ORG_A,
      'X',
      'Y',
      'USD',
      'America/Chicago',
      null,
      null,
    ])
  })

  const invalidBodies: [Record<string, unknown>, string][] = [
    [{ name: 'no code' }, 'missing code'],
    [{ code: 'C' }, 'missing name'],
    [{ code: 'C', name: 'N', budget_at_completion: 12500000 }, 'budget as a number'],
    [{ code: 'C', name: 'N', budget_at_completion: '1.234' }, 'too many decimals'],
    [{ code: 'C', name: 'N', currency: 'DOLLARS' }, 'bad currency'],
    [{ code: 'C', name: 'N', data_date: '08/15/2026' }, 'bad data_date'],
  ]

  it.each(invalidBodies)('rejects invalid input: %s', async (body) => {
    const response = await request('/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    expect(response.status).toBe(400)
  })

  it('keeps money as a decimal string all the way to the driver', async () => {
    const db = createFakeDb(ownedByOrgA)
    setDbFactory(() => db.sql)

    await request('/projects', {
      method: 'POST',
      body: JSON.stringify({
        code: 'C',
        name: 'N',
        budget_at_completion: '9999999999999.99',
      }),
    })

    const bound = db.queries[0]?.params.at(-1)
    expect(bound).toBe('9999999999999.99')
    expect(typeof bound).toBe('string')
  })

  it('maps a duplicate project code to 409', async () => {
    setDbFactory(
      () =>
        createFakeDb(() => {
          throw Object.assign(new Error('duplicate key'), { code: '23505' })
        }).sql,
    )

    const response = await request('/projects', {
      method: 'POST',
      body: JSON.stringify({ code: 'SVH-DEMO', name: 'Demo Project' }),
    })
    expect(response.status).toBe(409)
  })

  it('rejects a non-JSON body', async () => {
    const response = await request('/projects', { method: 'POST', body: 'not json' })
    expect(response.status).toBe(400)
  })
})

// --------------------------------------------------------------------------- //
// POST /projects/:id/import
// --------------------------------------------------------------------------- //

describe('POST /projects/:id/import', () => {
  const importBody = (projectId: string, orgId = ORG_A) => ({
    method: 'POST',
    body: JSON.stringify({
      r2_key: `orgs/${orgId}/projects/${projectId}/xer/abc.xer`,
      is_baseline: true,
    }),
  })

  it('forwards a signed request to the compute service and passes the result through', async () => {
    const stub = createFetchStub(
      async () =>
        new Response(
          JSON.stringify({
            snapshot_id: 'cccccccc-1111-2222-3333-444444444444',
            counts: { wbs: 6, activities: 100, relationships: 99 },
            data_date: '2026-02-01',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', stub.fetch)

    const response = await request(`/projects/${PROJECT_A}/import`, importBody(PROJECT_A))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ counts: { activities: 100 } })

    expect(stub.calls).toHaveLength(1)
    const call = stub.calls[0]!
    expect(call.url).toBe(`${COMPUTE_URL}/xer/import`)

    const sentBody = call.init.body as string
    expect(JSON.parse(sentBody)).toEqual({
      r2_key: `orgs/${ORG_A}/projects/${PROJECT_A}/xer/abc.xer`,
      project_id: PROJECT_A,
      is_baseline: true,
    })

    // The signature must cover exactly the bytes that were sent.
    const headers = call.init.headers as Record<string, string>
    expect(headers[SIGNATURE_HEADER]).toBe(await signBody(sentBody, COMPUTE_KEY))
  })

  it('returns 404 for a project belonging to another org', async () => {
    const stub = createFetchStub()
    vi.stubGlobal('fetch', stub.fetch)

    // A valid Org B token asking for Org A's project.
    token = await mintToken({ orgId: ORG_B })
    const response = await request(
      `/projects/${PROJECT_A}/import`,
      importBody(PROJECT_A, ORG_B),
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'project not found' })
    // Nothing left the edge.
    expect(stub.calls).toHaveLength(0)
  })

  it('returns 404 for a project that does not exist', async () => {
    const response = await request(`/projects/${PROJECT_B}/import`, importBody(PROJECT_B))
    expect(response.status).toBe(404)
  })

  it('returns 404 for a malformed project id without touching the database', async () => {
    const db = createFakeDb(ownedByOrgA)
    setDbFactory(() => db.sql)

    const response = await request('/projects/not-a-uuid/import', {
      method: 'POST',
      body: JSON.stringify({ r2_key: `orgs/${ORG_A}/x.xer` }),
    })
    expect(response.status).toBe(404)
    expect(db.queries).toHaveLength(0)
  })

  it('refuses an r2_key that points outside the caller’s org', async () => {
    const stub = createFetchStub()
    vi.stubGlobal('fetch', stub.fetch)

    const response = await request(`/projects/${PROJECT_A}/import`, {
      method: 'POST',
      body: JSON.stringify({ r2_key: `orgs/${ORG_B}/projects/${PROJECT_B}/xer/a.xer` }),
    })

    expect(response.status).toBe(404)
    expect(stub.calls).toHaveLength(0)
  })

  it('requires an r2_key', async () => {
    const response = await request(`/projects/${PROJECT_A}/import`, {
      method: 'POST',
      body: JSON.stringify({ is_baseline: true }),
    })
    expect(response.status).toBe(400)
  })

  it('relays an upstream failure status unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchStub(
        async () =>
          new Response(JSON.stringify({ detail: 'unreadable XER' }), { status: 422 }),
      ).fetch,
    )

    const response = await request(`/projects/${PROJECT_A}/import`, importBody(PROJECT_A))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ detail: 'unreadable XER' })
  })

  it('returns 503 when the compute service is not configured', async () => {
    const response = await app.fetch(
      new Request(`https://edge.test/projects/${PROJECT_A}/import`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ r2_key: `orgs/${ORG_A}/x.xer` }),
      }),
      createEnv({ COMPUTE_API_URL: '' }),
      createCtx(),
    )
    expect(response.status).toBe(503)
  })
})
