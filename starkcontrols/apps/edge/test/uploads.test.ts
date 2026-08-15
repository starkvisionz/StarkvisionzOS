import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../src/index.js'
import { resetDbFactory, setDbFactory } from '../src/lib/db.js'
import { MAX_UPLOAD_BYTES, xerObjectKey } from '../src/routes/uploads.js'
import {
  ORG_A,
  ORG_B,
  PROJECT_A,
  USER_A,
  authHeaders,
  createCtx,
  createEnv,
  createFakeDb,
  mintToken,
  type CapturedQuery,
  type TestEnv,
} from './harness.js'

const app = createApp()

const UUID_IN_KEY =
  /^orgs\/[0-9a-f-]{36}\/projects\/[0-9a-f-]{36}\/xer\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.xer$/

const XER_BODY = '%T\tPROJECT\n%F\tproj_id\n%R\t1\n%E\n'

function ownedByOrgA(query: CapturedQuery): unknown[] {
  const [projectId, orgId] = query.params as string[]
  return projectId === PROJECT_A && orgId === ORG_A
    ? [{ id: PROJECT_A, code: 'SVH-DEMO', name: 'Demo Project' }]
    : []
}

let token: string

beforeEach(async () => {
  token = await mintToken({ orgId: ORG_A })
  setDbFactory(() => createFakeDb(ownedByOrgA).sql)
})

afterEach(() => {
  resetDbFactory()
})

async function upload(
  path: string,
  init: RequestInit = {},
  env: TestEnv = createEnv(),
): Promise<{ response: Response; env: TestEnv }> {
  const response = await app.fetch(
    new Request(`https://edge.test${path}`, {
      method: 'POST',
      ...init,
      headers: { ...authHeaders(token), ...(init.headers ?? {}) },
    }),
    env,
    createCtx(),
  )
  return { response, env }
}

describe('POST /uploads/xer', () => {
  it('requires authentication', async () => {
    const response = await app.fetch(
      new Request('https://edge.test/uploads/xer', { method: 'POST', body: XER_BODY }),
      createEnv(),
      createCtx(),
    )
    expect(response.status).toBe(401)
  })

  it('writes a raw body to the documented key layout', async () => {
    const { response, env } = await upload(`/uploads/xer?project_id=${PROJECT_A}`, {
      body: XER_BODY,
    })

    expect(response.status).toBe(201)
    const { r2_key: key } = (await response.json()) as { r2_key: string }

    expect(key).toMatch(UUID_IN_KEY)
    expect(key.startsWith(`orgs/${ORG_A}/projects/${PROJECT_A}/xer/`)).toBe(true)
    expect(key.endsWith('.xer')).toBe(true)

    const stored = env.STARKCONTROLS_FILES.objects.get(key)
    expect(stored).toBeDefined()
    expect(new TextDecoder().decode(stored?.body)).toBe(XER_BODY)
    expect(stored?.customMetadata).toMatchObject({
      org_id: ORG_A,
      project_id: PROJECT_A,
      uploaded_by: USER_A,
    })
  })

  it('accepts a multipart upload and records the original filename', async () => {
    const form = new FormData()
    form.set('project_id', PROJECT_A)
    form.set('file', new File([XER_BODY], 'baseline.xer'))

    const { response, env } = await upload('/uploads/xer', { body: form })
    expect(response.status).toBe(201)

    const { r2_key: key } = (await response.json()) as { r2_key: string }
    expect(key).toMatch(UUID_IN_KEY)
    expect(env.STARKCONTROLS_FILES.objects.get(key)?.customMetadata).toMatchObject({
      original_filename: 'baseline.xer',
    })
  })

  it('gives every upload of the same file a distinct key', async () => {
    const first = await upload(`/uploads/xer?project_id=${PROJECT_A}`, { body: XER_BODY })
    const second = await upload(`/uploads/xer?project_id=${PROJECT_A}`, {
      body: XER_BODY,
    })

    const keyA = ((await first.response.json()) as { r2_key: string }).r2_key
    const keyB = ((await second.response.json()) as { r2_key: string }).r2_key
    expect(keyA).not.toBe(keyB)
  })

  it('rejects an upload for a project in another org, writing nothing', async () => {
    token = await mintToken({ orgId: ORG_B })
    const { response, env } = await upload(`/uploads/xer?project_id=${PROJECT_A}`, {
      body: XER_BODY,
    })

    expect(response.status).toBe(404)
    expect(env.STARKCONTROLS_FILES.objects.size).toBe(0)
  })

  it('requires a project_id', async () => {
    const { response } = await upload('/uploads/xer', { body: XER_BODY })
    expect(response.status).toBe(400)
  })

  it('rejects a malformed project_id before querying', async () => {
    const db = createFakeDb(ownedByOrgA)
    setDbFactory(() => db.sql)

    const { response } = await upload('/uploads/xer?project_id=nope', { body: XER_BODY })
    expect(response.status).toBe(404)
    expect(db.queries).toHaveLength(0)
  })

  it('rejects an empty upload', async () => {
    const { response } = await upload(`/uploads/xer?project_id=${PROJECT_A}`, {
      body: '',
    })
    expect(response.status).toBe(400)
  })

  it('rejects an oversized upload on its declared length alone', async () => {
    const { response, env } = await upload(`/uploads/xer?project_id=${PROJECT_A}`, {
      body: XER_BODY,
      headers: { 'Content-Length': String(MAX_UPLOAD_BYTES + 1) },
    })

    expect(response.status).toBe(413)
    expect(env.STARKCONTROLS_FILES.objects.size).toBe(0)
  })

  it('rejects an oversized multipart upload before parsing the form', async () => {
    const form = new FormData()
    form.set('project_id', PROJECT_A)
    form.set('file', new File([XER_BODY], 'huge.xer'))

    const { response, env } = await upload('/uploads/xer', {
      body: form,
      headers: { 'Content-Length': String(MAX_UPLOAD_BYTES + 1) },
    })

    expect(response.status).toBe(413)
    expect(env.STARKCONTROLS_FILES.objects.size).toBe(0)
  })

  it('rejects a multipart body with no file part', async () => {
    const form = new FormData()
    form.set('project_id', PROJECT_A)

    const { response } = await upload('/uploads/xer', { body: form })
    expect(response.status).toBe(400)
  })

  it('caps uploads at 100 MiB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(104_857_600)
  })
})

describe('xerObjectKey', () => {
  it('is org-first so a prefix listing cannot cross tenants', () => {
    const key = xerObjectKey(ORG_A, PROJECT_A, '0f0f0f0f-0f0f-0f0f-0f0f-0f0f0f0f0f0f')
    expect(key).toBe(
      `orgs/${ORG_A}/projects/${PROJECT_A}/xer/0f0f0f0f-0f0f-0f0f-0f0f-0f0f0f0f0f0f.xer`,
    )
    expect(key).toMatch(UUID_IN_KEY)
  })
})
