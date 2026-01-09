import { test, expect } from '@playwright/test';

const MANAGEMENT_API_URL = process.env.MANAGEMENT_API_URL || 'https://dataspace4health.local/edc/cp/management/api';

test.describe('Data Assets Registration - API Tests', () => {
  let createdAssetId: string;

  // The GET is performed via a POST to /v3/assets/request
  test('1. GET assets - should retrieve assets list', async ({ request }) => {
    console.log('Testing GET /v3/assets');

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/assets/request`, {
    });

    console.log(`Response status: ${response.status()}`);

    if (response.status() !== 200) {
      const errorBody = await response.text();
      console.log('Error response:', errorBody);
    }

    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    console.log(`✓ GET assets successful. Found ${responseBody.length || 0} assets`);

    // Response should be an array
    expect(Array.isArray(responseBody)).toBeTruthy();
  });

  test('2. POST asset - should create a minimal HttpData asset', async ({ request }) => {
    // Generate unique asset ID
    const timestamp = Date.now();
    createdAssetId = `test-asset-minimal-${timestamp}`;

    console.log(`Creating minimal asset with ID: ${createdAssetId}`);

    const assetPayload = {
      '@context': {},
      '@id': createdAssetId,
      properties: {
        name: `Minimal Asset ${timestamp}`,
        contenttype: 'application/json',
      },
      dataAddress: {
        '@type': 'DataAddress',
        type: 'HttpData',
        baseUrl: 'https://example.com/api/data',
        method: 'GET',
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/assets`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: assetPayload,
      ignoreHTTPSErrors: true,
    });

    console.log(`Response status: ${response.status()}`);
    const responseBody = await response.json();
    console.log('Response body:', JSON.stringify(responseBody, null, 2));

    expect(response.status()).toBe(200);
    expect(responseBody['@id']).toBe(createdAssetId);

    console.log(`✓ Minimal asset created successfully with ID: ${createdAssetId}`);
  });

  test('2.1 POST asset - should create asset with additional properties', async ({ request }) => {
    const timestamp = Date.now();
    createdAssetId = `test-asset-extended-${timestamp}`;

    console.log(`Creating asset with additional properties: ${createdAssetId}`);

    const assetPayload = {
      '@context': {},
      '@id': createdAssetId,
      properties: {
        name: `Extended Asset ${timestamp}`,
        contenttype: 'application/json',
        'asset:prop:version': '2.0',
        description: 'Asset with extended properties for testing',
      },
      dataAddress: {
        '@type': 'DataAddress',
        type: 'HttpData',
        baseUrl: 'https://api.example.com/data/v2',
        method: 'GET',
        path: '/users',
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/assets`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: assetPayload,
      ignoreHTTPSErrors: true,
    });

    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    expect(responseBody['@id']).toBe(createdAssetId);

    console.log(`✓ Asset with additional properties created: ${createdAssetId}`);
  });

  test('2.2 POST asset - should create asset with authentication', async ({ request }) => {
    const timestamp = Date.now();
    createdAssetId = `test-asset-auth-${timestamp}`;

    console.log(`Creating asset with authentication: ${createdAssetId}`);

    const assetPayload = {
      '@context': {},
      '@id': createdAssetId,
      properties: {
        name: `Auth Asset ${timestamp}`,
        contenttype: 'application/json',
      },
      dataAddress: {
        '@type': 'DataAddress',
        type: 'HttpData',
        baseUrl: 'https://secure.example.com/api',
        method: 'GET',
        authKey: 'X-API-Key',
        secretName: 'api-secret',
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/assets`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: assetPayload,
      ignoreHTTPSErrors: true,
    });

    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    expect(responseBody['@id']).toBe(createdAssetId);

    console.log(`✓ Asset with authentication created: ${createdAssetId}`);
  });

  test('2.3 POST asset - should create asset with POST method', async ({ request }) => {
    const timestamp = Date.now();
    createdAssetId = `test-asset-post-${timestamp}`;

    console.log(`Creating asset with POST method: ${createdAssetId}`);

    const assetPayload = {
      '@context': {},
      '@id': createdAssetId,
      properties: {
        name: `POST Method Asset ${timestamp}`,
        contenttype: 'application/json',
      },
      dataAddress: {
        '@type': 'DataAddress',
        type: 'HttpData',
        baseUrl: 'https://example.com/api/create',
        method: 'POST',
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/assets`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: assetPayload,
      ignoreHTTPSErrors: true,
    });

    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    expect(responseBody['@id']).toBe(createdAssetId);

    console.log(`✓ Asset with POST method created: ${createdAssetId}`);
  });

  test('2.4 POST asset - should create asset with proxy settings', async ({ request }) => {
    const timestamp = Date.now();
    createdAssetId = `test-asset-proxy-${timestamp}`;

    console.log(`Creating asset with proxy settings: ${createdAssetId}`);

    const assetPayload = {
      '@context': {},
      '@id': createdAssetId,
      properties: {
        name: `Proxy Asset ${timestamp}`,
        contenttype: 'application/xml',
      },
      dataAddress: {
        '@type': 'DataAddress',
        type: 'HttpData',
        baseUrl: 'https://backend.example.com/api',
        method: 'GET',
        // proxy settings
        proxyPath: '/proxy/api',
        proxyMethod: 'GET',
        proxyQueryParams: 'version=1.0&env=prod',
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/assets`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: assetPayload,
      ignoreHTTPSErrors: true,
    });

    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    expect(responseBody['@id']).toBe(createdAssetId);

    console.log(`✓ Asset with proxy settings created: ${createdAssetId}`);
  });

  test('2.5 POST asset - should create asset with private properties', async ({ request }) => {
    const timestamp = Date.now();
    createdAssetId = `test-asset-private-${timestamp}`;

    console.log(`Creating asset with private properties: ${createdAssetId}`);

    const assetPayload = {
      '@context': {},
      '@id': createdAssetId,
      properties: {
        name: `Private Props Asset ${timestamp}`,
        contenttype: 'application/json',
      },
      privateProperties: {
        internalId: 'secret-internal-12345',
        departmentCode: 'DEPT-001',
      },
      dataAddress: {
        '@type': 'DataAddress',
        type: 'HttpData',
        baseUrl: 'https://private.example.com/api',
        method: 'GET',
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/assets`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: assetPayload,
      ignoreHTTPSErrors: true,
    });

    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    expect(responseBody['@id']).toBe(createdAssetId);

    console.log(`✓ Asset with private properties created: ${createdAssetId}`);
  });

  test('3. GET created asset - should verify the asset appears in the list', async ({ request }) => {
    // First, create an asset to verify
    const timestamp = Date.now();
    createdAssetId = `verify-asset-${timestamp}`;

    console.log(`Step 1: Creating asset: ${createdAssetId}`);

    // Create the asset
    const createPayload = {
      '@context': {},
      '@id': createdAssetId,
      properties: {
        name: `Verify Asset ${timestamp}`,
        contenttype: 'application/json',
      },
      dataAddress: {
        '@type': 'DataAddress',
        type: 'HttpData',
        baseUrl: 'https://verify.example.com',
        method: 'GET',
      },
    };

    const createResponse = await request.post(`${MANAGEMENT_API_URL}/v3/assets`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: createPayload,
      ignoreHTTPSErrors: true,
    });

    expect(createResponse.status()).toBe(200);
    console.log('✓ Asset created');

    // Step 2: Query the assets list to verify it exists
    console.log('Step 2: Querying assets list to verify creation');

    const queryResponse = await request.post(`${MANAGEMENT_API_URL}/v3/assets/request`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        '@context': {},
        '@type': 'QuerySpec',
        offset: 0,
        limit: 50,
      },
      ignoreHTTPSErrors: true,
    });

    expect(queryResponse.status()).toBe(200);
    const assets = await queryResponse.json();

    // Find the created asset in the list
    const foundAsset = assets.find((asset: any) => asset['@id'] === createdAssetId);

    expect(foundAsset).toBeDefined();
    expect(foundAsset['@id']).toBe(createdAssetId);

    console.log('✓ Asset verified in the list successfully');
    console.log('Asset details:', JSON.stringify(foundAsset, null, 2));
  });
});
