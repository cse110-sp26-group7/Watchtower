# Running Tests

## Setup
```bash
cd client
npm install
```

## Run Tests
```bash
npm run test:run
```

Watch mode:
```bash
npm test
```

26 tests total. 23 pass; 3 are known failures in Test 3 and Test 4 that assert on `session_id`, which is not yet implemented in this version of the SDK.
