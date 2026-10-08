import { Page } from '@playwright/test';
import { test, expect } from './testSetup';

async function mockRegistration(page: Page, status: number, response: object) {
  await page.route('*/**/api/auth', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject({
      name: 'Jamie Tester',
      email: 'jamie@jwt.com',
      password: 'pizza-password',
    });
    await route.fulfill({ status, json: response });
  });
}

test('about page', async ({ page }) => {
  await page.goto('/about');

  await expect(page.getByRole('heading', { name: 'The secret sauce' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Our employees' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Employee stock photo' })).toHaveCount(4);
});

test('history page', async ({ page }) => {
  await page.goto('/history');

  await expect(page.getByRole('heading', { name: 'Mama Rucci, my my' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText("It all started in Mama Ricci's kitchen.");
  await expect(page.getByRole('main')).toContainText('Pizza has a long and rich history');
});

test('docs page displays mocked service endpoints', async ({ page }) => {
  await page.route('*/**/api/docs', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: {
        endpoints: [
          {
            requiresAuth: true,
            method: 'PUT',
            path: '/api/auth',
            description: 'Sign in to JWT Pizza',
            example: '{ "email": "d@jwt.com" }',
            response: { token: 'example-token' },
          },
        ],
      },
    });
  });

  await page.goto('/docs');

  await expect(page.getByRole('heading', { name: 'JWT Pizza API' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('[PUT] /api/auth');
  await expect(page.getByRole('main')).toContainText('Sign in to JWT Pizza');
  await expect(page.getByRole('main')).toContainText('example-token');
});

test('registration succeeds', async ({ page }) => {
  await mockRegistration(page, 200, {
    user: { id: '9', name: 'Jamie Tester', email: 'jamie@jwt.com', roles: [{ role: 'diner' }] },
    token: 'new-user-token',
  });
  await page.goto('/register');
  await page.getByPlaceholder('Full name').fill('Jamie Tester');
  await page.getByPlaceholder('Email address').fill('jamie@jwt.com');
  await page.getByPlaceholder('Password').fill('pizza-password');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('link', { name: 'JT' })).toBeVisible();
  await expect(page.getByRole('heading', { name: "The web's best pizza" })).toBeVisible();
});

test('registration shows an error for a rejected account', async ({ page }) => {
  await mockRegistration(page, 409, { message: 'Email already registered' });
  await page.goto('/register');
  await page.getByPlaceholder('Full name').fill('Jamie Tester');
  await page.getByPlaceholder('Email address').fill('jamie@jwt.com');
  await page.getByPlaceholder('Password').fill('pizza-password');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('main')).toContainText('{"code":409,"message":"Email already registered"}');
  await expect(page.getByRole('heading', { name: 'Welcome to the party' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
});

test('unknown page shows not-found message', async ({ page }) => {
  await page.goto('/not-a-real-page');

  await expect(page.getByRole('heading', { name: 'Oops' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('It looks like we have dropped a pizza on the floor.');
});
