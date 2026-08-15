import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../src/index.js'
import { resetDbFactory, setDbFactory } from '../src/lib/db.js'
import {
  ORG_A,
  authHeaders,
  createCtx,
  createEnv,
  createFakeDb,
  mintToken,
} from './harness.js'

const app = createApp()

beforeEach(() => {
  setDbFactory(() => createFakeDb(() => []).sql)
})

afterEach(() => {
  resetDbFactory()
})

async function get(path: string, headers: Record<string, string> = {}) {
  return app.fetch(new Request(`https://edge.test${path}`, { headers }), createEnv(), createCtx())
}

describe('JWT verification', () => {
  it('rejects a request with no Authorization header', async () => {
    const response = await get('/projects')
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'unauthorized' })
  })

  it('rejects a non-Bearer Authorization scheme', async () => {
    const response = await get('/projects', { Authorization: 'Basic abc123' })
    expect(response.status).toBe(401)
  })

  it('rejects a Bearer header with no token', async () => {
    const response = await get('/projects', { Authorization: 'Bearer' })
    expect(response.status).toBe(401)
  })

  it('rejects a structurally invalid token', async () => {
    const response = await get('/projects', authHeaders('not.a.jwt'))
    expect(response.status).toBe(401)
  })

  it('rejects a token signed with the wrong secret', async () => {
    const token = await mintToken({ secret: 'an-attackers-secret-value-here' })
    const response = await get('/projects', authHeaders(token))
    expect(response.status).toBe(401)
  })

  it('rejects an expired token', async () => {
    const token = await mintToken({ expiresIn: '-1h' })
    const response = await get('/projects', authHeaders(token))
    expect(response.status).toBe(401)
  })

  it('rejects a token with no org_id claim', async () => {
    const token = await mintToken({ orgId: null })
    const response = await get('/projects', authHeaders(token))
    expect(response.status).toBe(401)
  })

  it('rejects a token whose org_id is not a uuid', async () => {
    const token = await mintToken({ orgId: 'acme-corp' })
    const response = await get('/projects', authHeaders(token))
    expect(response.status).toBe(401)
  })

  it('rejects an unsigned "alg: none" token', async () => {
    // Hand-built because jose refuses to sign one.
    const b64url = (value: object) =>
      btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const header = b64url({ alg: 'none', typ: 'JWT' })
    const payload = b64url({ sub: 'u', org_id: ORG_A, exp: 4102444800 })

    const response = await get('/projects', authHeaders(`${header}.${payload}.`))
    expect(response.status).toBe(401)
  })

  it('accepts a valid token and pins the request to its org', async () => {
    const db = createFakeDb(() => [])
    setDbFactory(() => db.sql)

    const token = await mintToken()
    const response = await get('/projects', authHeaders(token))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ projects: [] })
    expect(db.queries[0]?.params).toContain(ORG_A)
  })

  it('returns 503 when the JWT secret is not configured', async () => {
    const token = await mintToken()
    const response = await app.fetch(
      new Request('https://edge.test/projects', { headers: authHeaders(token) }),
      createEnv({ SUPABASE_JWT_SECRET: '' }),
      createCtx(),
    )
    expect(response.status).toBe(503)
  })

  it('leaves the health endpoint open', async () => {
    const response = await get('/healthz')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'ok' })
  })

  it('closes the database connection after the response', async () => {
    const db = createFakeDb(() => [])
    setDbFactory(() => db.sql)

    const ctx = createCtx()
    const token = await mintToken()
    await app.fetch(
      new Request('https://edge.test/projects', { headers: authHeaders(token) }),
      createEnv(),
      ctx,
    )
    await ctx.settled

    expect(db.ended).toBe(1)
  })
})
