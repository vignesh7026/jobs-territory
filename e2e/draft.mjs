import { launch, check } from './cdp-lib.mjs';
const b = await launch({ out: process.argv[2] || (process.env.TEMP || '.'), base: 'http://localhost:3200' });
await b.goto('/login', 1500);
await b.fill('#email', 'demo@jobsterritory.example'); await b.fill('#password', 'Demo-Candidate-26');
await b.click('form button[type=submit]'); await b.sleep(3500);
await b.goto('/profile', 3000);
await b.fill('#headline', 'DRAFT HEADLINE NOT SAVED');
await b.sleep(600);
await b.send('Page.navigate', { url: 'http://localhost:3200/profile' }); // reload without saving
await b.sleep(3500);
check('unsaved headline restored after reload', (await b.js(`document.querySelector('#headline').value`)) === 'DRAFT HEADLINE NOT SAVED');
check('toast tells the user', (await b.text('body')).includes('Restored your unsaved draft'));
// save clears the draft
await b.fill('#headline', 'Frontend developer, React and TypeScript');
await b.js(`[...document.querySelectorAll('button')].find(x => /Save changes/.test(x.innerText)).click()`);
await b.sleep(2500);
await b.send('Page.navigate', { url: 'http://localhost:3200/profile' });
await b.sleep(3000);
check('after save the draft is gone', (await b.js(`document.querySelector('#headline').value`)) === 'Frontend developer, React and TypeScript' && !(await b.text('body')).includes('Restored your unsaved draft'));
b.close();
process.exit(process.exitCode || 0);
