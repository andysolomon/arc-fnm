import { expect, test, type Page } from '@playwright/test';

async function tabUntilFocused(
  page: Page,
  locator: ReturnType<Page['getByRole']>,
  maxTabs = 40,
): Promise<void> {
  await expect(locator).toBeVisible();
  for (let i = 0; i < maxTabs; i++) {
    if (await locator.evaluate((el) => el === el.ownerDocument.activeElement)) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  if (await locator.evaluate((el) => el === el.ownerDocument.activeElement)) {
    return;
  }
  throw new Error(`Did not reach the control in ${maxTabs} Tab presses.`);
}

test.describe('R14 journeys', () => {
  test('new career reaches the current Coaching Week', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Friday Night Manager', level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('note')).toContainText(
      'Fictional Simulation Experience',
    );

    await page.getByRole('button', { name: /Start New Career/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Start Your Journey', level: 1 }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Quick Start Career/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Team Selection', level: 1 }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Next — Game Setup/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Game Setup', level: 1 }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Start Career/i }).click();
    await expect(page.getByText('The Westfield Herald')).toBeVisible();

    await page.getByRole('button', { name: /Continue to Preseason/i }).click();
    await expect(
      page.getByRole('heading', {
        name: /Coaching Week · Central Catholic/,
        level: 1,
      }),
    ).toBeVisible();
  });

  test('resume loads the seeded Coaching Week', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: /Westfield Wildcats.*Resume/i })
      .click();
    await expect(
      page.getByRole('heading', {
        name: /Coaching Week · Central Catholic/,
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('contentinfo', { name: 'Program context' }),
    ).toContainText('Fictional · not a school tool');
  });

  test('keyboard-only navigation reaches Evidence from Career Start', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Friday Night Manager', level: 1 }),
    ).toBeVisible();

    const resume = page.getByRole('button', {
      name: /Westfield Wildcats.*Resume/i,
    });
    await tabUntilFocused(page, resume);
    await page.keyboard.press('Enter');

    await expect(
      page.getByRole('heading', {
        name: /Coaching Week · Central Catholic/,
        level: 1,
      }),
    ).toBeVisible();

    const continueWeek = page.getByRole('banner').getByRole('button', {
      name: /Continue · Prioritize concerns/i,
    });
    await tabUntilFocused(page, continueWeek);
    await page.keyboard.press('Enter');

    await expect(
      page.getByRole('article', { name: /Power tendency/i }),
    ).toBeVisible();
  });
});
