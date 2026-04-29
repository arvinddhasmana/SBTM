// One-off mockup screenshot generator (not part of build)
const { chromium } = require('/home/arvind/workspace/SBTM/node_modules/.pnpm/playwright@1.59.1/node_modules/playwright');
const path = require('path');

const dir = path.resolve(__dirname);
const screens = [
  ['dashboard-aurora-dark', 'Dashboard · Aurora Dark'],
  ['dashboard-frosted-light', 'Dashboard · Frosted Light'],
  ['map-aurora-dark', 'Map · Aurora Dark · Live'],
  ['map-frosted-light', 'Map · Frosted Light · Offline'],
  ['notif-aurora-dark', 'Notifications · Aurora Dark'],
  ['notif-frosted-light', 'Notifications · Frosted Light'],
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 460, height: 920 }, deviceScaleFactor: 2 });
  for (const [name] of screens) {
    const page = await ctx.newPage();
    await page.goto('file://' + path.join(dir, name + '.html'));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, 'previews', name + '.png'), fullPage: false });
    await page.close();
    console.log('rendered', name);
  }
  await browser.close();
})();
