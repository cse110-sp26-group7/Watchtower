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
npx playwright test -g "user can log in"
```

**Watch mode:**
```bash
npx playwright test --watch
```

## Test Files

### `dashboard.spec.js` — Critical Dashboard Tests (7 tests)

1. **User can log in** — Verifies login functionality works end-to-end
2. **Dashboard loads with data** — Confirms dashboard renders and fetches data from API
3. **Errors appear in dashboard** — Tests full SDK → Backend → Dashboard pipeline
4. **Time range filter works** — Verifies filtering re-fetches correct data
5. **Error detail view works** — Tests error detail modal/panel
6. **Deployment timeline shows** — Verifies deployments appear alongside errors
7. **Empty states render correctly** — Tests UI handles no data gracefully

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
- Backend running locally or accessible at `http://localhost:8787`
- Demo user account: `demo@watchtower.dev` / `demo`

## Notes

- Tests use demo project with pre-populated data
- Playwright automatically waits for elements/network requests
- Tests run in parallel by default
- Retries automatically on CI (not locally)
