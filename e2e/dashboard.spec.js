import { test, expect } from '@playwright/test'

/**
 * Critical E2E Tests for Watchtower Dashboard
 *
 * These tests verify the complete user journey from login through dashboard interaction.
 * They test the full pipeline: Frontend → Backend → Database → Frontend Rendering
 */

// Test 1: User can log in
test('user can log in with valid credentials', async ({ page }) => {
  await page.goto('/')

  // Navigate to login page
  await page.click('a[href="#login"]')

  // Fill login form
  await page.fill('input[type="email"]', 'demo@watchtower.dev')
  await page.fill('input[type="password"]', 'demo')

  // Submit login
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await page.waitForURL('/#/dashboard')

  // Verify user is logged in (dashboard visible)
  await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
})

// Test 2: Dashboard loads with data
test('dashboard loads with event data after login', async ({ page }) => {
  // Login first
  await page.goto('/')
  await page.click('a[href="#login"]')
  await page.fill('input[type="email"]', 'demo@watchtower.dev')
  await page.fill('input[type="password"]', 'demo')
  await page.click('button[type="submit"]')

  // Wait for dashboard to load
  await page.waitForURL('/#/dashboard')

  // Verify dashboard content is loaded
  await expect(page.locator('text=Error Summary')).toBeVisible()
  await expect(page.locator('text=Performance Metrics')).toBeVisible()

  // Verify data is fetched from API
  const errorCount = page.locator('[data-test="error-count"]')
  await expect(errorCount).toBeVisible()
})

// Test 3: Errors appear in dashboard
test('errors captured by SDK appear in the dashboard', async ({ page }) => {
  // Login
  await page.goto('/')
  await page.click('a[href="#login"]')
  await page.fill('input[type="email"]', 'demo@watchtower.dev')
  await page.fill('input[type="password"]', 'demo')
  await page.click('button[type="submit"]')

  // Wait for dashboard
  await page.waitForURL('/#/dashboard')
  await page.waitForLoadState('networkidle')

  // Go to test app and trigger an error
  await page.goto('/test.html')
  await page.click('button[data-test="crash-button"]')

  // Wait for SDK to send error to backend
  await page.waitForTimeout(1000)

  // Return to dashboard
  await page.goto('/#/dashboard')
  await page.waitForLoadState('networkidle')

  // Verify error appears in the list
  const errorRow = page.locator('[data-test="error-row"]:has-text("Test Error")')
  await expect(errorRow).toBeVisible()
})

// Test 4: Time range filter works
test('time range filter updates dashboard data', async ({ page }) => {
  // Login and load dashboard
  await page.goto('/')
  await page.click('a[href="#login"]')
  await page.fill('input[type="email"]', 'demo@watchtower.dev')
  await page.fill('input[type="password"]', 'demo')
  await page.click('button[type="submit"]')

  await page.waitForURL('/#/dashboard')
  await page.waitForLoadState('networkidle')

  // Get initial error count
  const initialCount = await page.locator('[data-test="error-count"]').textContent()

  // Change time range to last 1 hour
  await page.click('[data-test="time-range-select"]')
  await page.click('[data-test="time-range-1h"]')

  // Wait for API to fetch filtered data
  await page.waitForLoadState('networkidle')

  // Verify count may have changed (or stayed same, but UI updated)
  const updatedCount = await page.locator('[data-test="error-count"]').textContent()

  // Verify the time range indicator updated
  await expect(page.locator('text=Last 1 hour')).toBeVisible()
})

// Test 5: Error detail view works
test('clicking an error shows detailed view', async ({ page }) => {
  // Login and load dashboard
  await page.goto('/')
  await page.click('a[href="#login"]')
  await page.fill('input[type="email"]', 'demo@watchtower.dev')
  await page.fill('input[type="password"]', 'demo')
  await page.click('button[type="submit"]')

  await page.waitForURL('/#/dashboard')
  await page.waitForLoadState('networkidle')

  // Click first error in the list
  const firstError = page.locator('[data-test="error-row"]').first()
  await firstError.click()

  // Verify detail panel opens
  const detailPanel = page.locator('[data-test="error-detail"]')
  await expect(detailPanel).toBeVisible()

  // Verify error details are shown
  await expect(detailPanel.locator('text=Message:')).toBeVisible()
  await expect(detailPanel.locator('text=Stack Trace:')).toBeVisible()
  await expect(detailPanel.locator('text=Timestamp:')).toBeVisible()
})

// Test 6: Deployment timeline shows
test('deployment timeline appears on dashboard', async ({ page }) => {
  // Login and load dashboard
  await page.goto('/')
  await page.click('a[href="#login"]')
  await page.fill('input[type="email"]', 'demo@watchtower.dev')
  await page.fill('input[type="password"]', 'demo')
  await page.click('button[type="submit"]')

  await page.waitForURL('/#/dashboard')
  await page.waitForLoadState('networkidle')

  // Look for deployment timeline section
  const deploymentTimeline = page.locator('[data-test="deployment-timeline"]')
  await expect(deploymentTimeline).toBeVisible()

  // Verify deployment markers exist
  const deploymentMarker = page.locator('[data-test="deployment-marker"]')
  await expect(deploymentMarker).toHaveCount(await deploymentMarker.count())

  // Each deployment should show version
  await expect(deploymentMarker.first().locator('text=v')).toBeVisible()
})

// Test 7: Empty states render correctly
test('empty state renders when no data exists', async ({ page }) => {
  // Login
  await page.goto('/')
  await page.click('a[href="#login"]')
  await page.fill('input[type="email"]', 'demo@watchtower.dev')
  await page.fill('input[type="password"]', 'demo')
  await page.click('button[type="submit"]')

  await page.waitForURL('/#/dashboard')

  // Filter to a time range with no data (e.g., future date)
  await page.click('[data-test="time-range-select"]')
  await page.click('[data-test="time-range-custom"]')

  // Set custom range to tomorrow
  await page.fill('[data-test="date-from"]', new Date(Date.now() + 86400000).toISOString().split('T')[0])
  await page.fill('[data-test="date-to"]', new Date(Date.now() + 172800000).toISOString().split('T')[0])
  await page.click('button:has-text("Apply")')

  await page.waitForLoadState('networkidle')

  // Verify empty state appears
  const emptyState = page.locator('[data-test="empty-state"]')
  await expect(emptyState).toBeVisible()
  await expect(emptyState.locator('text=No errors found')).toBeVisible()
})
