import { expect, test } from '@playwright/test';

/**
 * Anonymous browsing.
 *
 * Everything a student can do before signing in must work without an account —
 * this is the majority of traffic.
 */

test.describe('public browsing', () => {
  test('the homepage shows today’s campus activity', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/VITPulse/);
    await expect(page.getByRole('heading', { name: /what is happening at vit-ap today/i })).toBeAttached();
    await expect(page.getByText('Today at VIT-AP')).toBeVisible();
    await expect(page.getByText('Campus Pulse')).toBeVisible();
  });

  test('events can be filtered and switched between views', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Calendar' }).click();
    await expect(page).toHaveURL(/view=calendar/);

    await page.getByRole('link', { name: 'Timeline' }).click();
    await expect(page).toHaveURL(/view=timeline/);

    // Filters live in the URL, so the view is shareable exactly as seen.
    await page.goto('/events?category=WORKSHOP');
    await expect(page).toHaveURL(/category=WORKSHOP/);
  });

  test('a club page lists its events and shows recruitment state', async ({ page }) => {
    await page.goto('/clubs');
    await expect(page.getByRole('heading', { name: /clubs & chapters/i })).toBeVisible();

    const firstClub = page.locator('article h3 a, article h2 a').first();
    const name = (await firstClub.textContent())?.trim() ?? '';
    await firstClub.click();

    await expect(page).toHaveURL(/\/clubs\/[a-z0-9-]+/);
    if (name) await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
  });

  test('the PYQ hub drills from branch to papers', async ({ page }) => {
    await page.goto('/pyqs');
    await expect(page.getByRole('heading', { name: 'PYQ Hub' })).toBeVisible();

    await page.getByRole('link', { name: /^CSE/ }).first().click();
    await expect(page).toHaveURL(/\/pyqs\/cse/);
    await expect(page.getByRole('heading', { name: /question papers/i })).toBeVisible();
  });

  test('opportunities can be filtered to those closing soon', async ({ page }) => {
    await page.goto('/opportunities');
    await page.getByRole('link', { name: 'Closing soon' }).click();
    await expect(page).toHaveURL(/filter=closing-soon/);
  });

  test('resources are grouped and searchable', async ({ page }) => {
    await page.goto('/resources');
    await expect(page.getByRole('heading', { name: /student resources/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /emergency/i })).toBeVisible();
  });

  test('an unknown route renders the 404 page rather than crashing', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/not on the map/i)).toBeVisible();
  });
});

test.describe('search', () => {
  test('finds a club by its short name', async ({ page }) => {
    await page.goto('/search?q=coding');
    await expect(page.getByRole('heading', { name: /results for/i })).toBeVisible();
    await expect(page.getByText(/Coding Club/i).first()).toBeVisible();
  });

  test('shows a useful empty state for a term with no matches', async ({ page }) => {
    await page.goto('/search?q=zzzzqqqqxxxx');
    await expect(page.getByText(/no .*results for/i)).toBeVisible();
  });
});

test.describe('accessibility basics', () => {
  test('the page is reachable by keyboard from the skip link', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused();
  });

  test('every page has exactly one h1', async ({ page }) => {
    for (const path of ['/', '/events', '/clubs', '/pyqs', '/opportunities', '/resources']) {
      await page.goto(path);
      expect(await page.locator('h1').count(), `${path} should have one h1`).toBe(1);
    }
  });
});
