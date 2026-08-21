import { SignJWT } from 'jose'

import type { Env, Sql } from '../src/lib/db.js'

export const JWT_SECRET = 'test-supabase-jwt-secret-not-a-real-one'
export const COMPUTE_KEY = 'test-compute-key-do-not-use-in-production'
export const COMPUTE_URL = 'https://compute.test.invalid'

export const ORG_A = '11111111-1111-1111-1111-111111111111'
export const ORG_B = '22222222-2222-2222-2222-222222222222'
export const PROJECT_A = 'aaaaaaaa-1111-2222-3333-444444444444'
export const PROJECT_B = 'bbbbbbbb-1111-2222-3333-444444444444'
export const USER_A = '99999999-1111-2222-3333-444444444444'

/** One captured query: the SQL text with `$n` holes, plus the bound values. */
export interface CapturedQuery {
  text: string
  params: unknown[]
}

export type QueryHandler = (query: CapturedQuery) => unknown[]

export interface FakeDb {
  sql: Sql
  queries: CapturedQuery[]
  ended: number
}

/**
 * A postgres.js stand-in: a tagged template that records what was asked and
 * returns whatever `handler` decides. Enough surface for the routes, and it
 * keeps the suite free of a live database.
 */
export function createFakeDb(handler: QueryHandler = () => []): FakeDb {
  const state: FakeDb = {
    queries: [],
    ended: 0,
    sql: undefined as unknown as Sql,
  }

  const tag = (strings: TemplateStringsArray, ...params: unknown[]) => {
    const text = strings
      .map((chunk, index) => (index === 0 ? chunk : `$${index}${chunk}`))
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    const query: CapturedQuery = { text, params }
    state.queries.push(query)
    return Promise.resolve(handler(query))
  }

  tag.end = () => {
    state.ended += 1
    return Promise.resolve()
  }

  state.sql = tag as unknown as Sql
  return state
}

/** Minimal in-memory R2 bucket covering the calls the Worker makes. */
export class FakeR2Bucket {
  readonly objects = new Map<
    string,
    { body: ArrayBuffer; customMetadata?: Record<string, string> }
  >()

  async put(
    key: string,
    value: ArrayBuffer,
    options?: { customMetadata?: Record<string, string> },
  ): Promise<{ key: string; size: number }> {
    this.objects.set(key, {
      body: value,
      ...(options?.customMetadata ? { customMetadata: options.customMetadata } : {}),
    })
    return { key, size: value.byteLength }
  }

  async head(key: string): Promise<{ key: string; size: number } | null> {
    const found = this.objects.get(key)
    return found ? { key, size: found.body.byteLength } : null
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key)
  }
}

export interface TestEnv extends Env {
  STARKCONTROLS_FILES: R2Bucket & FakeR2Bucket
}

export function createEnv(overrides: Partial<Env> = {}): TestEnv {
  return {
    HYPERDRIVE: {
      connectionString: 'postgresql://unused:unused@localhost:5432/unused',
    } as Hyperdrive,
    STARKCONTROLS_FILES: new FakeR2Bucket(),
    SUPABASE_JWT_SECRET: JWT_SECRET,
    COMPUTE_API_URL: COMPUTE_URL,
    COMPUTE_API_KEY: COMPUTE_KEY,
    ...overrides,
  } as unknown as TestEnv
}

export interface TestCtx {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
  props: Record<string, unknown>
  readonly settled: Promise<unknown[]>
}

/** An ExecutionContext double that keeps deferred work awaitable. */
export function createCtx(): TestCtx {
  const pending: Promise<unknown>[] = []
  return {
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise)
    },
    passThroughOnException() {},
    props: {},
    get settled() {
      return Promise.all(pending)
    },
  }
}

/** A typed `fetch` double so tests can assert on the outbound request. */
export interface FetchCall {
  url: string
  init: RequestInit
}

export function createFetchStub(
  handler: (call: FetchCall) => Response | Promise<Response> = async () =>
    new Response('{}', { status: 200 }),
): { fetch: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = []
  const stub = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const call = { url: String(input), init }
    calls.push(call)
    return handler(call)
  }) as unknown as typeof fetch
  return { fetch: stub, calls }
}

export interface TokenOptions {
  orgId?: string | null
  userId?: string
  secret?: string
  expiresIn?: string
  algorithm?: string
}

/** Mint a Supabase-shaped JWT for tests. */
export async function mintToken(options: TokenOptions = {}): Promise<string> {
  const {
    orgId = ORG_A,
    userId = USER_A,
    secret = JWT_SECRET,
    expiresIn = '1h',
    algorithm = 'HS256',
  } = options

  const claims: Record<string, unknown> = {
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
  }
  if (orgId !== null) claims['org_id'] = orgId

  return new SignJWT(claims)
    .setProtectedHeader({ alg: algorithm })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret))
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}
