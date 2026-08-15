import postgres from 'postgres'

/**
 * Bindings and secrets available to the Worker.
 *
 * `HYPERDRIVE` is the Hyperdrive binding configured in wrangler.toml with the
 * id held in `HYPERDRIVE_ID`; `STARKCONTROLS_FILES` is the R2 bucket that
 * receives uploaded schedule files. The remaining values are wrangler secrets.
 */
export interface Env {
  HYPERDRIVE: Hyperdrive
  STARKCONTROLS_FILES: R2Bucket
  SUPABASE_JWT_SECRET: string
  COMPUTE_API_URL: string
  COMPUTE_API_KEY: string
}

/**
 * The subset of postgres.js the Worker uses. Narrowing it here keeps the
 * routes honest about what they depend on and lets tests substitute a double.
 */
export type Sql = ReturnType<typeof postgres>

export type DbFactory = (env: Env) => Sql

const defaultFactory: DbFactory = (env) =>
  postgres(env.HYPERDRIVE.connectionString, {
    // Hyperdrive already pools on the edge, so hold the minimum here.
    max: 5,
    // The Supabase transaction pooler behind Hyperdrive supports neither
    // prepared statements nor the type-introspection round trip.
    prepare: false,
    fetch_types: false,
  })

let factory: DbFactory = defaultFactory

/** Open a connection for the current request. */
export function getDb(env: Env): Sql {
  return factory(env)
}

/** Swap the connection factory — tests inject a double through this. */
export function setDbFactory(next: DbFactory): void {
  factory = next
}

/** Restore the real postgres.js factory. */
export function resetDbFactory(): void {
  factory = defaultFactory
}

/**
 * The one thing this module needs from an execution context. Typed structurally
 * because Hono and workers-types each declare their own `ExecutionContext`.
 */
export interface Deferrable {
  waitUntil(promise: Promise<unknown>): void
}

/**
 * Run `fn` with a request-scoped connection, closing it after the response has
 * been produced. Closing is deferred to `waitUntil` so a slow teardown never
 * delays the client.
 */
export async function withDb<T>(
  env: Env,
  ctx: Deferrable | undefined,
  fn: (sql: Sql) => Promise<T>,
): Promise<T> {
  const sql = getDb(env)
  try {
    return await fn(sql)
  } finally {
    const closing = sql.end({ timeout: 5 })
    if (ctx) {
      ctx.waitUntil(closing)
    } else {
      await closing
    }
  }
}
