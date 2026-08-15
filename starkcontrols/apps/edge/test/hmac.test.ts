import { describe, expect, it, vi } from 'vitest'

import { SIGNATURE_HEADER, postSigned, signBody } from '../src/middleware/hmac.js'
import { createFetchStub } from './harness.js'

describe('signBody', () => {
  it('matches the vector pinned in the compute service test suite', async () => {
    // Same assertion as apps/compute/tests/test_auth.py::test_sign_body_matches_a_known_vector
    expect(await signBody('hello world', 'secret')).toBe(
      '734cc62f32841568f45715aeb9f4d7891324e6d948e4c6c60c0621cdac48623a',
    )
  })

  it('produces lowercase hex of the expected length', async () => {
    const signature = await signBody('{}', 'k')
    expect(signature).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for the same body and key', async () => {
    expect(await signBody('payload', 'k')).toBe(await signBody('payload', 'k'))
  })

  it('changes when the body changes', async () => {
    expect(await signBody('payload', 'k')).not.toBe(await signBody('payloa', 'k'))
  })

  it('changes when the key changes', async () => {
    expect(await signBody('payload', 'k1')).not.toBe(await signBody('payload', 'k2'))
  })

  it('handles non-ASCII bodies as UTF-8', async () => {
    await expect(signBody('{"name":"Pour slab 90°"}', 'k')).resolves.toMatch(
      /^[0-9a-f]{64}$/,
    )
  })
})

describe('postSigned', () => {
  it('signs exactly the bytes it sends', async () => {
    const stub = createFetchStub()
    vi.stubGlobal('fetch', stub.fetch)

    await postSigned('https://compute.test', '/xer/parse', { r2_key: 'k' }, 'secret')

    const { init } = stub.calls[0]!
    const body = init.body as string
    const headers = init.headers as Record<string, string>

    expect(body).toBe('{"r2_key":"k"}')
    expect(headers[SIGNATURE_HEADER]).toBe(await signBody(body, 'secret'))
    expect(headers['Content-Type']).toBe('application/json')

    vi.unstubAllGlobals()
  })

  it('does not double up slashes when the base url has a trailing one', async () => {
    const stub = createFetchStub()
    vi.stubGlobal('fetch', stub.fetch)

    await postSigned('https://compute.test/', '/xer/import', {}, 'secret')
    expect(stub.calls[0]?.url).toBe('https://compute.test/xer/import')

    vi.unstubAllGlobals()
  })
})
