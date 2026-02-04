import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const MANAGEMENT_API_URL = process.env.MANAGEMENT_API_URL || 'https://dataspace4health.local/edc/cp/management/api';

test.describe('Contract Definitions API Tests', () => {
  
  test('should retrieve contract definitions list', async ({ request }) => {
    const response = await request.post(`${MANAGEMENT_API_URL}/v3/contractdefinitions/request`);

    expect(response.ok()).toBeTruthy();
    const contractDefs = await response.json();
    expect(Array.isArray(contractDefs)).toBeTruthy();
  });

  test('should create contract definition with minimal required fields', async ({ request }) => {
    const contractDefId = `test-contract-def-minimal-${Date.now()}`;
    
    const contractDefPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
      },
      '@id': contractDefId,
      '@type': 'ContractDefinition',
      accessPolicyId: 'test-access-policy',
      contractPolicyId: 'test-contract-policy',
      assetsSelector: [],
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/contractdefinitions`, {
      ignoreHTTPSErrors: true,
      data: contractDefPayload,
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result['@type']).toBe('IdResponse');
    expect(result['@id']).toBe(contractDefId);
    expect(result.createdAt).toBeDefined();
  });

  test('should create contract definition with single asset selector criterion', async ({ request }) => {
    const contractDefId = `test-contract-def-single-criterion-${Date.now()}`;
    
    const contractDefPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
      },
      '@id': contractDefId,
      '@type': 'ContractDefinition',
      accessPolicyId: 'test-access-policy',
      contractPolicyId: 'test-contract-policy',
      assetsSelector: {
        '@type': 'Criterion',
        operandLeft: 'https://w3id.org/edc/v0.0.1/ns/id',
        operator: '=',
        operandRight: 'test-asset-1',
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/contractdefinitions`, {
      ignoreHTTPSErrors: true,
      data: contractDefPayload,
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result['@type']).toBe('IdResponse');
    expect(result['@id']).toBe(contractDefId);
  });

  test('should create contract definition with IN operator', async ({ request }) => {
    const contractDefId = `test-contract-def-in-operator-${Date.now()}`;
    
    const contractDefPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
      },
      '@id': contractDefId,
      '@type': 'ContractDefinition',
      accessPolicyId: 'test-access-policy',
      contractPolicyId: 'test-contract-policy',
      assetsSelector: {
        '@type': 'Criterion',
        operandLeft: 'https://w3id.org/edc/v0.0.1/ns/id',
        operator: 'in',
        operandRight: ['asset-1', 'asset-2', 'asset-3'],
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/contractdefinitions`, {
      ignoreHTTPSErrors: true,
      data: contractDefPayload,
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result['@type']).toBe('IdResponse');
    expect(result['@id']).toBe(contractDefId);
  });

  test('should create contract definition with private properties', async ({ request }) => {
    const contractDefId = `test-contract-def-private-props-${Date.now()}`;
    
    const contractDefPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
      },
      '@id': contractDefId,
      '@type': 'ContractDefinition',
      accessPolicyId: 'test-access-policy',
      contractPolicyId: 'test-contract-policy',
      assetsSelector: [],
      privateProperties: {
        'custom:department': 'healthcare',
        'custom:region': 'eu-central',
      },
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/contractdefinitions`, {
      ignoreHTTPSErrors: true,
      data: contractDefPayload,
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result['@type']).toBe('IdResponse');
    expect(result['@id']).toBe(contractDefId);
  });

  test('should fail to create contract definition without accessPolicyId', async ({ request }) => {
    const contractDefId = `test-contract-def-no-access-policy-${Date.now()}`;
    
    const contractDefPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
      },
      '@id': contractDefId,
      '@type': 'ContractDefinition',
      contractPolicyId: 'test-contract-policy',
      assetsSelector: [],
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/contractdefinitions`, {
      ignoreHTTPSErrors: true,
      data: contractDefPayload,
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
    const errors = await response.json();
    expect(Array.isArray(errors)).toBeTruthy();
    expect(errors.some((e: any) => e.path?.includes('accessPolicyId'))).toBeTruthy();
  });

  test('should fail to create contract definition without contractPolicyId', async ({ request }) => {
    const contractDefId = `test-contract-def-no-contract-policy-${Date.now()}`;
    
    const contractDefPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
      },
      '@id': contractDefId,
      '@type': 'ContractDefinition',
      accessPolicyId: 'test-access-policy',
      assetsSelector: [],
    };

    const response = await request.post(`${MANAGEMENT_API_URL}/v3/contractdefinitions`, {
      ignoreHTTPSErrors: true,
      data: contractDefPayload,
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
    const errors = await response.json();
    expect(Array.isArray(errors)).toBeTruthy();
    expect(errors.some((e: any) => e.path?.includes('contractPolicyId'))).toBeTruthy();
  });

  test('should verify created contract definition can be retrieved', async ({ request }) => {
    // First create a contract definition
    const contractDefId = `test-contract-def-verify-${Date.now()}`;
    
    const contractDefPayload = {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        'edc': 'https://w3id.org/edc/v0.0.1/ns/',
      },
      '@id': contractDefId,
      '@type': 'ContractDefinition',
      accessPolicyId: 'test-access-policy',
      contractPolicyId: 'test-contract-policy',
      assetsSelector: [],
    };

    const createResponse = await request.post(`${MANAGEMENT_API_URL}/v3/contractdefinitions`, {
      ignoreHTTPSErrors: true,
      data: contractDefPayload,
    });

    expect(createResponse.ok()).toBeTruthy();

    // Now verify we can retrieve it
    const getResponse = await request.get(`${MANAGEMENT_API_URL}/v3/contractdefinitions/${contractDefId}`, {
      ignoreHTTPSErrors: true,
    });

    expect(getResponse.ok()).toBeTruthy();
    const retrievedContractDef = await getResponse.json();
    expect(retrievedContractDef['@id']).toBe(contractDefId);
    expect(retrievedContractDef['@type']).toBe('ContractDefinition');
    expect(retrievedContractDef.accessPolicyId).toBe('test-access-policy');
    expect(retrievedContractDef.contractPolicyId).toBe('test-contract-policy');
  });

  test('should get all contract definitions and delete them', async ({ request }) => {
    // First, retrieve all contract definitions
    const queryResponse = await request.post(`${MANAGEMENT_API_URL}/v3/contractdefinitions/request`, {
      ignoreHTTPSErrors: true,
      data: {
        '@context': {},
        '@type': 'QuerySpec',
        offset: 0,
        limit: 1000,
      },
    });

    expect(queryResponse.ok()).toBeTruthy();
    const contractDefs = await queryResponse.json();
    expect(Array.isArray(contractDefs)).toBeTruthy();

    console.log(`Found ${contractDefs.length} contract definitions to delete`);

    // Delete each contract definition
    for (const contractDef of contractDefs) {
      const contractDefId = contractDef['@id'];
      console.log(`Deleting contract definition: ${contractDefId}`);
      
      const deleteResponse = await request.delete(`${MANAGEMENT_API_URL}/v3/contractdefinitions/${contractDefId}`, {
        ignoreHTTPSErrors: true,
      });

      expect(deleteResponse.ok()).toBeTruthy();
    }

    // Verify all contract definitions are deleted
    const verifyResponse = await request.post(`${MANAGEMENT_API_URL}/v3/contractdefinitions/request`, {
      ignoreHTTPSErrors: true,
      data: {
        '@context': {},
        '@type': 'QuerySpec',
        offset: 0,
        limit: 50,
      },
    });

    expect(verifyResponse.ok()).toBeTruthy();
    const remainingContractDefs = await verifyResponse.json();
    console.log(`Remaining contract definitions after deletion: ${remainingContractDefs.length}`);
    expect(remainingContractDefs.length).toBe(0);
  });

});
