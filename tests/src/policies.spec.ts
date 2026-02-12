import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const MANAGEMENT_API_URL = process.env.MANAGEMENT_API_URL || 'https://dataspace4health.local/edc/cp/management/api';

test.describe('Policy Definitions API Tests', () => {
  
  test('should retrieve policy definitions list', async ({ request }) => {
    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions/request`);

    expect(response.ok()).toBeTruthy();
    const policies = await response.json();
    expect(Array.isArray(policies)).toBeTruthy();
  });

  test('should create empty default policy (allows everything)', async ({ request }) => {
    const policyId = `test-policy-default-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Set',
        'odrl:permission': [],
        'odrl:prohibition': [],
        'odrl:obligation': [],
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result['@type']).toBe('IdResponse');
    expect(result['@id']).toBe(policyId);
    expect(result.createdAt).toBeDefined();
  });

  /**
   * When a policy is defined, it shoould be bound to scopes. So far we have no specific policy defined
   * and no rules are bound to any scopes by default. Therefore, the policy creation should fail in these cases.
   */
  //should fail because the 'read' is not bound to any scopes: Rule { Permission constraints: [] }
  test('should fail to create policy with minimal permission (read action)', async ({ request }) => {
    const policyId = `test-policy-read-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Set',
        'odrl:permission': {
          'odrl:action': {
            '@id': 'odrl:read',
          },
        },
        'odrl:prohibition': [],
        'odrl:obligation': [],
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    expect(response.ok()).toBeFalsy();
    console.log(`odrl:Set policy with minimal permission (read action) failed with status: ${response.status()}`);
  });

  test('should create policy with use action', async ({ request }) => {
    const policyId = `test-policy-use-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Set',
        'odrl:permission': {
          'odrl:action': {
            '@id': 'odrl:use',
          },
        },
        'odrl:prohibition': [],
        'odrl:obligation': [],
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result['@type']).toBe('IdResponse');
    expect(result['@id']).toBe(policyId);
  });

  test('should create policy with permission and constraint (time-based)', async ({ request }) => {
    const policyId = `test-policy-time-constraint-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Set',
        'odrl:permission': {
          'odrl:action': {
            '@id': 'odrl:use',
          },
          'odrl:constraint': {
            'odrl:leftOperand': 'https://w3id.org/edc/v0.0.1/ns/inForceDate',
            'odrl:operator': {
              '@id': 'odrl:gteq',
            },
            'odrl:rightOperand': '2024-01-01T00:00:00Z',
          },
        },
        'odrl:prohibition': [],
        'odrl:obligation': [],
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result['@type']).toBe('IdResponse');
    expect(result['@id']).toBe(policyId);
  });

  //should fail because the 'read' is not bound to any scopes: Rule { Permission constraints: [] }
  test('should fail to create policy with multiple permissions', async ({ request }) => {
    const policyId = `test-policy-multi-permissions-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Set',
        'odrl:permission': [
          {
            'odrl:action': {
              '@id': 'odrl:read',
            },
          },
          {
            'odrl:action': {
              '@id': 'odrl:use',
            },
          },
        ],
        'odrl:prohibition': [],
        'odrl:obligation': [],
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    expect(response.ok()).toBeFalsy();
    console.log(`odrl:Set policy with multiple permissions failed with status: ${response.status()}`);
  });

  //should fail because the 'distribute' is not bound to any scopes: Rule { Prohibition constraints: [] }
  test('should fail to create policy with prohibition', async ({ request }) => {
    const policyId = `test-policy-with-prohibition-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Set',
        'odrl:permission': {
          'odrl:action': {
            '@id': 'odrl:use',
          },
        },
        'odrl:prohibition': {
          'odrl:action': {
            '@id': 'odrl:distribute',
          },
        },
        'odrl:obligation': [],
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    expect(response.ok()).toBeFalsy();
    console.log(`odrl:Set policy with prohibition failed with status: ${response.status()}`);
  });

 //should fail because the 'inform' is not bound to any scopes: Rule { Duty constraint: [] }
  test('should fail to create policy with obligation', async ({ request }) => {
    const policyId = `test-policy-with-obligation-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Set',
        'odrl:permission': {
          'odrl:action': {
            '@id': 'odrl:use',
          },
        },
        'odrl:prohibition': [],
        'odrl:obligation': {
          'odrl:action': {
            '@id': 'odrl:inform',
          },
        },
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    expect(response.ok()).toBeFalsy();
    console.log(`odrl:Set policy with obligation failed with status: ${response.status()}`);
  });

  test('should create policy with complex AND constraint', async ({ request }) => {
    const policyId = `test-policy-and-constraint-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Set',
        'odrl:permission': {
          'odrl:action': {
            '@id': 'odrl:use',
          },
          'odrl:constraint': {
            'odrl:and': [
              {
                'odrl:leftOperand': 'https://w3id.org/edc/v0.0.1/ns/inForceDate',
                'odrl:operator': {
                  '@id': 'odrl:gteq',
                },
                'odrl:rightOperand': '2024-01-01T00:00:00Z',
              },
              {
                'odrl:leftOperand': 'https://w3id.org/edc/v0.0.1/ns/inForceDate',
                'odrl:operator': {
                  '@id': 'odrl:lteq',
                },
                'odrl:rightOperand': '2025-12-31T23:59:59Z',
              },
            ],
          },
        },
        'odrl:prohibition': [],
        'odrl:obligation': [],
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result['@type']).toBe('IdResponse');
    expect(result['@id']).toBe(policyId);
  });

  test('should create policy with private properties', async ({ request }) => {
    const policyId = `test-policy-private-props-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Set',
        'odrl:permission': {
          'odrl:action': {
            '@id': 'odrl:use',
          },
        },
        'odrl:prohibition': [],
        'odrl:obligation': [],
      },
      privateProperties: {
        'custom:property': 'custom-value',
        'custom:department': 'healthcare',
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result['@type']).toBe('IdResponse');
    expect(result['@id']).toBe(policyId);
  });

  test('should fail to create policy with odrl:Offer type', async ({ request }) => {
    const policyId = `test-policy-offer-fail-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Offer',
        'odrl:permission': {
          'odrl:action': {
            '@id': 'odrl:use',
          },
        },
        'odrl:prohibition': [],
        'odrl:obligation': [],
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    // Expect failure
    expect(response.ok()).toBeFalsy();
    console.log(`odrl:Offer creation failed with status: ${response.status()}`);
  });

  test('should fail to create policy with odrl:Agreement type', async ({ request }) => {
    const policyId = `test-policy-agreement-fail-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Agreement',
        'odrl:permission': {
          'odrl:action': {
            '@id': 'odrl:use',
          },
        },
        'odrl:prohibition': [],
        'odrl:obligation': [],
        'odrl:assigner': 'urn:connector:provider',
        'odrl:assignee': 'urn:connector:consumer',
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    // Expect failure
    expect(response.ok()).toBeFalsy();
    console.log(`odrl:Agreement creation failed with status: ${response.status()}`);
  });

  test('should verify created policy can be retrieved', async ({ request }) => {
    // First create a policy
    const policyId = `test-policy-verify-${Date.now()}`;
    
    const policyPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
        'odrl': 'http://www.w3.org/ns/odrl/2/',
      },
      '@id': policyId,
      '@type': 'PolicyDefinition',
      policy: {
        '@type': 'odrl:Set',
        'odrl:permission':[],
        'odrl:prohibition': [],
        'odrl:obligation': [],
      },
    };

    const createResponse = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions`, {
      ignoreHTTPSErrors: true,
      data: policyPayload,
    });

    expect(createResponse.ok()).toBeTruthy();

    // Now verify we can retrieve it
    const queryResponse = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions/request`, {
      ignoreHTTPSErrors: true,
      data: {
        '@context': {},
        '@type': 'QuerySpec',
        offset: 0,
        limit: 50,
      },
    });

    expect(queryResponse.ok()).toBeTruthy();
    const policies = await queryResponse.json();
    const createdPolicy = policies.find((p: any) => p['@id'] === policyId);
    expect(createdPolicy).toBeDefined();
    expect(createdPolicy['@type']).toBe('PolicyDefinition');
    expect(createdPolicy.policy).toBeDefined();
  });

  test('should get all policies and delete all of them', async ({ request }) => {
    // First, retrieve all policies
    const queryResponse = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions/request`, {
      ignoreHTTPSErrors: true,
      data: {
        '@context': {},
        '@type': 'QuerySpec',
        offset: 0,
        limit: 1000,
      },
    });

    expect(queryResponse.ok()).toBeTruthy();
    const policies = await queryResponse.json();
    expect(Array.isArray(policies)).toBeTruthy();

    console.log(`Found ${policies.length} policies to delete`);

    // Delete each policy
    for (const policy of policies) {
      const policyId = policy['@id'];
      console.log(`Deleting policy: ${policyId}`);
      
      const deleteResponse = await request.delete(`${MANAGEMENT_API_URL}/v3/policydefinitions/${policyId}`, {
        ignoreHTTPSErrors: true,
      });

      expect(deleteResponse.ok()).toBeTruthy();
    }

    // Verify all policies are deleted
    const verifyResponse = await request.post(`${MANAGEMENT_API_URL}/v3/policydefinitions/request`, {
      ignoreHTTPSErrors: true,
      data: {
        '@context': {},
        '@type': 'QuerySpec',
        offset: 0,
        limit: 50,
      },
    });

    expect(verifyResponse.ok()).toBeTruthy();
    const remainingPolicies = await verifyResponse.json();
    console.log(`Remaining policies after deletion: ${remainingPolicies.length}`);
    expect(remainingPolicies.length).toBe(0);
  });

});
