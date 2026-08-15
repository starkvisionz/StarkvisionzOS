/**
 * Outbound request signing for the compute service.
 *
 * The compute service authenticates callers by HMAC-SHA256 over the raw request
 * body (see `apps/compute/app/auth.py`), so the exact bytes that are signed must
 * be the exact bytes that are sent — the body is serialised once here and reused
 * for both.
 */

export const SIGNATURE_HEADER = 'X-SVH-Signature'

const encoder = new TextEncoder()

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Hex HMAC-SHA256 of `body` under `key`. */
export async function signBody(body: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(body),
  )
  return toHex(signature)
}

/**
 * POST a JSON payload to the compute service with a valid signature.
 *
 * `baseUrl` is `COMPUTE_API_URL`; `path` is the service-relative route such as
 * `/xer/import`.
 */
export async function postSigned(
  baseUrl: string,
  path: string,
  payload: unknown,
  key: string,
  init: { signal?: AbortSignal } = {},
): Promise<Response> {
  const body = JSON.stringify(payload)
  const signature = await signBody(body, key)

  return fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [SIGNATURE_HEADER]: signature,
    },
    body,
    ...(init.signal ? { signal: init.signal } : {}),
  })
}
