# E2E Tests for Watchtower Dashboard

End-to-end tests for the Watchtower dashboard using Playwright.

## Setup

```bash
npm install -D @playwright/test
```

## Running Tests

**Run all E2E tests:**
```bash
npx playwright test
```

**Run tests in headed mode (see browser):**
```bash
npx playwright test --headed
```

**Run specific test file:**
```bash
npx playwright test e2e/dashboard.spec.js
```

**Run single test:**
```bash
npx playwright test -g "JavaScript initializes"
```

**Watch mode:**
```bash
npx playwright test --watch
```

## Test Files

### `dashboard.spec.js` — Critical Dashboard Tests (7 tests)

1. **dashboard HTML file loads and renders basic structure** — Verifies page title, navbar, sidebar, and main content area are present
2. **dashboard page structure elements are present** — Checks that page divs (#page-projects, #page-dashboard, #page-errors) exist in DOM
3. **JavaScript initializes and window functions are available** — Verifies navigate() and getEvents() functions are available after scripts load
4. **dashboard page displays performance metrics** — Tests navigation to dashboard and verifies LCP, FCP, CLS metric elements are present
5. **errors page can be navigated to** — Tests navigation to error log page and verifies search input exists
6. **projects page loads as default** — Verifies projects page and sidebar button exist in DOM on initial load
7. **can navigate between all pages** — Tests navigation between dashboard, errors, and projects pages using navigate() function

## Test Structure

Each test follows this pattern:

```javascript
test('description', async ({ page }) => {
  // 1. Setup: Login if needed
  // 2. Action: User interacts with UI
  // 3. Wait: Network requests complete
  // 4. Assert: Verify expected outcome
})
```

## Debugging Failed Tests

**View test report:**
```bash
npx playwright show-report
```

**Debug mode (interactive):**
```bash
npx playwright test --debug
```

**Screenshot on failure:**
Tests automatically take screenshots when they fail (see `test-results/` folder)

## CI/CD Integration

Tests run in GitHub Actions on every PR (after unit tests pass):

```yaml
- name: Run E2E tests
  run: npx playwright test
```

## Requirements

- Node.js 18+
- Python 3 (for HTTP server on port 8000)
- Playwright browsers installed: `npx playwright install chromium`

## Notes

- Tests use the actual dashboard HTML/JS with live API calls to watchtower-api.cse110piedpiper7.workers.dev
- HTTP server automatically starts on port 8000 when running tests
- Playwright automatically waits for elements/network requests
- Tests run in parallel by default
- Retries automatically on CI (not locally)
