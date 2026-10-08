import { Page } from '@playwright/test';
import { test, expect } from './testSetup';
import { Role, User } from '../src/service/pizzaService';

async function franchiseeInit(page: Page) {
  let loggedInUser: User | undefined;
  const franchisee: User = {
    id: '4',
    name: 'pizza franchisee',
    email: 'f@jwt.com',
    password: 'b',
    roles: [{ role: Role.Franchisee, objectId: '2' }],
  };

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    expect(route.request().method()).toBe('PUT');
    if (loginReq.email !== franchisee.email || loginReq.password !== franchisee.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = franchisee;
    await route.fulfill({ json: { user: loggedInUser, token: 'franchisee-token' } });
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });

  await page.route(`*/**/api/franchise/${franchisee.id}`, async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: [
        {
          id: '2',
          name: 'LotaPizza',
          stores: [
            { id: '4', name: 'Lehi', totalRevenue: 12.5 },
            { id: '5', name: 'Springville', totalRevenue: 8.25 },
          ],
        },
      ],
    });
  });

  await page.goto('/');
}

test('view franchise', async ({ page }) => {
  await franchiseeInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('f@jwt.com');
  await page.getByPlaceholder('Password').fill('b');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();

  await expect(page.getByRole('main')).toContainText('LotaPizza');
  await expect(page.getByRole('table')).toContainText('Lehi');
  await expect(page.getByRole('table')).toContainText('Springville');
  await expect(page.getByRole('table')).toContainText('12.5 ₿');
});

test('create a store', async ({ page }) => {
  await franchiseeInit(page);
  await page.route('*/**/api/franchise/2/store', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject({ name: 'Orem' });
    await route.fulfill({ json: { id: '7', name: 'Orem' } });
  });
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('f@jwt.com');
  await page.getByPlaceholder('Password').fill('b');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();

  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByPlaceholder('store name').fill('Orem');

  const createRequest = page.waitForRequest((request) => request.url().endsWith('/api/franchise/2/store') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Create' }).click();
  await createRequest;
  await expect(page.getByRole('main')).toContainText('LotaPizza');
});

test('delete a store', async ({ page }) => {
  await franchiseeInit(page);
  await page.route('*/**/api/franchise/2/store/4', async (route) => {
    expect(route.request().method()).toBe('DELETE');
    await route.fulfill({ json: null });
  });
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('f@jwt.com');
  await page.getByPlaceholder('Password').fill('b');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();

  const storeRow = page.getByRole('row').filter({ hasText: 'Lehi' });
  await storeRow.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('main')).toContainText('Are you sure you want to close the LotaPizza store Lehi');

  const deleteRequest = page.waitForRequest((request) => request.url().endsWith('/api/franchise/2/store/4') && request.method() === 'DELETE');
  await page.getByRole('button', { name: 'Close' }).click();
  await deleteRequest;
  await expect(page.getByRole('main')).toContainText('LotaPizza');
});