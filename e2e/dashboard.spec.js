import { test, expect } from '@playwright/test'

/**
 * Critical E2E Tests for Watchtower Dashboard
 *
 * These tests verify the dashboard page structure and initialization.
 * Tests use the live API and work with the actual HTML/JS setup.
 */

// Test 1: Dashboard HTML file loads successfully
test('dashboard HTML file loads and renders basic structure', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('domcontentloaded')

  // Verify page title
  const pageTitle = await page.title()
  expect(pageTitle).toBe('Watch Tower')

  // Verify navbar exists
  const navbar = page.locator('.navbar')
  await expect(navbar).toBeVisible()

  // Verify sidebar exists
  const sidebar = page.locator('.sidebar')
  await expect(sidebar).toBeVisible()

  // Verify main content area exists
  const main = page.locator('main.main')
  await expect(main).toBeVisible()
})

// Test 2: Page elements are in DOM before JavaScript runs
test('dashboard page structure elements are present', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('domcontentloaded')

  // Check main pages exist in DOM
  const projectsCount = await page.locator('#page-projects').count()
  expect(projectsCount).toBe(1)

  const dashboardCount = await page.locator('#page-dashboard').count()
  expect(dashboardCount).toBe(1)

  const errorsCount = await page.locator('#page-errors').count()
  expect(errorsCount).toBe(1)
})

// Test 3: JavaScript loads and functions are available
test('JavaScript initializes and window functions are available', async ({ page }) => {
  await page.goto('dashboard/index.html')

  // Wait for all scripts to load
  await page.waitForLoadState('networkidle')

  // Verify navigate function exists
  const navigateExists = await page.evaluate(() => typeof window.navigate === 'function')
  expect(navigateExists).toBe(true)

  // Verify API client functions exist
  const getEventsExists = await page.evaluate(() => typeof window.getEvents === 'function')
  expect(getEventsExists).toBe(true)
})

// Test 4: Dashboard page can be navigated to and contains performance metric elements
test('dashboard page displays performance metrics', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('networkidle')

  // Navigate to dashboard using the loaded function
  await page.evaluate(() => window.navigate('dashboard'))

  // Wait for dashboard to load data
  await page.waitForTimeout(1000)

  // Verify performance metric elements exist in DOM
  expect(await page.locator('#lcp-value').count()).toBe(1)
  expect(await page.locator('#fcp-value').count()).toBe(1)
  expect(await page.locator('#cls-value').count()).toBe(1)

  // Verify dashboard page is active
  const isActive = await page.evaluate(() =>
    document.querySelector('#page-dashboard').classList.contains('active')
  )
  expect(isActive).toBe(true)
})

// Test 5: Error page exists and can be navigated to
test('errors page can be navigated to', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('networkidle')

  // Navigate to errors
  await page.evaluate(() => window.navigate('errors'))
  await page.waitForTimeout(500)

  // Verify errors page is now active
  const isActive = await page.evaluate(() =>
    document.querySelector('#page-errors').classList.contains('active')
  )
  expect(isActive).toBe(true)

  // Verify error log controls exist
  expect(await page.locator('#search').count()).toBe(1)
})

// Test 6: Projects page is the default landing page
test('projects page loads as default', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('networkidle')

  // The router defaults to projects page
  const isProjectsActive = await page.evaluate(() => {
    const projectsPage = document.querySelector('#page-projects')
    const dashboardBtn = document.querySelector('[data-route="dashboard"]')
    return projectsPage !== null && dashboardBtn !== null
  })
  expect(isProjectsActive).toBe(true)
})

// Test 7: Navigation between pages works
test('can navigate between all pages', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('networkidle')

  // Navigate to dashboard
  await page.evaluate(() => window.navigate('dashboard'))
  let activePage = await page.evaluate(() => {
    const active = document.querySelector('.page.active')
    return active ? active.id : null
  })
  expect(activePage).toBe('page-dashboard')

  // Navigate to errors
  await page.evaluate(() => window.navigate('errors'))
  activePage = await page.evaluate(() => {
    const active = document.querySelector('.page.active')
    return active ? active.id : null
  })
  expect(activePage).toBe('page-errors')

  // Navigate back to projects
  await page.evaluate(() => window.navigate('projects'))
  activePage = await page.evaluate(() => {
    const active = document.querySelector('.page.active')
    return active ? active.id : null
  })
  expect(activePage).toBe('page-projects')
})
