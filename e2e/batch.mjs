import fs from 'node:fs';
import { launch, check } from './cdp-lib.mjs';
const BASE = 'http://localhost:3200';
const env = fs.readFileSync('.env.local', 'utf8');
const secret = env.match(/^CRON_SECRET=(.+)$/m)[1].trim();
const svc = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim();
const rest = (path, init = {}) => fetch('http://127.0.0.1:54321/rest/v1/' + path, { ...init, headers: { apikey: svc, Authorization: 'Bearer ' + svc, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) } }).then((r) => r.json());

// 1. cron endpoint is never open
check('cron: no header -> 401', (await fetch(BASE + '/api/cron/auto-apply')).status === 401);
check('cron: wrong secret -> 401', (await fetch(BASE + '/api/cron/auto-apply', { headers: { Authorization: 'Bearer nope' } })).status === 401);
const ok = await fetch(BASE + '/api/cron/auto-apply', { headers: { Authorization: 'Bearer ' + secret } });
const okBody = await ok.json();
check('cron: right secret -> 200 with counts', ok.status === 200 && 'applied' in okBody, JSON.stringify(okBody));

// seed a saved search that looks 5 years unseen, for Meera
const [meera] = await rest('profiles?select=id&full_name=eq.Meera%20Krishnan');
await rest('saved_searches', { method: 'POST', body: JSON.stringify({ candidate_id: meera.id, name: 'Engineer roles', query: { qs: 'q=engineer' }, last_seen_at: '2020-01-01T00:00:00Z' }) });

const b = await launch({ out: process.argv[2] || (process.env.TEMP || '.'), base: BASE });
await b.goto('/login', 1500);
await b.fill('#email', 'demo@jobsterritory.example'); await b.fill('#password', 'Demo-Candidate-26');
await b.click('form button[type=submit]'); await b.sleep(3500);

// 2. outcomes
await b.goto('/applications', 3500);
const oc = await b.text('[data-testid=outcomes]');
check('outcomes card shows reply rate from own history', /Got a reply/.test(oc) && /%/.test(oc), oc.slice(0, 120).replace(/\n/g, ' '));

// 3. interview + calendar
const target = await b.js(`(() => { const a = [...document.querySelectorAll('a[href^="/applications/"]')].find(x => /Shortlisted|Interview/.test(x.innerText)); return a ? a.getAttribute('href') : ''; })()`);
console.log('interview target', target);
if (target) {
  await b.goto(target, 3500);
  check('interview panel is shown', await b.js(`!!document.querySelector('[data-testid=interview-panel]')`));
  await b.fill('#interview-at', '2026-12-01T10:30');
  await b.js(`[...document.querySelectorAll('[data-testid=interview-panel] button')].find(x => x.innerText.includes('Save time')).click()`);
  await b.sleep(3000);
  check('interview time saved and shown', await b.js(`!!document.querySelector('[data-testid=interview-when]')`), await b.text('[data-testid=interview-panel]'));
  const ics = await b.js(`fetch(location.pathname.replace('/applications/', '/api/applications/') + '/ics').then(r => r.text().then(t => ({ s: r.status, t: t.slice(0, 60), ct: r.headers.get('content-type') })))`);
  check('calendar file downloads as text/calendar', ics.s === 200 && ics.t.startsWith('BEGIN:VCALENDAR') && /calendar/.test(ics.ct), JSON.stringify(ics));
}

// 4. saved-search alert
await b.goto('/saved', 4000);
check('saved search shows N new', await b.js(`!!document.querySelector('[data-testid=new-matches]')`), (await b.text('main')).slice(0, 200));

// 5. report a company on an unverified listing
await b.goto('/jobs/ux-designer-healthcare', 3500);
await b.js(`[...document.querySelectorAll('button')].find(x => x.innerText.includes('Report this company')).click()`);
await b.sleep(400);
await b.js(`[...document.querySelectorAll('[data-testid=report-form] button')].find(x => x.innerText.includes('Send report')).click()`);
await b.sleep(2500);
check('report accepted', (await b.text('main')).includes('Reported. Thank you.'));
b.close();

// 6. admin sees it, verifies the company, filter shows it
const a = await launch({ out: process.argv[2] || (process.env.TEMP || '.'), base: BASE });
await a.goto('/login', 1500);
await a.fill('#email', 'admin@jobsterritory.example'); await a.fill('#password', 'Demo-Admin-26');
await a.click('form button[type=submit]'); await a.sleep(3500);
await a.goto('/admin/reports', 3500);
check('admin sees the report', (await a.text('main')).includes('Halcyon Design'), (await a.text('main')).slice(0, 150));
await a.js(`[...document.querySelectorAll('[data-testid=report-card] button')].find(x => x.innerText.includes('Dismiss')).click()`);
await a.sleep(2500);
check('report dismissed -> queue empty', (await a.text('main')).includes('No open reports'));
await a.goto('/admin/companies', 3500);
const halcyon = await a.js(`[...document.querySelectorAll('li[data-testid^=company-]')].find(x => x.innerText.includes('Halcyon'))?.getAttribute('data-testid')`);
await a.js(`[...document.querySelector('[data-testid="${halcyon}"]').querySelectorAll('button')].find(x => x.innerText.includes('Verify this company')).click()`);
await a.sleep(300);
await a.js(`(() => { const el = document.querySelector('[data-testid="${halcyon}"] input'); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Registration and email domain checked'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await a.js(`[...document.querySelector('[data-testid="${halcyon}"]').querySelectorAll('button')].find(x => x.innerText.includes('Save verification')).click()`);
await a.sleep(2800);
check('Halcyon now verified', (await a.text(`[data-testid="${halcyon}"]`)).includes('Verified') && !(await a.text(`[data-testid="${halcyon}"]`)).includes('Not verified'));
await a.goto('/jobs?verified=1&q=ux', 3500);
check('verified-only list now includes the Halcyon job', (await a.text('main')).includes('UX Designer'));
await a.goto('/jobs?verified=1&q=react+native', 3500);
check('verified-only list excludes Aster Mobility (unverified)', !(await a.text('main')).includes('Aster Mobility'));
console.log('errors', JSON.stringify([...a.errors].filter((e) => !/Failed to load resource|404/.test(e))));
a.close();
process.exit(process.exitCode || 0);
