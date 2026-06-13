import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() === 404 && response.url().includes('localhost')) {
      console.log('404 for:', response.url());
    }
  });

  await page.goto('http://localhost:8080/login');
  
  console.log('Current URL:', page.url());
  
  // Click Try Demo Account
  await page.click('text="Try Demo Account"');
  
  // Wait for the URL to change from /login
  await page.waitForFunction(() => window.location.pathname !== '/login');
  
  // Wait a little bit for rendering and potential subsequent redirects
  await page.waitForTimeout(2000);
  
  console.log('Final URL:', page.url());
  
  const h1 = await page.$eval('h1', el => el.textContent).catch(() => 'No H1');
  console.log('H1:', h1);
  
  await browser.close();
})();
