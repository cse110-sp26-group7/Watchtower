import { test, expect } from '@playwright/test'

/**
 * Auth cutover E2E (Sprint 5 Task 1).
 *
 * Exercises the FE auth wiring end to end: login form -> POST /api/login,
 * logout -> POST /api/logout (server-side revocation), and the 401 -> login
 * redirect in api-client's apiFetch.
 *
 * Every test is hermetic: the whole `/api/**` surface is mocked at the network
 * layer (see beforeEach) so nothing escapes to prod and results don't depend on
 * the CORS allowlist (the Playwright server runs on localhost:8000, which is
 * intentionally not in ALLOWED_ORIGINS) or on real-network timing. The real
 * gated-prod flow is verified separately against the live worker. Per-test
 * `page.route` calls registered below override these defaults (last route wins).
 *
 * Synchronization is on observable effects via expect.poll (which auto-retries),
 * never on waitForRequest — the request is asserted from a recorded log instead,
 * so a single missed click can't hang the test for the full timeout.
 */

const json = (status, body) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

// Report the currently active SPA page id (e.g. "page-login").
const activePageId = (page) =>
  page.evaluate(() => document.querySelector('.page.active')?.id ?? null)

const sessionFlag = (page) => page.evaluate(() => sessionStorage.getItem('loggedIn'))

// Record every /api/* call as "METHOD /api/path" for later assertion.
const recordApiCalls = (page) => {
  const calls = []
  page.on('request', (req) => {
    const u = new URL(req.url())
    if (u.pathname.startsWith('/api/')) calls.push(`${req.method()} ${u.pathname}`)
  })
  return calls
}

// Under parallel workers the dev static server occasionally drops a request at
// startup (a <script> or even the document); the page `load` event still fires,
// so a global is never defined and the page is unusable. CI runs workers=1 and
// is unaffected, but locally this is flaky — retry the whole test so a bad load
// gets a fresh attempt. Bounded goto/waitForFunction timeouts keep each attempt
// well under the test timeout so a dropped request fails fast instead of hanging.
test.describe.configure({ retries: 2 })

// All globals the auth tests drive. A dropped <script> leaves its handler
// undefined, so require every one before considering the app ready. (networkidle
// only means the script *responses* arrived, not that they ran.)
const APP_READY = () =>
  ['navigate', 'getSummary', 'login', 'logout', 'handleLogin', 'handleLogout'].every(
    (fn) => typeof window[fn] === 'function',
  )
const gotoApp = async (page) => {
  await page.goto('dashboard/index.html', { timeout: 10000 })
  await page.waitForFunction(APP_READY, null, { timeout: 5000 })
}

// Default happy-path API: login/logout succeed and reads return empty sets, so
// navigating to a protected page never bounces. Failure cases override below.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/api/login')) {
      return route.fulfill(
        json(200, { user: { id: 'usr_demo', email: 'demo@watchtower.dev' }, projects: [] }),
      )
    }
    if (path.endsWith('/api/logout')) return route.fulfill(json(200, { ok: true }))
    if (path.endsWith('/api/events')) {
      return route.fulfill(json(200, { events: [], next_cursor: null, has_more: false }))
    }
    return route.fulfill(json(200, {}))
  })
})

test('login: submitting demo credentials authenticates and lands on projects', async ({ page }) => {
  const calls = recordApiCalls(page)
  await gotoApp(page)
  await page.evaluate(() => window.navigate('login'))

  await page.fill('#login-email', 'demo@watchtower.dev')
  await page.fill('#login-password', 'demo1234')
  await page.click('#login-button')

  // The client gate is set and the user is moved off the login page.
  await expect.poll(() => sessionFlag(page)).toBe('true')
  await expect.poll(() => activePageId(page)).toBe('page-projects')
  expect(calls).toContain('POST /api/login')
})

test('login: a rejected login surfaces an error and stays on the login page', async ({ page }) => {
  await page.route(`**/api/login`, (route) => route.fulfill(json(401, { error: 'invalid_credentials' })))

  await gotoApp(page)
  await page.evaluate(() => window.navigate('login'))

  await page.fill('#login-email', 'demo@watchtower.dev')
  await page.fill('#login-password', 'wrong-password')
  await page.click('#login-button')

  await expect(page.locator('#login-error')).toContainText('Login failed')
  // A failed login must not flip the client gate or leave the login page.
  expect(await sessionFlag(page)).toBeNull()
  expect(await activePageId(page)).toBe('page-login')
})

test('logout: revokes the session via POST /api/logout and returns to login', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('loggedIn', 'true'))
  const calls = recordApiCalls(page)

  await gotoApp(page)
  await page.evaluate(() => window.navigate('projects'))

  // Open the avatar dropdown, then click Logout.
  await page.click('#avatar-btn')
  await page.click('#avatar-dropdown button')

  await expect.poll(() => activePageId(page)).toBe('page-login')
  await expect.poll(() => sessionFlag(page)).toBeNull()
  expect(calls).toContain('POST /api/logout')
})

test('logout: still clears local state and redirects if the API call fails', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('loggedIn', 'true'))
  // Simulate a network failure on logout — the user must not be stranded.
  await page.route(`**/api/logout`, (route) => route.abort())

  await gotoApp(page)
  await page.evaluate(() => window.navigate('projects'))

  await page.click('#avatar-btn')
  await page.click('#avatar-dropdown button')

  await expect.poll(() => activePageId(page)).toBe('page-login')
  await expect.poll(() => sessionFlag(page)).toBeNull()
})

test('apiFetch: a 401 clears the gate and redirects to login', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('loggedIn', 'true'))
  // Every authenticated read returns 401 (expired/missing cookie in prod).
  await page.route('**/api/**', (route) => route.fulfill(json(401, { error: 'unauthorized' })))

  await gotoApp(page)

  // Drive a read through api-client; apiFetch should trap the 401.
  await page.evaluate(() => window.getSummary('wt_demo').catch(() => {}))

  await expect.poll(() => activePageId(page)).toBe('page-login')
  await expect.poll(() => sessionFlag(page)).toBeNull()
})
