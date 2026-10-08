import { Page } from '@playwright/test';
import { test, expect } from './testSetup';
import { Role, User } from '../src/service/pizzaService';

async function adminInit(page: Page) {
  let loggedInUser: User | undefined;
  const admin: User = {
    id: '1',
    name: '常用名字',
    email: 'a@jwt.com',
    password: 'c',
    roles: [{ role: Role.Admin }],
  };

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    expect(route.request().method()).toBe('PUT');
    if (loginReq.email !== admin.email || loginReq.password !== admin.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = admin;
    await route.fulfill({ json: { user: loggedInUser, token: 'admin-token' } });
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });

  await page.route(/\/api\/franchise(?:\?.*)?$/, async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: {
        franchises: [
          {
            id: '2',
            name: 'LotaPizza',
            admins: [{ id: '4', name: 'Sam Franchisee', email: 'f@jwt.com' }],
            stores: [
              { id: '4', name: 'Lehi', totalRevenue: 12.5 },
              { id: '5', name: 'Springville', totalRevenue: 8.25 },
            ],
          },
          {
            id: '3',
            name: 'PizzaCorp',
            admins: [{ id: '5', name: 'Jordan Owner', email: 'j@jwt.com' }],
            stores: [{ id: '6', name: 'Spanish Fork', totalRevenue: 20 }],
          },
        ],
        more: false,
      },
    });
  });

  await page.goto('/');
}

test('view admin page', async ({ page }) => {
  await adminInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('a@jwt.com');
  await page.getByPlaceholder('Password').fill('c');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();

  await expect(page.getByRole('main')).toContainText("Mama Ricci's kitchen");
  await expect(page.getByRole('table')).toContainText('LotaPizza');
  await expect(page.getByRole('table')).toContainText('PizzaCorp');
  await expect(page.getByRole('table')).toContainText('Lehi');
  await expect(page.getByRole('table')).toContainText('12.5 ₿');
});

test('create a franchise', async ({ page }) => {
  await adminInit(page);
  await page.route('*/**/api/franchise', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject({
      name: 'New Pizza Place',
      admins: [{ email: 'new@jwt.com' }],
    });
    await route.fulfill({
      json: {
        id: '8',
        name: 'New Pizza Place',
        admins: [{ email: 'new@jwt.com' }],
        stores: [],
      },
    });
  });
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('a@jwt.com');
  await page.getByPlaceholder('Password').fill('c');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('button', { name: 'Add Franchise' }).click();

  await page.getByPlaceholder('franchise name').fill('New Pizza Place');
  await page.getByPlaceholder('franchisee admin email').fill('new@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('main')).toContainText("Mama Ricci's kitchen");
});

test('delete a franchise', async ({ page }) => {
  await adminInit(page);
  await page.route('*/**/api/franchise/2', async (route) => {
    expect(route.request().method()).toBe('DELETE');
    await route.fulfill({ json: {} });
  });
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('a@jwt.com');
  await page.getByPlaceholder('Password').fill('c');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();

  const franchiseRow = page.getByRole('row').filter({ hasText: 'LotaPizza' }).first();
  await franchiseRow.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('main')).toContainText('Are you sure you want to close the LotaPizza franchise?');

  const deleteRequest = page.waitForRequest((request) => request.url().endsWith('/api/franchise/2') && request.method() === 'DELETE');
  await page.getByRole('button', { name: 'Close' }).click();
  await deleteRequest;
  await expect(page.getByRole('main')).toContainText("Mama Ricci's kitchen");
});