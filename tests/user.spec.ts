import { Page } from '@playwright/test';
import { test, expect } from './testSetup';
import { Role, User } from '../src/service/pizzaService';

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = { 'd@jwt.com': { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] } };

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = validUsers[loginReq.email];
    const loginRes = {
      user: loggedInUser,
      token: 'abcdef',
    };
    expect(route.request().method()).toBe('PUT');
    await route.fulfill({ json: loginRes });
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const franchiseRes = {
      franchises: [
        {
          id: 2,
          name: 'LotaPizza',
          stores: [
            { id: 4, name: 'Lehi' },
            { id: 5, name: 'Springville' },
            { id: 6, name: 'American Fork' },
          ],
        },
        { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
        { id: 4, name: 'topSpot', stores: [] },
      ],
    };
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  await page.route('*/**/api/order', async (route) => {
    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: { ...orderReq, id: 23 },
      jwt: 'eyJpYXQ',
    };
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ json: orderRes });
  });

  await page.goto('/');
}

async function mockOrderHistory(page: Page) {
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { id: '3', dinerId: '3', orders: [] } });
      return;
    }

    await route.fallback();
  });
}

async function submitDinerLogin(page: Page) {
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
}

async function loginAsDiner(page: Page) {
  await page.getByRole('link', { name: 'Login' }).click();
  await submitDinerLogin(page);
}

async function mockFailedLogin(page: Page) {
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
      return;
    }

    await route.fallback();
  });
}

async function mockLogout(page: Page) {
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: {} });
      return;
    }

    await route.fallback();
  });
}

test('login', async ({ page }) => {
  await basicInit(page);
  await loginAsDiner(page);

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('login fails with invalid credentials', async ({ page }) => {
  await basicInit(page);
  await mockFailedLogin(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('unknown@jwt.com');
  await page.getByPlaceholder('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('main')).toContainText('{"code":401,"message":"Unauthorized"}');
  await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'KC' })).toHaveCount(0);
});

test('purchase with login', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('button', { name: 'Order now' }).click();

  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  await submitDinerLogin(page);

  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByText('0.008')).toBeVisible();
});

test('view profile', async ({ page }) => {
  await basicInit(page);
  await mockOrderHistory(page);
  await loginAsDiner(page);
  await page.getByRole('link', { name: 'KC' }).click();
  await expect(page.getByRole('list')).toContainText('diner-dashboard');
  await expect(page.getByRole('main')).toContainText('d@jwt.com');
  await expect(page.getByRole('img', { name: 'Employee stock photo' })).toBeVisible();
});

test('view franchise', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByRole('main')).toContainText('So you want a piece of the pie?');
  await expect(page.getByRole('main')).toContainText('Are you ready to embark on a journey towards unimaginable wealth? Owning a franchise with JWT Pizza is your ticket to financial success. With our proven business model and strong brand recognition, you have the opportunity to generate substantial revenue. Imagine the thrill of watching your profits soar year after year, as customers flock to your JWT Pizza, craving our mouthwatering creations.');
  await expect(page.getByRole('alert')).toContainText('If you are already a franchisee, pleaseloginusing your franchise account');
});

test('logout', async ({ page }) => {
  await basicInit(page);
  await mockLogout(page);
  await loginAsDiner(page);

  const logoutRequest = page.waitForRequest((request) => request.url().endsWith('/api/auth') && request.method() === 'DELETE');
  await page.getByRole('link', { name: 'Logout' }).click();
  await logoutRequest;
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'KC' })).toHaveCount(0);
});