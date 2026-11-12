import { launch, check } from './cdp-lib.mjs';
const b = await launch({ out: process.argv[2] || (process.env.TEMP || '.'), base: 'http://localhost:3200' });
await b.goto('/auto-apply', 1500);
check('signed out is sent to login', (await b.url()).startsWith('/login'));
await b.fill('#email', 'demo@jobsterritory.example'); await b.fill('#password', 'Demo-Candidate-26');
await b.click('form button[type=submit]'); await b.sleep(3500);
await b.goto('/auto-apply', 3500);
check('page loads', (await b.text('h1')).includes('Auto-apply'));
// submit without consent -> error and nothing sent
await b.fill('#aa-roles', 'developer, engineer'); await b.fill('#aa-locations', 'Coimbatore, Bengaluru, Pune, Chennai');
await b.js(`document.querySelector('[data-testid=auto-form] button[type=submit]').click()`);
await b.sleep(2500);
check('refused without consent', (await b.text('[data-testid=auto-form]')).includes('Tick the box'));
check('nothing sent without consent', (await b.text('[data-testid=auto-sent]')).includes('Nothing yet'));
// consent and submit
await b.js(`[...document.querySelectorAll('[data-testid=auto-form] input[type=checkbox]')].pop().click()`);
await b.js(`document.querySelector('[data-testid=auto-form] button[type=submit]').click()`);
await b.sleep(5000);
const sent = await b.text('[data-testid=auto-sent]');
console.log('SENT:', sent.replace(/\n/g, ' | '));
check('applications were sent automatically and listed', !sent.includes('Nothing yet'));
check('status card shows on and the limit', (await b.text('[data-testid=auto-status]')).includes('Auto-apply is on'));
await b.shot('auto-apply', true);
await b.goto('/applications', 3500);
check('applications list tags auto-applied ones', (await b.js(`document.querySelectorAll('[data-testid=auto-tag]').length`)) > 0);
// pause
await b.goto('/auto-apply', 3000);
await b.js(`[...document.querySelectorAll('[data-testid=auto-status] button')].find(x => x.innerText.includes('Pause')).click()`);
await b.sleep(2500);
check('paused', (await b.text('[data-testid=auto-status]')).includes('paused'));
console.log('errors', JSON.stringify([...b.errors].filter((e) => !/Failed to load resource|404/.test(e))));
b.close();
process.exit(process.exitCode || 0);
