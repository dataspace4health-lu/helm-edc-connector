# EDC Connector Tests

End-to-end tests for EDC Connector Dashboard and Management API using Playwright.

## Test Suites

### Assets Tests
Test asset registration and management via Management API.

#### Pass Tests
- **GET assets** - Retrieve list of all assets
- **POST minimal asset** - Create HttpData asset with basic properties
- **POST asset with additional properties** - Create asset with version and description
- **POST asset with authentication** - Create asset with auth key and secret
- **POST asset with POST method** - Create asset using POST HTTP method
- **POST asset with proxy** - Create asset with proxy settings

#### Fail Tests
- Currently no explicit failure tests defined

---

### Policy Definitions Tests
Test policy creation with ODRL constraints and permissions.

#### Pass Tests
- **GET policy definitions** - Retrieve list of all policies
- **POST empty default policy** - Create policy allowing everything (empty permissions/prohibitions/obligations)
- **POST policy with use action** - Create policy with `odrl:use` permission
- **POST policy with time constraint** - Create policy with time-based constraint (`inForceDate`)

#### Fail Tests
- **POST policy with read action** - Fails because `odrl:read` is not bound to any scopes
- **POST policy with multiple permissions** - Fails when including `odrl:read` in permissions array
- **POST policy with prohibition** - Fails because `odrl:distribute` prohibition is not bound to scopes

---

### Contract Definitions Tests
Test contract definition creation linking assets and policies.

#### Pass Tests
- **GET contract definitions** - Retrieve list of all contract definitions
- **POST minimal contract definition** - Create with required fields (accessPolicyId, contractPolicyId, empty assetsSelector)
- **POST with single asset selector** - Create with criterion targeting specific asset ID
- **POST with IN operator** - Create with criterion using `in` operator for multiple assets
- **POST with private properties** - Create with custom properties (department, region)
- **POST and verify retrieval** - Create and confirm it can be retrieved

#### Fail Tests
- **POST without accessPolicyId** - Fails validation (400) when accessPolicyId is missing
- **POST without contractPolicyId** - Fails validation (400) when contractPolicyId is missing

---

### Dashboard Integration Tests
Test dashboard UI interactions and data flow.

#### Pass Tests
- **Create asset via dashboard** - Complete form submission and verify asset creation
- Tests for policies, contract definitions, and catalog browsing via UI

#### Fail Tests
- Dashboard tests verify proper error handling through form validation

---

## Configuration

### Environment Variables
Configure tests via `.env` file:

```bash
# Dashboard URL
DASHBOARD_BASE_URL=https://dataspace4health.local/edc/dashboard

# Management API endpoint
MANAGEMENT_API_URL=https://dataspace4health.local/edc/cp/management/api

# Navigation timeout (ms)
DEFAULT_TIMEOUT=30000
```

### Playwright Configuration
- **Browser**: Chromium (Desktop Chrome)
- **Test timeout**: 60 seconds
- **Action timeout**: 15 seconds
- **Parallel execution**: Enabled (disabled in CI)
- **Retries**: 2 (CI only)
- **Screenshot**: On failure
- **Video**: Retained on failure
- **HTTPS errors**: Ignored

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your environment URLs
   ```

3. Ensure EDC services are running:
   - Control Plane (Management API)
   - Dashboard UI
   - Services accessible at configured URLs

## Running Tests

```bash
# Run all tests
npm test

# Run with UI mode
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Debug mode
npm run test:debug

# View HTML report
npm run test:report
```

## Test Structure

```
tests/
├── src/
│   ├── assets.spec.ts              # Asset API tests
│   ├── policies.spec.ts            # Policy API tests
│   ├── contract-definitions.spec.ts # Contract definition API tests
│   └── dashboard.spec.ts           # Dashboard UI tests
├── .env                            # Environment configuration
├── package.json                    # Dependencies and scripts
├── playwright.config.ts            # Test configuration
└── README.md                       # This file
```

## Notes

- Tests use timestamped IDs to avoid conflicts
- API tests use POST requests for GET operations (EDC pattern)
- Dashboard tests include diagnostic helpers for troubleshooting
- All tests ignore HTTPS certificate errors for local development
