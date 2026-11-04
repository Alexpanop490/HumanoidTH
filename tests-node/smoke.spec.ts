import { test, expect } from "@playwright/test";

test("smoke test - crawl all routes as admin", async ({ page }) => {
  // Go to profile page first
  await page.goto("/profile");
  
  // Click "Login as Administrator" button
  const adminBtn = page.locator('button:has-text("Login as Administrator")');
  if (await adminBtn.isVisible()) {
    await adminBtn.click();
    await page.waitForTimeout(1000);
  }

  const routes = [
    "/",
    "/dashboard",
    "/perspectives",
    "/robots",
    "/inventory",
    "/contributions",
    "/analytics",
    "/database",
    "/submit-data",
    "/admin",
  ];

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);

    // Expect an h1 header element to exist on the page
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    const text = await h1.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  }
});
