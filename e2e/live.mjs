// Smoke test against a deployed site: node e2e/live.mjs https://your-site.vercel.app <admin-password>
// Creates one throwaway account (live-check-<time>@example.com); delete it afterwards.
import { launch, check } from './cdp-lib.mjs';
const base = process.argv[2];
const adminPw = process.argv[3];
if (!base) throw new Error('usage: node e2e/live.mjs <base-url> [admin-password]');
const email = `live-check-${Date.now()}@example.com`;
console.log('test account:', email);

const b = await launch({ out: process.env.TEMP || '.', base });
await b.goto('/jobs', 4000);
check('jobs list renders with verified badges', (await b.js(`document.querySelectorAll('[data-testid=verified-badge]').length`)) > 0);

await b.goto('/register', 2500);
await b.fill('#fullName', 'Live Check'); await b.fill('#email', email); await b.fill('#password', 'Live-Check-26x');
await b.click('form button[type=submit]'); await b.sleep(6000);
check('registration signs in and lands on the profile', (await b.url()).startsWith('/profile'), await b.url());

await b.fill('#headline', 'Smoke test headline');
await b.js(`[...document.querySelectorAll('button')].find(x => /Save changes/.test(x.innerText)).click()`);
await b.sleep(3500);
await b.goto('/profile', 4000);
check('profile saved and still signed in after reload', (await b.js(`document.querySelector('#headline')?.value`)) === 'Smoke test headline', await b.url());

await b.goto('/auto-apply', 3500);
check('auto-apply page loads for a signed-in user', (await b.text('h1')).includes('Auto-apply'));
await b.goto('/admin/reports', 3500);
check('a candidate cannot open the admin queue', !(await b.text('main')).includes('Reports') || (await b.text('body')).includes('404') || (await b.url()) !== '/admin/reports' || (await b.text('h1')).includes('404'), await b.text('h1'));
b.close();

if (adminPw) {
  const a = await launch({ out: process.env.TEMP || '.', base });
  await a.goto('/login', 2500);
  await a.fill('#email', 'admin@jobsterritory.example'); await a.fill('#password', adminPw);
  await a.click('form button[type=submit]'); await a.sleep(5000);
  await a.goto('/admin/companies', 4000);
  check('admin opens the companies screen', (await a.text('h1')).includes('Companies'), await a.text('h1'));
  a.close();
}
process.exit(process.exitCode || 0);
