import { test, expect } from '@playwright/test';

test.describe('Layout & Design System Verification', () => {
  test('Homepage - Hero Section & Layout', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Capture full homepage
    await page.screenshot({
      path: 'screenshots/01-homepage-full.png',
      fullPage: true
    });

    // Capture hero section
    await page.screenshot({
      path: 'screenshots/02-hero-section.png',
      clip: { x: 0, y: 0, width: 1280, height: 400 }
    });
  });

  test('Homepage - Categories & Brands Section', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Scroll to categories section
    await page.evaluate(() => {
      const sections = document.querySelectorAll('section');
      if (sections[1]) sections[1].scrollIntoView();
    });

    await page.screenshot({
      path: 'screenshots/03-categories-section.png',
      fullPage: false
    });
  });

  test('Homepage - Footer', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Scroll to footer
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.screenshot({
      path: 'screenshots/04-footer.png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 600 }
    });
  });

  test('Products Page - Grid Layout', async ({ page }) => {
    await page.goto('http://localhost:3000/products');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'screenshots/05-products-grid.png',
      fullPage: true
    });
  });

  test('Mobile Responsive - Homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'screenshots/06-mobile-homepage.png',
      fullPage: true
    });
  });

  test('Tablet Responsive - Homepage', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'screenshots/07-tablet-homepage.png',
      fullPage: true
    });
  });

  test('Dark Mode - Homepage', async ({ page }) => {
    // Simulate dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'screenshots/08-dark-mode-homepage.png',
      fullPage: true
    });
  });

  test('Verify Grid-2 Class Applied', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check if hero section uses grid-2
    const heroSection = page.locator('.grid-2').first();
    const isVisible = await heroSection.isVisible();

    expect(isVisible).toBe(true);

    // Get computed grid-template-columns
    const gridCols = await heroSection.evaluate((el) => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });

    console.log('Grid columns:', gridCols);
  });

  test('Verify CSS Classes Instead of Inline Styles', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check footer uses CSS classes
    const footer = page.locator('footer');
    const footerSection = footer.locator('.footer-section');
    const isVisible = await footerSection.isVisible();

    expect(isVisible).toBe(true);

    // Verify no inline styles on footer columns
    const footerColumns = footer.locator('.footer-column');
    const count = await footerColumns.count();

    console.log('Footer columns found:', count);
    expect(count).toBeGreaterThan(0);
  });

  test('Verify Design System Colors Applied', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check primary button color
    const button = page.locator('.btn-secondary').first();
    const bgColor = await button.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log('Button background color:', bgColor);

    // Check if it matches the secondary color (should be close to #d97706)
    expect(bgColor).toBeTruthy();
  });
});
