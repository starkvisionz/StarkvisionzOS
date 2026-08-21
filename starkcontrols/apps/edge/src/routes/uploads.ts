import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { withDb, type Env } from '../lib/db.js'
import type { Variables } from '../middleware/auth.js'
import { requireProjectInOrg } from '../middleware/tenant.js'

/** Hard ceiling on a single schedule upload. */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

const uploads = new Hono<{ Bindings: Env; Variables: Variables }>()

/**
 * R2 key layout. Org first so a bucket-level prefix listing can never cross a
 * tenant boundary, and a fresh uuid per upload so re-uploading the same file
 * never overwrites the object an existing snapshot points at.
 */
export function xerObjectKey(
  orgId: string,
  projectId: string,
  uploadId: string,
): string {
  return `orgs/${orgId}/projects/${projectId}/xer/${uploadId}.xer`
}

function tooLarge(): HTTPException {
  return new HTTPException(413, {
    message: `upload exceeds the ${MAX_UPLOAD_BYTES} byte limit`,
  })
}

/** Reject on the declared length before reading a single byte of the body. */
function assertDeclaredSize(contentLength: string | undefined): void {
  if (!contentLength) return
  const declared = Number(contentLength)
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) {
    throw tooLarge()
  }
}

interface UploadPayload {
  bytes: ArrayBuffer
  projectId: string | null
  filename: string | null
}

async function readUpload(c: {
  req: { header: (name: string) => string | undefined; raw: Request }
}): Promise<UploadPayload> {
  const contentType = c.req.header('Content-Type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const form = await c.req.raw.formData()
    const part = form.get('file')
    // `File` is a type but not a value in workers-types, so the check is
    // structural rather than an `instanceof`.
    if (part === null || typeof part === 'string') {
      throw new HTTPException(400, {
        message: 'multipart upload requires a "file" part',
      })
    }
    const file = part as { size: number; name?: string; arrayBuffer(): Promise<ArrayBuffer> }
    if (file.size > MAX_UPLOAD_BYTES) throw tooLarge()

    const projectField = form.get('project_id')
    return {
      bytes: await file.arrayBuffer(),
      projectId: typeof projectField === 'string' ? projectField : null,
      filename: file.name || null,
    }
  }

  const bytes = await c.req.raw.arrayBuffer()
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw tooLarge()
  return { bytes, projectId: null, filename: null }
}

/**
 * `POST /uploads/xer` — store a P6 export in R2 and hand back its key.
 *
 * The project is identified by the `project_id` query parameter, or by a
 * `project_id` field when the request is multipart. Nothing is written until the
 * project has been confirmed to belong to the caller's org.
 */
uploads.post('/xer', async (c) => {
  assertDeclaredSize(c.req.header('Content-Length'))

  const upload = await readUpload(c)
  if (upload.bytes.byteLength === 0) {
    throw new HTTPException(400, { message: 'empty upload' })
  }

  const projectId = c.req.query('project_id') ?? upload.projectId
  if (!projectId) {
    throw new HTTPException(400, { message: 'project_id is required' })
  }

  const orgId = c.get('orgId')
  await withDb(c.env, c.executionCtx, async (sql) => {
    await requireProjectInOrg(sql, projectId, orgId)
  })

  const key = xerObjectKey(orgId, projectId, crypto.randomUUID())
  await c.env.STARKCONTROLS_FILES.put(key, upload.bytes, {
    httpMetadata: { contentType: 'application/octet-stream' },
    customMetadata: {
      org_id: orgId,
      project_id: projectId,
      uploaded_by: c.get('userId'),
      ...(upload.filename ? { original_filename: upload.filename } : {}),
    },
  })

  return c.json({ r2_key: key }, 201)
})

export default uploads
