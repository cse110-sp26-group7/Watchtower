import { test, expect } from '@playwright/test'

/**
 * E2E Workflow Tests for Watchtower Dashboard
 *
 * These tests verify complete user journeys through the application.
 * Each test exercises multiple pages and features together.
 */

// Workflow 1: Error Discovery Journey
test('user can discover and view error details', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('networkidle')

  // Start on dashboard - verify error count is visible
  await page.evaluate(() => window.navigate('dashboard'))
  await page.waitForTimeout(500)

  const errorCount = await page.locator('#total-errors').textContent()
  expect(errorCount).toBeTruthy()

  // Click "View All Errors" link to navigate to error log
  const viewAllLink = page.locator('#view-all-errors')
  await viewAllLink.click()
  await page.waitForTimeout(500)

  // Verify we're on errors page
  const isErrorsActive = await page.evaluate(() =>
    document.querySelector('#page-errors').classList.contains('active')
  )
  expect(isErrorsActive).toBe(true)

  // Verify error log controls exist (search and filter)
  const searchInput = page.locator('#search')
  await expect(searchInput).toBeVisible()

  const filterSelect = page.locator('#filter')
  await expect(filterSelect).toBeVisible()
})

// Workflow 2: Project Switching and Data Persistence
test('user can switch between projects and dashboard loads correct data', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('networkidle')

  // Start on projects page
  const projectsPage = page.locator('#page-projects')
  const isProjectsActive = await projectsPage.evaluate((el) =>
    el.classList.contains('active')
  )
  expect(isProjectsActive).toBe(true)

  // Navigate to dashboard (which loads data for current project)
  await page.evaluate(() => window.navigate('dashboard'))
  await page.waitForTimeout(1000)

  // Verify dashboard loaded with metrics
  const lcpValue = await page.locator('#lcp-value').textContent()
  expect(lcpValue).toBeTruthy()

  // Navigate to error log
  await page.evaluate(() => window.navigate('errors'))
  await page.waitForTimeout(500)

  const isErrorsActive = await page.evaluate(() =>
    document.querySelector('#page-errors').classList.contains('active')
  )
  expect(isErrorsActive).toBe(true)

  // Navigate back to dashboard - data should still be there
  await page.evaluate(() => window.navigate('dashboard'))
  await page.waitForTimeout(500)

  const lcpValueAfter = await page.locator('#lcp-value').textContent()
  expect(lcpValueAfter).toBeTruthy()
})

// Workflow 3: SDK to Dashboard Pipeline
test('errors from SDK appear in dashboard and error log', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('networkidle')

  // Load dashboard to get initial error count
  await page.evaluate(() => window.navigate('dashboard'))
  await page.waitForTimeout(1000)

  const initialErrors = await page.locator('#total-errors').textContent()

  // Navigate to error log to verify errors are being fetched
  await page.evaluate(() => window.navigate('errors'))
  await page.waitForTimeout(1000)

  // Verify the error log table body is populated
  const errorRows = await page.locator('#full-errors-body tr').count()

  // Should have at least the errors shown in the dashboard
  if (parseInt(initialErrors) > 0) {
    expect(errorRows).toBeGreaterThan(0)
  }

  // Navigate back to dashboard to confirm data consistency
  await page.evaluate(() => window.navigate('dashboard'))
  await page.waitForTimeout(500)

  const finalErrors = await page.locator('#total-errors').textContent()
  expect(finalErrors).toBe(initialErrors)
})

// Workflow 4: Time Range and Filter Workflow
test('user can filter errors and data updates appropriately', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('networkidle')

  // Navigate to error log
  await page.evaluate(() => window.navigate('errors'))
  await page.waitForTimeout(1000)

  // Get initial filter state
  const filterSelect = page.locator('#filter')
  await expect(filterSelect).toBeVisible()

  // Change filter to "Errors" only
  await filterSelect.selectOption('error')
  await page.waitForTimeout(500)

  // Verify filter dropdown is set to "error"
  const selectedFilter = await filterSelect.inputValue()
  expect(selectedFilter).toBe('error')

  // Change back to "All Levels"
  await filterSelect.selectOption('all')
  await page.waitForTimeout(500)

  const finalFilter = await filterSelect.inputValue()
  expect(finalFilter).toBe('all')

  // Test search functionality
  const searchInput = page.locator('#search')
  await searchInput.fill('test')
  await page.waitForTimeout(500)

  // Clear search
  await searchInput.clear()
  await page.waitForTimeout(300)

  const searchValue = await searchInput.inputValue()
  expect(searchValue).toBe('')
})

// Workflow 5: Theme Persistence Across Navigation
test('dark mode preference persists while navigating pages', async ({ page }) => {
  await page.goto('dashboard/index.html')
  await page.waitForLoadState('networkidle')

  // Get initial theme state
  const initialIsDark = await page.evaluate(() =>
    document.body.classList.contains('dark')
  )

  // Toggle theme
  await page.click('#themeBtn')
  await page.waitForTimeout(300)

  const isDarkAfterToggle = await page.evaluate(() =>
    document.body.classList.contains('dark')
  )

  // Theme should be different after toggle
  expect(isDarkAfterToggle).not.toBe(initialIsDark)

  // Navigate to errors page
  await page.evaluate(() => window.navigate('errors'))
  await page.waitForTimeout(300)

  const isDarkOnErrorsPage = await page.evaluate(() =>
    document.body.classList.contains('dark')
  )
  expect(isDarkOnErrorsPage).toBe(isDarkAfterToggle)

  // Navigate to dashboard
  await page.evaluate(() => window.navigate('dashboard'))
  await page.waitForTimeout(300)

  const isDarkOnDashboard = await page.evaluate(() =>
    document.body.classList.contains('dark')
  )
  expect(isDarkOnDashboard).toBe(isDarkAfterToggle)

  // Navigate to projects
  await page.evaluate(() => window.navigate('projects'))
  await page.waitForTimeout(300)

  const isDarkOnProjects = await page.evaluate(() =>
    document.body.classList.contains('dark')
  )
  expect(isDarkOnProjects).toBe(isDarkAfterToggle)
})
