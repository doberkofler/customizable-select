import {expect, test} from '@playwright/test';

test.describe('CustomizableSelect demo', () => {
	test.beforeEach(async ({page}) => {
		await page.goto('/');
	});

	test('renders the enhanced native select and initial values', async ({page}) => {
		await expect(page.locator('.customizable-select')).toBeVisible();
		await expect(page.locator('.customizable-select__tag')).toHaveCount(3);
		await expect(page.locator('#customizable-select-source')).toHaveValues(['typescript', 'react', 'legacy']);
		await expect(page.locator('#event-log')).toHaveValue(/demo initialized/u);
	});

	test('searches and toggles an option', async ({page}) => {
		await page.locator('.customizable-select__selection').click();
		await page.locator('.customizable-select__search').fill('vue');
		await expect(page.locator('.customizable-select__option')).toHaveCount(1);
		await page.locator('.customizable-select__option').click();

		await expect(page.locator('#customizable-select-source')).toHaveValues(['typescript', 'react', 'vue', 'legacy']);
		await expect(page.locator('#event-log')).toHaveValue(/values=legacy,typescript,react,vue/u);
	});

	test('keeps locked values when clearing', async ({page}) => {
		await page.locator('.customizable-select__clear').focus();
		await page.locator('.customizable-select__clear').press('Enter');

		await expect(page.locator('#customizable-select-source')).toHaveValues(['legacy']);
		await expect(page.locator('.customizable-select__tag')).toHaveText('Required legacy integration');
	});

	test('supports keyboard selection', async ({page}) => {
		const selection = page.locator('.customizable-select__selection');
		await selection.focus();
		await selection.press('ArrowDown');
		await expect(page.locator('.customizable-select__dropdown')).toBeVisible();
		await page.locator('.customizable-select__search').fill('vue');
		await page.locator('.customizable-select__search').press('Enter');
		await expect(page.locator('#event-log')).toHaveValue(/change/u);
	});

	test('supports disabled and theme controls', async ({page}) => {
		await page.locator('#disable-btn').click();
		await expect(page.locator('.customizable-select__selection')).toHaveAttribute('aria-disabled', 'true');
		await expect(page.locator('#event-log')).toHaveValue(/disabled=true/u);

		await page.locator('#theme-btn').click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	});

	test('uses a mobile-safe dropdown', async ({page}) => {
		await page.setViewportSize({width: 390, height: 760});
		await page.locator('.customizable-select__selection').click();
		await expect(page.locator('.customizable-select__dropdown')).toBeVisible();
		await expect(page.locator('.customizable-select__search')).toBeInViewport();
	});
});
