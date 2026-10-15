import { test, expect } from 'playwright-test-coverage';
import { Role, User } from '../src/service/pizzaService';

test('updateUser', async ({ page }) => {
  let mockUser: (User & { password: string }) | null = null;

  await page.route('*/**/api/auth', async (route) => {
    const request = route.request();

    if (request.method() === 'POST') {
      const { name, email, password } = request.postDataJSON();
      mockUser = { id: 'user-1', name, email, password, roles: [{ role: Role.Diner }] };
      await route.fulfill({ json: { user: mockUser, token: 'test-token' } });
      return;
    }

    if (request.method() === 'PUT') {
      const { email, password } = request.postDataJSON();
      expect(mockUser).not.toBeNull();
      if (!mockUser) {
        throw new Error('Cannot log in before registering the mock user');
      }
      expect(email).toBe(mockUser.email);
      expect(password).toBe(mockUser.password);
      await route.fulfill({ json: { user: mockUser, token: 'test-token' } });
      return;
    }

    expect(request.method()).toBe('DELETE');
    await route.fulfill({ json: {} });
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    expect(mockUser).not.toBeNull();
    await route.fulfill({ json: mockUser });
  });

  await page.route('*/**/api/order', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: { id: 'user-1', dinerId: 'user-1', orders: [] } });
  });

  await page.route('*/**/api/user/user-1', async (route) => {
    expect(route.request().method()).toBe('PUT');
    expect(mockUser).not.toBeNull();
    if (!mockUser) {
      throw new Error('Cannot update before registering the mock user');
    }
    mockUser = { ...mockUser, ...route.request().postDataJSON() };
    await route.fulfill({ json: { user: mockUser, token: 'test-token' } });
  });

  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza diner');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza diner');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();

  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

});
