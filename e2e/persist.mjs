import { spawn, execSync } from 'node:child_process';
import { launch, check } from './cdp-lib.mjs';
const b = await launch({ out: process.argv[2] || (process.env.TEMP || '.'), base: 'http://localhost:3200' });
await b.goto('/login', 1500);
await b.fill('#email', 'demo@jobsterritory.example'); await b.fill('#password', 'Demo-Candidate-26');
await b.click('form button[type=submit]'); await b.sleep(3500);
check('signed in', (await b.url()).startsWith('/jobs'), await b.url());

// restart the web server (as happens when you stop and start the app)
execSync(`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3200 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`);
await b.sleep(1500);
spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', '3200'], { cwd: process.cwd(), detached: true, stdio: 'ignore' }).unref();
await b.sleep(6000);
await b.goto('/profile', 3500);
check('still signed in after a server restart', (await b.url()).startsWith('/profile'), await b.url());
await b.goto('/login', 2500);
check('/login with a live session goes to the app, not a blank form', !(await b.url()).startsWith('/login'), await b.url());
// sign out then the email should be remembered
await b.goto('/jobs', 2000);
await b.js(`document.cookie.split(';').forEach(c => { const n = c.split('=')[0].trim(); document.cookie = n + '=; Max-Age=0; path=/'; })`);
await b.js(`[...document.querySelectorAll('button')].find(x => /Meera|sign out/i.test(x.innerText))?.click()`);
await b.sleep(500);
await b.send('Network.getAllCookies');
await b.send('Network.clearBrowserCookies');
await b.goto('/login', 2500);
check('email remembered on the sign-in form', (await b.js(`document.querySelector('#email').value`)) === 'demo@jobsterritory.example', await b.js(`document.querySelector('#email').value`));
b.close();
process.exit(process.exitCode || 0);
