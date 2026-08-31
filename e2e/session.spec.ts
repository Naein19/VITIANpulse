import { expect, test } from '@playwright/test';

/**
 * Signed-in flows and authorisation.
 *
 * These run against the seeded demo accounts, which exist only when Supabase is
 * unconfigured — exactly the state CI runs in.
 */

async function signInAs(page: import('@playwright/test').Page, role: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: new RegExp(role, 'i') }).first().click();
  await page.waitForURL(/\/(dashboard|$)/);
}

test.describe('authentication', () => {
  test('signing in as a student lands on the dashboard', async ({ page }) => {
    await signInAs(page, 'student');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('a student cannot see or reach the admin console', async ({ page }) => {
    await signInAs(page, 'student');

    // Not offered in the account menu…
    await page.getByRole('button', { name: /account menu/i }).click();
    await expect(page.getByRole('menuitem', { name: /admin console/i })).toHaveCount(0);
    await page.keyboard.press('Escape');

    // …and blocked when requested directly. Authorisation is server-side.
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin$/);
  });

  test('a super admin reaches the console and sees the queues', async ({ page }) => {
    await signInAs(page, 'super admin');
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByText('Needs attention')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Users/ })).toBeVisible();
  });

  test('signing out returns the visitor to anonymous browsing', async ({ page }) => {
    await signInAs(page, 'student');
    await page.getByRole('button', { name: /account menu/i }).click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();

    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
  });
});

test.describe('engagement', () => {
  test('following a club persists and appears on the dashboard', async ({ page }) => {
    await signInAs(page, 'student');
    await page.goto('/clubs');

    const followButton = page.getByRole('button', { name: 'Follow' }).first();
    await followButton.click();
    await expect(page.getByRole('button', { name: 'Following' }).first()).toBeVisible();

    // The write is real: it survives a reload.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Following' }).first()).toBeVisible();
  });

  test('bookmarking an event puts it in the saved list', async ({ page }) => {
    await signInAs(page, 'student');
    await page.goto('/events');

    await page.getByRole('button', { name: 'Bookmark' }).first().click();
    await expect(page.getByRole('button', { name: 'Remove bookmark' }).first()).toBeVisible();

    await page.goto('/saved?type=EVENT');
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('registering for an event reserves a seat', async ({ page }) => {
    await signInAs(page, 'student');
    await page.goto('/events');

    // Open the first event that takes registrations.
    await page.locator('article a').first().click();
    await page.waitForURL(/\/events\/[a-z0-9-]+/);

    const register = page.getByRole('button', { name: /register for this event|join the waitlist/i });
    if (await register.count()) {
      await register.first().click();
      await expect(page.getByText(/you're registered|on the waitlist/i)).toBeVisible();
    }
  });
});

test.describe('the desktop shell', () => {
  test('the window can be maximised, closed and relaunched', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the window metaphor is desktop-only');
    await page.goto('/');

    await page.getByRole('button', { name: /maximise window/i }).first().click();
    await expect(page.getByRole('button', { name: /restore window/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /close window/i }).click();
    // Closing reveals the desktop; the rails remain as the launcher.
    await expect(page.getByRole('navigation', { name: /campus shortcuts/i })).toBeVisible();

    await page.getByRole('link', { name: 'Events' }).first().click();
    await expect(page).toHaveURL(/\/events/);
  });
});

test.describe('command palette', () => {
  test('opens with the keyboard and navigates to a result', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard shortcut is desktop-only');
    await page.goto('/');

    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByRole('dialog', { name: /search and commands/i })).toBeVisible();

    await page.getByPlaceholder(/search events, clubs/i).fill('clubs');
    await page.keyboard.press('Enter');
    await expect(page).not.toHaveURL('/');
  });
});
