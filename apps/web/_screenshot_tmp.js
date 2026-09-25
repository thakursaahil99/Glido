const { chromium } = require("playwright");

const pages = [
  { url: "http://localhost:3100/admin/login", out: "admin-login.png" },
  { url: "http://localhost:3100/partner/login", out: "partner-login.png" },
  { url: "http://localhost:3100/login", out: "site-login.png" },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const p of pages) {
    await page.goto(p.url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: `C:/Users/user/AppData/Local/Temp/claude/e--Sahil-Templates-SahilGlido/934f53b9-cf06-4de9-b1d6-0c8d8374fb7b/scratchpad/${p.out}`,
    });
    console.log("captured", p.url);
  }
  await browser.close();
})();
