import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

let fetchDatabaseManifest: typeof import('./databaseUpdateService').fetchDatabaseManifest
const originalFetch = globalThis.fetch

function stubManifestResponse(body: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch
}

describe('fetchDatabaseManifest', () => {
  beforeAll(async () => {
    // Das Modul liest beim Import `window.__aytoDataPreloaded`, in der Node-Testumgebung gibt es kein window
    vi.stubGlobal('window', {})
    ;({ fetchDatabaseManifest } = await import('./databaseUpdateService'))
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('accepts a manifest without dataHash (ODI-368)', async () => {
    stubManifestResponse({ version: 'v1.14.2', released: '2026-10-15T20:00:00.000Z' })

    await expect(fetchDatabaseManifest()).resolves.toEqual({
      version: 'v1.14.2',
      released: '2026-10-15T20:00:00.000Z'
    })
  })

  it('still accepts an older manifest that carries a dataHash', async () => {
    stubManifestResponse({ version: 'v1.14.1', dataHash: '278a27cf', released: '2026-10-15T20:00:00.000Z' })

    const manifest = await fetchDatabaseManifest()
    expect(manifest.version).toBe('v1.14.1')
  })

  it.each([
    ['version', { released: '2026-10-15T20:00:00.000Z' }],
    ['released', { version: 'v1.14.2' }]
  ])('rejects a manifest without %s', async (_field, body) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stubManifestResponse(body)

    await expect(fetchDatabaseManifest()).rejects.toThrow('Ungültiges Manifest-Format')
  })
})
