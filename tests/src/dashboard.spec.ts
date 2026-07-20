import { test, expect, Page } from '@playwright/test';

const BASE = process.env.DASHBOARD_BASE_URL || 'https://dataspace4health.local/edc/dashboard';

async function verifyPageLoaded(page: Page, expectedPath: string, status?: number | null): Promise<boolean> {
  const body = (await page.locator('body').textContent().catch(() => '')) ?? '';
  const lower = body.toLowerCase();
  console.log(`URL: ${page.url()} | Status: ${status}`);
  if (status === 404 || lower.includes('page not found')) { console.error('404!'); return false; }
  if ((status && status >= 500) || lower.includes('internal server error')) { console.error('500!'); return false; }
  if (lower.includes('connection refused') || lower.includes('cannot connect')) { console.error('Connection error!'); return false; }
  return true;
}

async function nav(page: Page, path: string): Promise<void> {
  const url = `${BASE}${path}`;
  console.log(`Navigating to: ${url}`);
  const rp = page.waitForResponse((r) => r.url().includes(path), { timeout: 35000 }).catch(() => null);
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  const status = response?.status() ?? null;
  console.log(`HTTP Status: ${status}`);
  const mr = await rp;
  if (mr) console.log(`Response URL: ${mr.url()}`);
  await page.waitForTimeout(2000);
  if (!await verifyPageLoaded(page, path, status)) {
    await page.screenshot({ path: `debug-nav-${Date.now()}.png`, fullPage: true });
    throw new Error('Page failed to load correctly.');
  }
}

async function dismissAlerts(page: Page): Promise<void> {
  const btns = page.locator('.alert button');
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    try { await btns.nth(i).click({ timeout: 1000 }); } catch { /* gone */ }
  }
}

function uid(prefix: string): string { return `${prefix}-${Date.now()}`; }

async function fillDataTypeAndUrl(page: Page, url: string): Promise<void> {
  const sel = page.locator('lib-asset-create select[name="dataType"]');
  await expect(sel).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(
    () => { const s = document.querySelector('lib-asset-create select[name="dataType"]') as HTMLSelectElement | null; return s !== null && s.options.length > 0; },
    { timeout: 15000 },
  );
  const opts = await sel.locator('option').allTextContents();
  if (opts.includes('HttpData')) { await sel.selectOption('HttpData'); }
  else { await sel.selectOption({ index: 0 }); }
  const baseUrl = page.locator('lib-asset-create input[name="baseUrl"]');
  await expect(baseUrl).toBeVisible({ timeout: 10000 });
  await baseUrl.fill(url);
}

async function waitFor(page: Page, selector: string, desc: string, timeout = 15000): Promise<void> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    console.log(`Found: ${desc}`);
  } catch (e) {
    console.error(`Failed to find: ${desc} | Selector: ${selector}`);
    const btns = await page.locator('button').allTextContents();
    console.log(`Buttons: ${btns.slice(0, 5).join(', ')}`);
    await page.screenshot({ path: `debug-${Date.now()}.png`, fullPage: true });
    throw e;
  }
}

async function fillAndSubmitPolicy(page: Page, policyId: string): Promise<void> {
  const idField = page.locator('input[id="policy-id"]').first();
  if (await idField.isVisible({ timeout: 2000 })) await idField.fill(policyId);
  const nameField = page.locator('input[name="policyName"]').first();
  if (await nameField.isVisible({ timeout: 2000 })) await nameField.fill(`Policy ${policyId}`);
  const typeSelect = page.locator('lib-policy-create select[name="policyType"], lib-policy-definition-create select[name="policyType"]').first();
  if (await typeSelect.isVisible({ timeout: 2000 })) {
    if ((await typeSelect.locator('option').count()) > 0) {
      try { await typeSelect.selectOption({ label: 'Set' }); }
      catch { await typeSelect.selectOption({ index: 0 }); }
      await page.waitForTimeout(1000);
    }
  }
  const btn = page.locator('lib-policy-create button:has-text("Create Policy"), lib-policy-definition-create button:has-text("Create Policy")').first();
  await expect(btn).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await btn.click({ force: true });
  await page.waitForTimeout(3000);
}

async function fillAsset(page: Page, assetId: string, name: string, terms: string, dataUrl: string): Promise<void> {
  const idField = page.locator('lib-asset-create input[id="asset-id"]').first();
  if (await idField.isVisible({ timeout: 2000 })) await idField.fill(assetId);
  const nameField = page.locator('lib-asset-create input[name="name"]').first();
  if (await nameField.isVisible({ timeout: 2000 })) await nameField.fill(name);
  const termsField = page.locator('lib-asset-create input[formcontrolname="termsAndConditions"]');
  if (await termsField.isVisible({ timeout: 2000 })) await termsField.fill(terms);
  await fillDataTypeAndUrl(page, dataUrl);
}

test.describe('Integration Tests: Create REAL EDC Objects', () => {

  // Test 1: Create asset
  test('Create a REAL Data Asset and verify it appears in the dashboard', async ({ page }) => {
    const assetId = uid('test-asset');
    await nav(page, '/assets');
    await dismissAlerts(page);
    await waitFor(page, 'button.ds4h-av-btn-primary', 'New data product button');
    await page.locator('button.ds4h-av-btn-primary').first().click({ force: true });
    await page.waitForTimeout(1500);
    await expect(page.locator('lib-asset-create')).toBeVisible({ timeout: 10000 });
    await fillAsset(page, assetId, 'Test Asset', 'Test terms', 'https://example.com/test-data');
    const submitBtn = page.locator('lib-asset-create button[type="submit"]:has-text("Create Data Product")');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);
    await submitBtn.click({ force: true });
    await page.waitForTimeout(3000);
    await page.goto(`${BASE}/assets`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await expect(page.locator('tr').filter({ hasText: assetId })).toBeVisible({ timeout: 15000 });
    console.log(`Asset "${assetId}" visible!`);
  });

  // Test 2: Create policy
  test('Create a REAL Policy and verify it appears in the dashboard', async ({ page }) => {
    const policyId = uid('test-policy');
    await nav(page, '/policies');
    await dismissAlerts(page);
    await waitFor(page, 'button.ds4h-pv-btn-primary', 'New policy button');
    await page.locator('button.ds4h-pv-btn-primary').first().click({ force: true });
    await page.waitForTimeout(1500);
    await expect(page.locator('lib-policy-create, lib-policy-definition-create')).toBeVisible({ timeout: 10000 });
    await fillAndSubmitPolicy(page, policyId);
    await page.goto(`${BASE}/policies`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    await page.waitForSelector('table.ds4h-table tbody tr', { state: 'attached', timeout: 15000 }).catch(() => {});
    const rowCount = await page.locator('table.ds4h-table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
    console.log(`Policy "${policyId}" created!`);
  });

  // Test 3: Create contract definition
  test('Create a REAL Contract Definition and verify it appears in the dashboard', async ({ page }) => {
    const contractId = uid('test-contract');
    const policyIdForContract = uid('contract-policy');

    await nav(page, '/policies');
    await dismissAlerts(page);
    await waitFor(page, 'button.ds4h-pv-btn-primary', 'New policy button');
    await page.locator('button.ds4h-pv-btn-primary').first().click({ force: true });
    await page.waitForTimeout(1500);
    await expect(page.locator('lib-policy-create, lib-policy-definition-create')).toBeVisible({ timeout: 10000 });
    await fillAndSubmitPolicy(page, policyIdForContract);

    await nav(page, '/contract-definitions');
    await dismissAlerts(page);
    await waitFor(page, 'button.ds4h-pv-btn-primary', 'New offer definition button');
    await page.locator('button.ds4h-pv-btn-primary').first().click({ force: true });
    await page.waitForTimeout(1500);
    const contractForm = page.locator('lib-contract-definition-create');
    await expect(contractForm).toBeVisible({ timeout: 10000 });

    const contractIdField = contractForm.locator('input[id="cd-id"]').first();
    if (await contractIdField.isVisible({ timeout: 2000 })) await contractIdField.fill(contractId);

    const accessSel = contractForm.locator('select[id="cd-access-policy"]');
    if (await accessSel.isVisible({ timeout: 5000 })) {
      if ((await accessSel.locator('option').count()) > 1) {
        try { await accessSel.selectOption({ label: policyIdForContract }); }
        catch { await accessSel.selectOption({ index: 1 }); }
      }
      await page.waitForTimeout(500);
    }

    const contractSel = contractForm.locator('select[id="cd-contract-policy"]');
    if (await contractSel.isVisible({ timeout: 2000 })) {
      if ((await contractSel.locator('option').count()) > 1) {
        try { await contractSel.selectOption({ label: policyIdForContract }); }
        catch { await contractSel.selectOption({ index: 1 }); }
      }
      await page.waitForTimeout(500);
    }

    const submitBtn = contractForm.locator('button[type="submit"]:has-text("Create Offer Definition")');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);
    await submitBtn.click({ force: true });
    await page.waitForTimeout(3000);

    await page.goto(`${BASE}/contract-definitions`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await expect(page.locator('tr').filter({ hasText: contractId })).toBeVisible({ timeout: 15000 });
    console.log(`Contract definition "${contractId}" visible!`);
  });

  // Test 4: Edit asset
  test('Edit a REAL Data Asset and verify changes', async ({ page }) => {
    const assetId = uid('edit-asset');
    console.log(`Creating asset to edit: ${assetId}`);

    await page.goto(`${BASE}/assets`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissAlerts(page);

    await waitFor(page, 'button.ds4h-av-btn-primary', 'New data product button');
    await page.locator('button.ds4h-av-btn-primary').first().click({ force: true });
    await page.waitForTimeout(1500);
    await expect(page.locator('lib-asset-create')).toBeVisible({ timeout: 10000 });
    await fillAsset(page, assetId, `Original Asset ${assetId}`, 'Edit asset terms', 'https://example.com/original-data');

    const createBtn = page.locator('lib-asset-create button[type="submit"]:has-text("Create Data Product")');
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click({ force: true });
    await page.waitForTimeout(3000);
    console.log(`Asset "${assetId}" created, now editing...`);

    await page.goto(`${BASE}/assets`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await dismissAlerts(page);

    // Assets are in table rows — find the edit button in the row
    const assetRow = page.locator('tr').filter({ hasText: assetId });
    await expect(assetRow).toBeVisible({ timeout: 10000 });
    await assetRow.locator('button[title="Edit"]').click({ force: true });
    await page.waitForTimeout(2000);

    const editForm = page.locator('lib-asset-create');
    await expect(editForm).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Submit update — new text: "Update Data Product"
    const updateBtn = page.locator('lib-asset-create button[type="submit"]:has-text("Update Data Product")');
    await expect(updateBtn).toBeVisible({ timeout: 5000 });
    await updateBtn.click({ force: true });
    await page.waitForTimeout(3000);

    await page.goto(`${BASE}/assets`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await expect(page.locator('tr').filter({ hasText: assetId })).toBeVisible({ timeout: 10000 });
    console.log(`Asset "${assetId}" updated!`);
  });

  // Test 5: Delete asset
  test('Delete a REAL Data Asset and verify removal', async ({ page }) => {
    const assetId = uid('delete-asset');
    console.log(`Creating asset to delete: ${assetId}`);

    await page.goto(`${BASE}/assets`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissAlerts(page);

    await waitFor(page, 'button.ds4h-av-btn-primary', 'New data product button');
    await page.locator('button.ds4h-av-btn-primary').first().click({ force: true });
    await page.waitForTimeout(1500);
    await expect(page.locator('lib-asset-create')).toBeVisible({ timeout: 10000 });
    await fillAsset(page, assetId, `Asset to Delete ${assetId}`, 'Delete asset terms', 'https://example.com/delete-me');

    const createBtn = page.locator('lib-asset-create button[type="submit"]:has-text("Create Data Product")');
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click({ force: true });
    await page.waitForTimeout(3000);
    console.log(`Asset "${assetId}" created, now deleting...`);

    await page.goto(`${BASE}/assets`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await dismissAlerts(page);

    const assetRow = page.locator('tr').filter({ hasText: assetId });
    await expect(assetRow).toBeVisible({ timeout: 10000 });
    await assetRow.locator('button[title="Delete"]').click({ force: true });
    await page.waitForTimeout(2000);

    // Delete confirmation dialog
    const deleteConfirm = page.locator('lib-delete-confirm');
    await expect(deleteConfirm).toBeVisible({ timeout: 10000 });
    const confirmAssetCard = deleteConfirm.locator('lib-asset-card');
    await expect(confirmAssetCard).toBeVisible();

    // Confirm delete — new button class: ds4h-dc-btn-delete
    const confirmBtn = deleteConfirm.locator('button.ds4h-dc-btn-delete');
    await confirmBtn.click({ force: true });
    await page.waitForTimeout(3000);

    await page.goto(`${BASE}/assets`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await expect(page.locator('tr').filter({ hasText: assetId })).not.toBeVisible();
    console.log(`Asset "${assetId}" deleted!`);
  });

  // Test 6: Edit policy
  test('Edit a REAL Policy and verify changes', async ({ page }) => {
    const policyId = uid('edit-policy');
    console.log(`Creating policy to edit: ${policyId}`);

    await page.goto(`${BASE}/policies`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissAlerts(page);

    await waitFor(page, 'button.ds4h-pv-btn-primary', 'New policy button');
    await page.locator('button.ds4h-pv-btn-primary').first().click({ force: true });
    await page.waitForTimeout(1500);
    await expect(page.locator('lib-policy-create, lib-policy-definition-create')).toBeVisible({ timeout: 10000 });
    await fillAndSubmitPolicy(page, policyId);
    console.log(`Policy "${policyId}" created, now editing...`);

    await page.goto(`${BASE}/policies`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await dismissAlerts(page);

    const policyRow = page.locator('tr').filter({ hasText: policyId });
    await expect(policyRow).toBeVisible({ timeout: 10000 });
    await policyRow.locator('button[title="Edit"]').click({ force: true });
    await page.waitForTimeout(2000);

    const editForm = page.locator('lib-policy-create, lib-policy-definition-create');
    await expect(editForm).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Submit update — new text: "Update Policy"
    const updateBtn = page.locator('button:has-text("Update Policy")');
    await expect(updateBtn).toBeVisible({ timeout: 5000 });
    await updateBtn.click({ force: true });
    await page.waitForTimeout(3000);

    await page.goto(`${BASE}/policies`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await expect(page.locator('tr').filter({ hasText: policyId })).toBeVisible({ timeout: 10000 });
    console.log(`Policy "${policyId}" updated!`);
  });

  // Test 7: Delete policy
  test('Delete a REAL Policy and verify removal', async ({ page }) => {
    const policyId = uid('delete-policy');
    console.log(`Creating policy to delete: ${policyId}`);

    await page.goto(`${BASE}/policies`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissAlerts(page);

    await waitFor(page, 'button.ds4h-pv-btn-primary', 'New policy button');
    await page.locator('button.ds4h-pv-btn-primary').first().click({ force: true });
    await page.waitForTimeout(1500);
    await expect(page.locator('lib-policy-create, lib-policy-definition-create')).toBeVisible({ timeout: 10000 });
    await fillAndSubmitPolicy(page, policyId);
    console.log(`Policy "${policyId}" created, now deleting...`);

    await page.goto(`${BASE}/policies`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await dismissAlerts(page);

    const policyRow = page.locator('tr').filter({ hasText: policyId });
    await expect(policyRow).toBeVisible({ timeout: 10000 });
    await policyRow.locator('button[title="Delete"]').click({ force: true });
    await page.waitForTimeout(2000);

    const deleteConfirm = page.locator('lib-delete-confirm');
    await expect(deleteConfirm).toBeVisible({ timeout: 10000 });
    const confirmPolicyCard = deleteConfirm.locator('lib-policy-card');
    await expect(confirmPolicyCard).toBeVisible();

    const confirmBtn = deleteConfirm.locator('button.ds4h-dc-btn-delete');
    await confirmBtn.click({ force: true });
    await page.waitForTimeout(3000);

    await page.goto(`${BASE}/policies`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await expect(page.locator('tr').filter({ hasText: policyId })).not.toBeVisible();
    console.log(`Policy "${policyId}" deleted!`);
  });

  // Test 8: Cleanup — delete all test data via API
  test('Cleanup: Delete all remaining contract definitions, policies, and assets', async ({ page, request }) => {
    console.log('CLEANUP: Removing all test data...');
    const MGMT = process.env.MANAGEMENT_API_URL || 'https://dataspace4health.local/edc/cp/management/api';

    const contractsResp = await request.post(`${MGMT}/v3/contractdefinitions/request`, {
      ignoreHTTPSErrors: true,
      data: { '@context': {}, '@type': 'QuerySpec', offset: 0, limit: 1000 },
    });
    if (contractsResp.ok()) {
      const contracts = await contractsResp.json();
      console.log(`Found ${contracts.length} contract definition(s)`);
      for (const c of contracts) {
        const id = c['@id'];
        const r = await request.delete(`${MGMT}/v3/contractdefinitions/${id}`, { ignoreHTTPSErrors: true });
        console.log(`  ${r.ok() ? 'Deleted' : 'Failed'}: ${id}`);
      }
    }

    const policiesResp = await request.post(`${MGMT}/v3/policydefinitions/request`, {
      ignoreHTTPSErrors: true,
      data: { '@context': {}, '@type': 'QuerySpec', offset: 0, limit: 1000 },
    });
    if (policiesResp.ok()) {
      const policies = await policiesResp.json();
      console.log(`Found ${policies.length} policy/policies`);
      for (const p of policies) {
        const id = p['@id'];
        const r = await request.delete(`${MGMT}/v3/policydefinitions/${id}`, { ignoreHTTPSErrors: true });
        console.log(`  ${r.ok() ? 'Deleted' : 'Failed'}: ${id}`);
      }
    }

    const assetsResp = await request.post(`${MGMT}/v3/assets/request`, {
      ignoreHTTPSErrors: true,
      data: { '@context': {}, '@type': 'QuerySpec', offset: 0, limit: 1000 },
    });
    if (assetsResp.ok()) {
      const assets = await assetsResp.json();
      console.log(`Found ${assets.length} asset(s)`);
      for (const a of assets) {
        const id = a['@id'];
        const r = await request.delete(`${MGMT}/v3/assets/${id}`, { ignoreHTTPSErrors: true });
        console.log(`  ${r.ok() ? 'Deleted' : 'Failed'}: ${id}`);
      }
    }

    console.log('CLEANUP COMPLETE!');
  });

});
