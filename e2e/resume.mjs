// Registers a new account, uploads a PDF resume and checks the profile fills itself in and can be edited.
import fs from 'node:fs';
import { launch, check } from './cdp-lib.mjs';
const TEXT = `Karthik Raman
Frontend Developer
Coimbatore, Tamil Nadu | +91 98430 27719 | karthik.raman@example.com
linkedin.com/in/karthik-raman | github.com/karthikraman

SUMMARY
Frontend developer with 3 years of experience building accessible React interfaces for logistics and fintech products.

SKILLS
React, TypeScript, JavaScript, Node.js, Tailwind CSS, Jest, Git, REST APIs

EXPERIENCE
Frontend Developer | Orchard Cloud
Jun 2023 - Present
- Built the billing dashboard in React and TypeScript

Web Developer Intern at Brightwell Labs
Jan 2022 - May 2022
- Fixed accessibility bugs across the marketing site

EDUCATION
B.E. Computer Science and Engineering
PSG College of Technology, Coimbatore 2019 - 2023
`;
const esc = (s) => s.replace(/\/g, '\\').replace(/\(/g, '\(').replace(/\)/g, '\)');
const body = ['BT', '/F1 11 Tf', '72 760 Td', ...TEXT.split('\n').map((l) => `0 -14 Td (${esc(l)}) Tj`), 'ET'].join('\n');
const pdf = `%PDF-1.4\n1 0 obj\n<< /Length ${body.length} >>\nstream\n${body}\nendstream\nendobj\ntrailer\n<< >>\n%%EOF\n`;
const file = (process.env.TEMP || '.') + '/e2e-resume.pdf';
fs.writeFileSync(file, pdf);

const base = process.argv[2] || 'http://localhost:3200';
const b = await launch({ out: process.env.TEMP || '.', base });
await b.goto('/register', 2500);
await b.fill('#fullName', 'Karthik R'); await b.fill('#email', `resume-${Date.now()}@example.com`); await b.fill('#password', 'Resume-Test-26');
await b.click('form button[type=submit]'); await b.sleep(5000);
check('lands on the profile', (await b.url()).startsWith('/profile'), await b.url());
check('profile starts empty', (await b.js(`document.querySelector('#headline').value`)) === '');

await b.setFiles('#resume-file', [file.replace(/\/g, '/')]);
await b.sleep(6000);
check('headline filled from the resume', (await b.js(`document.querySelector('#headline').value`)) === 'Frontend Developer', await b.js(`document.querySelector('#headline').value`));
const page = await b.text('main');
check('skills filled', /React/.test(page) && /TypeScript/.test(page));
check('roles filled', /Orchard Cloud/.test(await b.js(`[...document.querySelectorAll('input')].map(i => i.value).join('|')`)));
check('education filled', /PSG College/.test(await b.js(`[...document.querySelectorAll('input')].map(i => i.value).join('|')`)));
await b.shot('resume-filled', true);

// saved already? reload and see
await b.goto('/profile', 4000);
check('it was saved automatically (survives a reload)', (await b.js(`document.querySelector('#headline').value`)) === 'Frontend Developer');

// edit afterwards
await b.fill('#headline', 'Senior Frontend Developer');
await b.js(`[...document.querySelectorAll('button')].find(x => /Save changes/.test(x.innerText)).click()`);
await b.sleep(3000);
await b.goto('/profile', 3500);
check('edits afterwards are kept', (await b.js(`document.querySelector('#headline').value`)) === 'Senior Frontend Developer');
console.log('errors', JSON.stringify([...b.errors].filter((e) => !/Failed to load resource|404/.test(e))));
b.close();
process.exit(process.exitCode || 0);
