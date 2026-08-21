import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import type { Env } from './lib/db.js'
import { authMiddleware, type Variables } from './middleware/auth.js'
import projects from './routes/projects.js'
import uploads from './routes/uploads.js'

export type AppEnv = { Bindings: Env; Variables: Variables }

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  // Open: used by uptime checks, reveals nothing about tenants.
  app.get('/healthz', (c) => c.json({ status: 'ok', service: 'starkcontrols-edge' }))

  // Everything else is org-scoped and requires a verified Supabase JWT.
  app.use('/projects/*', authMiddleware)
  app.use('/projects', authMiddleware)
  app.use('/uploads/*', authMiddleware)

  app.route('/projects', projects)
  app.route('/uploads', uploads)

  app.notFound((c) => c.json({ error: 'not found' }, 404))

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ error: error.message }, error.status)
    }
    // Never surface a driver or upstream error verbatim — it can carry
    // connection strings and table contents.
    console.error('unhandled error', error)
    return c.json({ error: 'internal error' }, 500)
  })

  return app
}

export default createApp()
