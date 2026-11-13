// Fit report on a job page, the paste-a-JD check, light-by-default theme and the heading font.
import { launch, check } from './cdp-lib.mjs';
const base = process.argv[2] || 'http://localhost:3200';

// 1. light by default even when the system prefers dark, and the new fonts are in use
const l = await launch({ out: process.env.TEMP || '.', base });
await l.js(`localStorage.removeItem('theme-v2')`);
await l.emulate([{ name: 'prefers-color-scheme', value: 'dark' }]);
await l.goto('/jobs', 3000);
check('light theme by default even if the system is dark', !(await l.js(`document.documentElement.classList.contains('dark')`)));
check('headings use Newsreader', /Newsreader/i.test(await l.js(`getComputedStyle(document.querySelector('h1')).fontFamily`)), await l.js(`getComputedStyle(document.querySelector('h1')).fontFamily`));
check('body uses IBM Plex Sans', /Plex/i.test(await l.js(`getComputedStyle(document.body).fontFamily`)), await l.js(`getComputedStyle(document.body).fontFamily`));
check('more data: many jobs listed', /1\d\d jobs|\d{3} jobs/i.test(await l.text('main')) || (await l.text('main')).includes('128'), (await l.text('main')).slice(0, 120));
await l.js(`localStorage.setItem('theme-v2','dark')`);
await l.goto('/jobs', 2000);
check('dark still works when chosen', await l.js(`document.documentElement.classList.contains('dark')`));
l.close();

// 2. fit report as the demo candidate
const b = await launch({ out: process.env.TEMP || '.', base });
await b.goto('/login', 2000);
await b.fill('#email', 'demo@jobsterritory.example'); await b.fill('#password', 'Demo-Candidate-26');
await b.click('form button[type=submit]'); await b.sleep(3500);
await b.goto('/jobs/frontend-engineer-patient-app', 4500);
const report = await b.text('[data-testid=fit-report]');
check('fit report is shown with a score out of 100', /\/ 100/.test(report), report.slice(0, 100).replace(/\n/g, ' '));
const total = Number(await b.js(`document.querySelector('[data-testid=fit-total]').innerText.split('/')[0].trim()`));
check('score is a number from 0 to 100', total >= 0 && total <= 100, String(total));
check('shows the parts (skills, experience, ...)', /Skills/.test(report) && /Experience/.test(report) && /Location/.test(report));
check('lists what is missing from the profile or says nothing is', /Missing from your profile/.test(report));
await b.shot('fit-report', true);

// 3. paste a job description
await b.goto('/fit', 3000);
await b.fill('#jd-title', 'Senior Backend Engineer');
await b.fill('#jd-text', 'We are hiring a Senior Backend Engineer.\n5+ years of experience building services in Python and PostgreSQL.\nExperience with Docker, Kubernetes and AWS.\nB.E. or B.Tech in computer science.\nFully remote.');
await b.js(`document.querySelector('[data-testid=jd-form] button[type=submit]').click()`);
await b.sleep(3000);
const jd = await b.text('main');
check('pasted JD gets a score out of 100', /\/ 100/.test(jd), jd.slice(0, 120).replace(/\n/g, ' '));
check('names missing skills from the pasted text', await b.js(`!!document.querySelector('[data-testid=fit-missing-skills]')`));
await b.shot('fit-jd', true);
// validation
await b.goto('/fit', 2500);
await b.js(`document.querySelector('[data-testid=jd-form] button[type=submit]').click()`);
await b.sleep(1500);
check('empty form shows errors', /Enter the job title/.test(await b.text('main')));
console.log('errors', JSON.stringify([...b.errors].filter((e) => !/Failed to load resource|404/.test(e))));
b.close();
process.exit(process.exitCode || 0);
