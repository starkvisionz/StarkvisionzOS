import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { jwtVerify } from 'jose'

import type { Env } from '../lib/db.js'

/** Request-scoped values every authenticated route can rely on. */
export interface Variables {
  orgId: string
  userId: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function unauthorized(): HTTPException {
  // Deliberately uniform: the caller learns that auth failed, not why.
  return new HTTPException(401, { message: 'unauthorized' })
}

function bearerToken(header: string | undefined): string {
  if (!header) throw unauthorized()
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) throw unauthorized()
  return token
}

/**
 * Verify the Supabase-issued JWT and pin the request to one org.
 *
 * Supabase signs project JWTs with HS256 using the project's JWT secret, so the
 * algorithm is pinned here — accepting `alg` from the token itself is how JWT
 * implementations get broken. The `org_id` claim is the same value the database
 * RLS policies compare against, so the edge and the database agree on tenancy
 * by construction.
 */
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env
  Variables: Variables
}> = async (c, next) => {
  const secret = c.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new HTTPException(503, { message: 'auth is not configured' })
  }

  const token = bearerToken(c.req.header('Authorization'))

  let payload: Record<string, unknown>
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    })
    payload = verified.payload as Record<string, unknown>
  } catch {
    throw unauthorized()
  }

  const orgId = payload['org_id']
  const userId = payload['sub']
  if (typeof orgId !== 'string' || !UUID_PATTERN.test(orgId)) {
    throw unauthorized()
  }
  if (typeof userId !== 'string' || userId.length === 0) {
    throw unauthorized()
  }

  c.set('orgId', orgId)
  c.set('userId', userId)
  await next()
}
