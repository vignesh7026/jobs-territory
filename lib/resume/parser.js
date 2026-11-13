// Started as the first prototype's dependency-free resume reader and has been extended since. Heuristic by nature, so it is wrapped by
// lib/resume/index.ts (typed result, size limits) and covered by tests/resume.test.ts. Not type-checked on purpose.

/* Dependency-free resume parser: extracts text from PDF / DOCX / RTF / TXT, then pulls out structured profile fields
   with heuristics (contact info, links, skills, education, experience, years of experience, headline, summary).
   Limits: scanned/image-only PDFs have no text layer, and legacy .doc files are not supported. */
import zlib from 'node:zlib';

const MAX_INFLATE = 20 * 1024 * 1024;

// ---------- text extraction ----------
function readZipEntry(buf, wanted) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return null;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < count && p + 46 <= buf.length; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    if (name === wanted) {
      const lh = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), data = buf.subarray(lh, lh + csize);
      return method === 0 ? data : method === 8 ? zlib.inflateRawSync(data, { maxOutputLength: MAX_INFLATE }) : null;
    }
    p += 46 + nlen + elen + clen;
  }
  return null;
}
const decodeEntities = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function docxText(buf) {
  const xml = readZipEntry(buf, 'word/document.xml');
  if (!xml) return '';
  return decodeEntities(xml.toString('utf8').replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<\/w:tc>/g, '\t').replace(/<[^>]+>/g, ''));
}

function rtfText(buf) {
  let s = buf.toString('latin1');
  s = s.replace(/\{\\\*[^{}]*\}/g, '').replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\par[d]?/g, '\n').replace(/\\tab/g, '\t')
    .replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
  return s;
}

function parseCMap(text, map) {
  const u = (hex) => (hex.length % 4 === 0 ? Buffer.from(hex, 'hex').swap16().toString('utf16le') : String.fromCharCode(parseInt(hex, 16)));
  for (const blk of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const m of blk[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>/gi)) map.set(parseInt(m[1], 16), u(m[2]));
  for (const blk of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of blk[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*(?:<([0-9a-f]+)>|\[([^\]]*)\])/gi)) {
      const lo = parseInt(m[1], 16), hi = Math.min(parseInt(m[2], 16), lo + 65535);
      if (m[3]) { const base = u(m[3]).codePointAt(0); for (let c = lo; c <= hi; c++) map.set(c, String.fromCodePoint(base + c - lo)); }
      else [...m[4].matchAll(/<([0-9a-f]+)>/gi)].forEach((x, i) => map.set(lo + i, u(x[1])));
    }
  }
}

function pdfContent(c, map) {
  let out = '', i = 0, stack = [], lastY = null;
  const n = c.length;
  const hexStr = (h) => {
    h = h.replace(/\s+/g, ''); if (h.length % 2) h += '0';
    if (map.size && h.length % 4 === 0) { let s = ''; for (let k = 0; k < h.length; k += 4) { const code = parseInt(h.slice(k, k + 4), 16); s += map.get(code) ?? String.fromCharCode(code); } return s; }
    return Buffer.from(h, 'hex').toString('latin1');
  };
  while (i < n) {
    const ch = c[i];
    if (ch === '(') {
      let depth = 1, s = ''; i++;
      while (i < n && depth) {
        const d = c[i];
        if (d === '\\') { const e = c[++i]; if (e === 'n') s += '\n'; else if (e === 'r' || e === 't' || e === 'b' || e === 'f') s += ' '; else if (/[0-7]/.test(e)) { let o = e; while (o.length < 3 && /[0-7]/.test(c[i + 1])) o += c[++i]; s += String.fromCharCode(parseInt(o, 8)); } else s += e; }
        else if (d === '(') { depth++; s += d; } else if (d === ')') { depth--; if (depth) s += d; } else s += d;
        i++;
      }
      stack.push({ s });
    } else if (ch === '<' && c[i + 1] !== '<') { const e = c.indexOf('>', i); stack.push({ s: hexStr(c.slice(i + 1, e < 0 ? n : e)) }); i = e < 0 ? n : e + 1; }
    else if (ch === '[') { stack.push('['); i++; }
    else if (ch === ']') { const arr = []; while (stack.length) { const t = stack.pop(); if (t === '[') break; arr.unshift(t); } stack.push({ arr }); i++; }
    else if (/[-+.\d]/.test(ch)) { let j = i + 1; while (j < n && /[\d.]/.test(c[j])) j++; stack.push({ n: parseFloat(c.slice(i, j)) }); i = j; }
    else if (ch === '/') { let j = i + 1; while (j < n && !/[\s/<>[\]()]/.test(c[j])) j++; i = j; }
    else if (/[A-Za-z'"*]/.test(ch)) {
      let j = i + 1; while (j < n && /[A-Za-z0-9'"*]/.test(c[j])) j++;
      const op = c.slice(i, j); i = j;
      const last = stack[stack.length - 1];
      if (op === 'Tj' && last && last.s !== undefined) out += last.s;
      else if (op === 'TJ' && last && last.arr) for (const t of last.arr) { if (t.s !== undefined) out += t.s; else if (t.n < -250) out += ' '; }
      else if (op === "'" || op === '"') { out += '\n' + (last && last.s ? last.s : ''); }
      else if (op === 'Td' || op === 'TD') { const ty = stack.filter((t) => t.n !== undefined).slice(-1)[0]; out += ty && Math.abs(ty.n) > 0.5 ? '\n' : ' '; }
      else if (op === 'Tm') { const nums = stack.filter((t) => t.n !== undefined); const y = nums.length >= 6 ? nums[nums.length - 1].n : null; out += lastY === null || y === null || Math.abs(y - lastY) > 1 ? '\n' : ' '; lastY = y; }
      else if (op === 'T*') out += '\n'; else if (op === 'ET') out += '\n';
      stack = [];
    } else i++;
  }
  return out;
}

function pdfText(buf) {
  const s = buf.toString('latin1'), streams = [], map = new Map();
  let idx = 0;
  while ((idx = s.indexOf('stream', idx)) >= 0) {
    if (s.slice(idx - 3, idx) === 'end') { idx += 6; continue; }
    let start = idx + 6; if (s[start] === '\r') start++; if (s[start] === '\n') start++;
    const end = s.indexOf('endstream', start); if (end < 0) break;
    const dict = s.slice(Math.max(0, s.lastIndexOf('obj', idx)), idx);
    let data = buf.subarray(start, end);
    if (/\/FlateDecode/.test(dict)) { try { data = zlib.inflateSync(data, { maxOutputLength: MAX_INFLATE }); } catch { try { data = zlib.inflateSync(data.subarray(0, data.length - 1), { maxOutputLength: MAX_INFLATE }); } catch { idx = end + 9; continue; } } }
    else if (/\/(DCTDecode|JPXDecode|CCITTFaxDecode|LZWDecode|ASCII85Decode)/.test(dict) || /\/Subtype\s*\/Image/.test(dict)) { idx = end + 9; continue; }
    const t = data.toString('latin1');
    if (/beginbf(char|range)/.test(t)) parseCMap(t, map); else if (/\bBT\b/.test(t) && /\bET\b/.test(t)) streams.push(t);
    idx = end + 9;
  }
  return streams.map((t) => pdfContent(t, map)).join('\n');
}

function extractText(buf, filename) {
  const ext = (filename.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
  let text = '';
  try {
    if (ext === 'pdf' || buf.subarray(0, 5).toString() === '%PDF-') text = pdfText(buf);
    else if (ext === 'docx' || (buf[0] === 0x50 && buf[1] === 0x4b)) text = docxText(buf);
    else if (ext === 'rtf') text = rtfText(buf);
    else if (ext === 'txt') text = buf.toString('utf8');
    else return { text: '', error: 'Automatic reading supports PDF, DOCX, RTF and TXT. Save your resume in one of those formats.' };
  } catch { return { text: '', error: 'We could not read this file.' }; }
  text = text.replace(/\r/g, '').replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 40) return { text, error: 'No readable text found. Scanned or image-only resumes cannot be read automatically.' };
  return { text };
}

// ---------- field extraction ----------
const SKILL_DB = ['JavaScript', 'TypeScript', 'React', 'React Native', 'Next.js', 'Vue.js', 'Angular', 'Node.js', 'Express', 'HTML', 'CSS', 'Tailwind CSS', 'Bootstrap', 'Redux', 'jQuery', 'Python', 'Django', 'Flask', 'FastAPI',
  'Java', 'Spring Boot', 'Kotlin', 'Swift', 'C++', 'C#', '.NET', 'PHP', 'Laravel', 'Ruby', 'Rails', 'Golang', 'Rust', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Redis', 'Firebase', 'GraphQL', 'REST', 'API Testing',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Linux', 'Git', 'GitHub', 'CI/CD', 'Jenkins', 'Selenium', 'Cypress', 'Jest', 'Postman', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Prototyping', 'User Research', 'UX',
  'Machine Learning', 'Deep Learning', 'NLP', 'LLMs', 'Prompt Engineering', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NumPy', 'Power BI', 'Tableau', 'Excel', 'Spark', 'Airflow', 'Kafka', 'Data Analysis', 'Data Visualization', 'Statistics',
  'Communication', 'Leadership', 'Teamwork', 'Problem Solving', 'Project Management', 'Agile', 'Scrum', 'Jira', 'Time Management', 'Negotiation', 'Public Speaking',
  'SEO', 'Content Writing', 'Social Media', 'Google Ads', 'Analytics', 'Email Marketing', 'Copywriting', 'CRM', 'Salesforce', 'Cold Calling', 'Recruitment', 'Sourcing', 'Interviewing', 'Onboarding', 'ATS', 'Tally', 'GST', 'Financial Modeling', 'Accounting', 'Zendesk', 'Customer Support', 'Logistics', 'Operations'];
const ALIAS = { nodejs: 'Node.js', 'node js': 'Node.js', node: 'Node.js', reactjs: 'React', 'react.js': 'React', vuejs: 'Vue.js', postgres: 'PostgreSQL', js: 'JavaScript', ts: 'TypeScript', 'ms excel': 'Excel', 'microsoft excel': 'Excel',
  'amazon web services': 'AWS', 'google cloud': 'GCP', 'spring boot': 'Spring Boot', 'machine-learning': 'Machine Learning', 'html5': 'HTML', 'css3': 'CSS', 'tailwind': 'Tailwind CSS', 'go lang': 'Golang', 'rest api': 'REST', 'rest apis': 'REST', 'restful apis': 'REST' };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SKILL_RES = [...SKILL_DB.map((s) => [s, s]), ...Object.entries(ALIAS).map(([a, s]) => [a, s])].map(([pat, canon]) => [new RegExp(`(?<![A-Za-z0-9+#.])${esc(pat)}(?![A-Za-z0-9+#])`, 'i'), canon]);
const CITIES = ['Bengaluru', 'Bangalore', 'Mumbai', 'Delhi', 'New Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Coimbatore', 'Gurugram', 'Gurgaon', 'Noida', 'Ahmedabad', 'Jaipur', 'Kochi', 'Cochin', 'Trivandrum', 'Thiruvananthapuram', 'Madurai', 'Salem', 'Trichy', 'Tiruchirappalli', 'Erode', 'Tiruppur', 'Vellore', 'Mysuru', 'Mysore', 'Chandigarh', 'Lucknow', 'Indore', 'Bhopal', 'Nagpur', 'Visakhapatnam', 'Vijayawada', 'Surat', 'Vadodara', 'Bhubaneswar', 'Patna', 'Remote'];
const CITY_RE = new RegExp(`\\b(${CITIES.join('|')})\\b(?:\\s*,\\s*([A-Z][A-Za-z ]{2,20}))?`, 'i');
const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec';
const DATE_RANGE = new RegExp(`((?:(?:${MONTHS})[a-z]*\\.?\\s*,?\\s*'?\\d{2,4})|(?:\\d{1,2}\\/\\d{2,4})|(?:19|20)\\d{2})\\s*(?:-|\\u2013|\\u2014|to)\\s*(present|current|now|till date|ongoing|(?:(?:${MONTHS})[a-z]*\\.?\\s*,?\\s*'?\\d{2,4})|(?:\\d{1,2}\\/\\d{2,4})|(?:19|20)\\d{2})`, 'i');
const SECTION = [
  ['summary', /^(professional |career |personal )?(summary|profile|objective|about( me)?|career objective)$/i], ['experience', /^(work |professional |relevant |industry )?(experience|employment( history)?|work history|internships?)(\s*(&|and)\s*(projects|internships?))?$/i],
  ['education', /^(education(al)?( background| qualifications?)?|academics?|academic (background|qualifications?)|qualifications?)$/i], ['skills', /^(technical |key |core |professional )?(skills|competencies|technologies|tools( & technologies)?|tech stack|skills (&|and) tools)$/i],
  ['projects', /^(academic |personal |key )?projects?$/i], ['other', /^(certifications?( (and|&) languages?)?|languages?( (and|&) certifications?)?|achievements?|awards?|honou?rs( (and|&) awards)?|interests?|hobbies|references?|declaration|extra[- ]?curriculars?( activities)?|activities|leadership( (and|&) (activities|involvement))?|positions? of responsibility|publications?|volunteer(ing)?|training( (and|&) certifications?)?)$/i],
];

function sectionsOf(lines) {
  const out = { head: [] }; let cur = 'head';
  for (const l of lines) {
    const bare = l.replace(/[:\-–—_|]+$/g, '').replace(/^[•\-*\s]+/, '').trim();
    const hit = bare.length <= 45 && SECTION.find(([, re]) => re.test(bare));
    if (hit) { cur = hit[0]; (out[cur] ||= []); continue; }
    (out[cur] ||= []).push(l);
  }
  return out;
}
const monthIdx = (s) => { const m = s.toLowerCase().match(new RegExp(MONTHS)); return m ? ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[0].slice(0, 3) === 'sep' ? 'sep' : m[0]) : 0; };
function toMonths(tok, isEnd) {
  if (/present|current|now|till|ongoing/i.test(tok)) { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); }
  const y = tok.match(/(?:19|20)\d{2}/) || tok.match(/\/(\d{2,4})/), yr = y ? (y[0].length === 4 ? +y[0] : y[1] ? (+y[1] < 100 ? 2000 + +y[1] : +y[1]) : null) : (tok.match(/'?(\d{2})$/) ? 2000 + +tok.match(/'?(\d{2})$/)[1] : null);
  if (!yr) return null;
  const mm = tok.match(new RegExp(MONTHS, 'i')); const slash = tok.match(/^(\d{1,2})\//);
  return yr * 12 + (mm ? monthIdx(tok) : slash ? +slash[1] - 1 : isEnd ? 11 : 0);
}

function parseResume(text) {
  // Page furniture is not content: "Page 1 of 3", running headers like "Name – Software Developer Resume", and exact repeats of the line above.
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((l) => !/^page\s+\d+\s*(of|\/)\s*\d+$/i.test(l) && !/^.{3,40}\s[–-]\s.{0,40}\bresume$/i.test(l))
    .filter((l, i, a) => i === 0 || l !== a[i - 1])
    // the name repeated at the top of later pages is a header, not an entry
    .filter((l, i, a) => i < 3 || l !== a[0]), sec = sectionsOf(lines), top = lines.slice(0, 25).join('\n');
  const f = { headline: '', phone: '', location: '', bio: '', skills: [], experienceYears: 0, education: [], experience: [], links: { linkedin: '', github: '', portfolio: '' } };
  const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || '';

  // name hint: first plausible line
  const name = lines.slice(0, 6).find((l) => /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(l) && l.split(/\s+/).length >= 2 && l.split(/\s+/).length <= 4 && !SECTION.some(([, re]) => re.test(l)) && !/resume|curriculum|vitae/i.test(l)) || '';

  // phone: 10-13 digits, not a year range
  for (const m of top.matchAll(/(\+?\d[\d\s().-]{8,17}\d)/g)) { const d = m[1].replace(/\D/g, ''); if (d.length >= 10 && d.length <= 13 && !/^(19|20)\d{2}\D*(19|20)\d{2}/.test(m[1])) { f.phone = m[1].replace(/\s+/g, ' ').trim(); break; } }

  // links
  const li = text.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[\w\-%]+/i); if (li) f.links.linkedin = 'https://' + li[0].replace(/^https?:\/\//i, '').replace(/^[a-z]{2,3}\./i, 'www.');
  const gh = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)/i); if (gh) f.links.github = 'https://github.com/' + gh[1];
  for (const m of text.matchAll(/https?:\/\/[^\s)>,]+/gi)) { if (!/linkedin\.com|github\.com|mailto:/i.test(m[0])) { f.links.portfolio = m[0].replace(/[.;]+$/, ''); break; } }

  // location
  const loc = top.match(CITY_RE); if (loc) f.location = loc[1].replace(/^\w/, (c) => c.toUpperCase()) + (loc[2] && !/^(Email|Phone|Mobile|Linkedin|Github)/i.test(loc[2]) ? `, ${loc[2].trim()}` : '');

  // summary / bio
  const sum = (sec.summary || []).join(' ').trim(); if (sum) f.bio = sum.length > 600 ? sum.slice(0, 597).replace(/\s+\S*$/, '') + '...' : sum;

  // skills: dictionary over whole text + tokens from the skills section
  const found = new Set(), ordered = [];
  const add = (s) => { const k = s.toLowerCase(); if (!found.has(k)) { found.add(k); ordered.push(s); } };
  const skillText = text.replace(/\b[\w.-]+\.(?:com|dev|io|in|net|org)\b\S*/gi, ' ').replace(/https?:\/\/\S+/gi, ' ');
  // generic words ([weak]) only count when listed under Skills: elsewhere they describe a domain, not a skill
const WEAK = new Set(['Logistics', 'Operations', 'Analytics', 'Communication', 'Leadership', 'Teamwork', 'Time Management', 'Problem Solving']);
  const skillsSection = (sec.skills || []).join(' ');
  for (const [re, canon] of SKILL_RES) if (re.test(WEAK.has(canon) ? skillsSection : skillText)) add(canon);
  for (const l of sec.skills || []) for (const t of l.replace(/^[^:]{2,30}:/, '').split(/[,|;•·•]/)) { const s = t.trim().replace(/^[-*\s]+|[.\s]+$/g, ''); if (s && s.length <= 28 && s.split(/\s+/).length <= 3 && /^[A-Za-z][\w+#./ -]*$/.test(s) && !/^(and|or|etc|basic|good|knowledge)$/i.test(s)) add(ALIAS[s.toLowerCase()] || s); }
  f.skills = ordered.slice(0, 40);

  // education
  const eduLines = sec.education || lines;
  // Short abbreviations (BE, ME, BA, MA) are matched case-sensitively: otherwise the word "be" in "Deemed to be University" is read as a degree.
  const DEG_CI = /\b(b\.?\s?tech|b\.?\s?sc|b\.?\s?com|bca|bba|m\.?\s?tech|m\.?\s?sc|mca|mba|m\.?\s?com|ph\.?\s?d|bachelor[^,\n(]*|master[^,\n(]*|diploma[^,\n(]*)/i;
  const DEG_CS = /\b(B\.?\s?E\.?|M\.?\s?E\.?|B\.?\s?A\.?|M\.?\s?A\.?)(?=[\s,.(-]|$)/;
  const degMatch = (l) => l.match(DEG_CI) || l.match(DEG_CS);
  const TIMING = /[.,;]?\s*\(?\b(?:expected|expecting|graduating|pursuing|batch of|batch|class of)\b[^)\n]*\)?\.?/i;
  const SCHOOL = /(college|university|institute|school|academy|polytechnic|iit|nit|vit|psg|srm|anna)\b/i;
  const seenEdu = new Set();
  const skipEdu = new Set();
  eduLines.forEach((l0, i) => {
    if (skipEdu.has(i)) return;
    let l = l0;
    const d = degMatch(l); if (!d || /\b(experience|worked|developer at)\b/i.test(l)) return;
    // A two-column row: the school on the left, the degree starting further along the same line and wrapping onto
    // the next one ("CHRIST (Deemed to be University), Bengaluru Bachelor of Computer" / "Applications (BCA), ..."). Split it.
    const at = l.indexOf(d[0]);
    let rowSchool = '';
    if (at > 8 && SCHOOL.test(l.slice(0, at))) {
      rowSchool = l.slice(0, at).replace(/[|,–—\s-]+$/, '').trim();
      l = l.slice(at);
      const next = eduLines[i + 1];
      if (next && !SCHOOL.test(next) && !/^(?:19|20)\d{2}/.test(next)) { l = l + ' ' + next; skipEdu.add(i + 1); }
    }
    const near = [l, eduLines[i - 1], eduLines[i + 1], eduLines[i + 2]].filter(Boolean);
    const schoolLine = near.find((x) => SCHOOL.test(x)) || '';
    const yr = (near.slice(0, 3).join(' ').match(/(?:19|20)\d{2}(?!.*(?:19|20)\d{2})/) || [])[0] || (l.match(/(?:19|20)\d{2}/g) || []).pop() || '';
    let degree = l.replace(/\(?\b(?:cgpa|gpa|percentage|score)[^,)]*\)?/i, '').replace(TIMING, '').replace(DATE_RANGE, '').replace(/\b(?:19|20)\d{2}\b/g, '').replace(/[|,–—-]\s*$/, '').trim();
    if (schoolLine === l) degree = d[0].trim() + (degree.match(/(?:in|\()\s*[A-Za-z &]+/i) ? ' ' + degree.match(/(?:in|\()\s*[A-Za-z &]+/i)[0] : '');
    let school = (schoolLine === l ? l.replace(d[0], '').replace(/\b(?:19|20)\d{2}\b/g, '') : schoolLine).replace(/[|,–—-]+\s*$/, '').replace(/^[|,–—\s-]+/, '').replace(DATE_RANGE, '').replace(/\(?\b(?:cgpa|gpa)[^)]*\)?/i, '').trim();
    degree = degree.replace(/[.,;\s]+$/, '').slice(0, 100); school = (rowSchool || school).slice(0, 120);
    const key = (degree + school).toLowerCase(); if (seenEdu.has(key) || !degree) return; seenEdu.add(key);
    f.education.push({ school, degree, year: yr });
  });
  f.education = f.education.slice(0, 4);

  // experience & projects
  // Words that mark a line as a job title, and verbs that start a sentence about what was done (a description, not a heading).
  const ROLE = /\b(intern(ship)?|trainee|developer|engineer|analyst|manager|designer|lead|consultant|executive|associate|architect|specialist|administrator|officer|scientist|tester|assistant|coordinator|head|director|programmer|writer|editor|researcher|technician|supervisor|apprentice|freelancer?|volunteer|member|representative|accountant|teacher|tutor|recruiter|strategist|owner|founder)\b/i;
  const VERB = /^(developed|built|designed|implemented|created|led|managed|improved|optimi[sz]ed|added|integrated|worked|collaborated|wrote|deployed|automated|analy[sz]ed|conducted|maintained|delivered|launched|reduced|increased|used|made|fixed|tested|migrated|architected|engineered|established|supported|assisted|prepared|organi[sz]ed|coordinated|presented|converted|recovered|responsible|achieved|spearheaded|contributed|researched|owned|drove|handled|monitored|trained|mentored|ran|helped|enhanced|streamlined|resolved|executed|performed|participated|produced|generated|applied|utili[sz]ed|leveraged|refactored|documented|configured|set up)\b/i;
  const LOC_TAIL = new RegExp('\\s*(?:[|,–—-]\\s*|\\s)(?:' + CITIES.join('|') + ')\\b[^|]*$', 'i');
  // "8Queens Software Technology | Chennai, Tamil Nadu" -> "8Queens Software Technology"
  const STATES = '(?:India|Tamil Nadu|Karnataka|Kerala|Maharashtra|Telangana|Andhra Pradesh|Delhi|Gujarat|Rajasthan|Uttar Pradesh|West Bengal|Odisha|Punjab|Haryana|Madhya Pradesh|Bihar|Goa|TN|KA)';
  const stripLoc = (s) => s.replace(LOC_TAIL, '').replace(new RegExp('[,\\s]\\s*[A-Z][A-Za-z]+,\\s*' + STATES + '\\b.*$'), '').replace(new RegExp('[,\\s]\\s*' + STATES + '\\s*$'), '').replace(/\s*\|\s*[A-Z][A-Za-z .]+,\s*[A-Z][A-Za-z .]+$/, '').replace(/[|,–—\s-]+$/, '').trim();
  const TECHLIST = (s) => s.split(/,/).length >= 3 && !ROLE.test(s) && s.length <= 120;
  const buildBlocks = (arr, kind) => {
    const blocks = []; let cur = null;
    for (const raw of arr) {
      const l = raw.replace(/\t/g, ' ').trim(), bullet = /^[•\-*▪●◦·•]\s*/.test(l), dm = l.match(DATE_RANGE);
      if (dm && !bullet) { const head = l.replace(DATE_RANGE, '').replace(/[|,()–—-]+\s*$/, '').replace(/^[|,()–—\s-]+/, '').trim(); if (cur && !cur.period && !cur.desc.length) { cur.period = dm[0]; if (head) cur.head.push(head); } else { cur = { head: head ? [head] : [], period: dm[0], desc: [] }; blocks.push(cur); } }
      // A wrapped line: it continues the sentence above (starts in lower case), or it is another line of technologies under a project.
      else if (!bullet && cur && (/^[a-z(]/.test(l) || (kind === 'project' && cur.head.length && !/\s[–—-]\s/.test(l) && l.split(',').length >= 3))) { if (cur.desc.length) cur.desc[cur.desc.length - 1] += ' ' + l; else cur.head.push(l); }
      else if (!bullet && l.length <= 80 && (!cur || cur.desc.length) && !/[.]$/.test(l) && !VERB.test(l)) { cur = { head: [l], period: '', desc: [] }; blocks.push(cur); }
      else if (!bullet && cur && !cur.desc.length && cur.head.length < 3 && l.length <= 90 && !VERB.test(l)) cur.head.push(l);
      // a line without a bullet right after a bullet's text is that bullet wrapping onto a second line
      else if (cur && !bullet && cur.desc.length && !/[.!?)]$/.test(cur.desc[cur.desc.length - 1])) cur.desc[cur.desc.length - 1] += ' ' + l;
      else if (cur) cur.desc.push(l.replace(/^[•\-*▪●◦·•]\s*/, ''));
    }
    return blocks.filter((b) => b.head.length || b.desc.length).map((b) => {
      let [h1 = '', h2 = ''] = b.head, title = h1, company = h2, tech = '';
      if (kind === 'project') {
        // A project: its name, then usually a line of technologies. The name loses any trailing "| tech" part.
        const bar = h1.split(/\s+[|–—]\s+/);
        title = bar[0]; if (bar.length > 1 && TECHLIST(bar.slice(1).join(', '))) tech = bar.slice(1).join(', ');
        if (h2 && TECHLIST(h2)) tech = tech || h2;
        company = 'Personal project';
      } else if (h2) {
        // Two heading lines: the one that reads like a job title is the title, the other is the company.
        const r1 = ROLE.test(h1), r2 = ROLE.test(h2);
        if (r2 && !r1) { title = h2; company = h1; } else { title = h1; company = h2; }
        company = stripLoc(company);
      } else {
        // One heading line holding both: "Intern at Acme", "Intern, Acme", "Acme | Intern", "Intern - Acme".
        const parts = h1.split(/\s+(?:at|@)\s+|\s+[|–—-]\s+|,\s+/i).map((x) => x.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const ri = parts.findIndex((x) => ROLE.test(x));
          if (ri >= 0) { title = parts[ri]; company = stripLoc(parts.filter((_, i) => i !== ri)[0]); } else { title = parts[0]; company = stripLoc(parts.slice(1).join(', ')); }
        } else company = '';
      }
      const desc = b.desc.slice(0, 3).join('. ').replace(/\.\./g, '.');
      return { title: title.slice(0, 120), company: company.slice(0, 120), period: b.period.slice(0, 60), description: ((tech ? 'Technologies: ' + tech + '. ' : '') + desc).slice(0, 500) };
    }).filter((e) => e.title);
  };
  // Projects have their own header formats: "Name – Subtitle (Jun 2026 – Jul 2026) Tech, Tech," or "Name | Tech, Tech 2026",
  // with the technologies often wrapping onto the next line, then sentences about what was built.
  const YEAR_END = /\s+((?:19|20)\d{2})\)?$/;
  const projectHeader = (l) => {
    if (/^[•\-*▪●◦·]/.test(l) || VERB.test(l)) return null;
    let period = '', rest = l, tech = '';
    const paren = rest.match(/\(([^)]*\b(?:19|20)\d{2}[^)]*)\)/);
    if (paren) { const i = rest.indexOf(paren[0]); period = paren[1].trim(); tech = rest.slice(i + paren[0].length).trim(); rest = rest.slice(0, i).trim(); }
    else {
      const bar = rest.indexOf(' | ');
      if (bar > 0) {
        tech = rest.slice(bar + 3).trim(); rest = rest.slice(0, bar).trim();
        const y = tech.match(YEAR_END); if (y) { period = y[1]; tech = tech.replace(YEAR_END, '').trim(); }
      } else {
        // "Name – Subtitle Jun 2026 – Jul 2026" or "Name Sep 2026": the date closes the line, the technologies come on the next line.
        const my = '(?:' + MONTHS + ')[a-z]*\\.?\\s*\\d{4}';
        const tail = rest.match(new RegExp('\\s+(' + my + '(?:\\s*(?:-|–|—|to)\\s*(?:' + my + '|present|current))?)\\s*$', 'i'));
        if (!tail || /[.!?]$/.test(rest)) return null;
        period = tail[1].trim(); rest = rest.slice(0, rest.length - tail[0].length).trim();
      }
    }
    if (!rest || rest.length > 100) return null;
    return { title: rest, period, tech: tech.replace(/[,\s]+$/, ''), open: !tech || /,$/.test(l.trim()) };
  };
  const buildProjects = (arr) => {
    const out = []; let cur = null;
    for (const raw of arr) {
      const l = raw.replace(/\t/g, ' ').trim(), bullet = /^[•\-*▪●◦·]\s*/.test(l), h = projectHeader(l);
      if (h) { cur = { title: h.title, period: h.period, tech: h.tech, techOpen: h.open, desc: [] }; out.push(cur); continue; }
      if (!cur) continue;
      const text = l.replace(/^[•\-*▪●◦·]\s*/, '');
      // technologies that wrapped onto the next line (the line above ended with a comma)
      // (when the header had no technologies at all, the next line only counts if it reads like a comma-separated list)
      // A list can also wrap mid-item with no comma ("... Razorpay" / "API (Test Mode), LLM Agents"): join those with a space.
      const looksTech = !VERB.test(text) && text.includes(',') && !/[.!?]$/.test(text) && text.length <= 160;
      if (!cur.desc.length && !bullet && (cur.techOpen ? (cur.tech || looksTech) : (cur.tech && looksTech))) { cur.tech = (cur.tech ? cur.tech + (cur.techOpen ? ', ' : ' ') : '') + text.replace(/[,\s]+$/, ''); cur.techOpen = /,$/.test(text); continue; }
      cur.techOpen = false;
      const last = cur.desc[cur.desc.length - 1];
      if (!bullet && last !== undefined && (/^[a-z(]/.test(text) || !/[.!?)]$/.test(last))) cur.desc[cur.desc.length - 1] = last + ' ' + text;
      else cur.desc.push(text);
    }
    return out.map((p) => ({ title: p.title.slice(0, 120), company: 'Personal project', period: p.period.slice(0, 60), description: ((p.tech ? 'Technologies: ' + p.tech.replace(/[,\s]+$/, '') + '. ' : '') + p.desc.slice(0, 3).map((d) => d.replace(/[.\s]+$/, '')).join('. ')).slice(0, 500) }));
  };
  const exps = buildBlocks(sec.experience || [], 'job'), projs = buildProjects(sec.projects || []);
  f.experience = [...exps, ...projs].slice(0, 8);

  // years of experience: explicit statement, otherwise merged date ranges of the experience section
  const ex = text.match(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:professional\s+|relevant\s+|work\s+|industry\s+)?(?:experience|exp)/i);
  if (ex) f.experienceYears = Math.min(50, parseFloat(ex[1]));
  else {
    const spans = [];
    for (const l of sec.experience || []) { const m = l.match(DATE_RANGE); if (m) { const a = toMonths(m[1], false), b = toMonths(m[2], true); if (a && b && b >= a && b - a < 600) spans.push([a, b + 1]); } }
    spans.sort((x, y) => x[0] - y[0]); let total = 0, end = -1;
    for (const [a, b] of spans) { if (a > end) { total += b - a; end = b; } else if (b > end) { total += b - end; end = b; } }
    f.experienceYears = Math.round((total / 12) * 2) / 2;
  }

  // headline: a short descriptive line near the top, else the latest role
  const skipHead = (l) => l === name || /@|https?:|linkedin|github|\+?\d[\d\s-]{8,}/i.test(l) || SECTION.some(([, re]) => re.test(l)) || CITY_RE.test(l) && l.length < 30;
  // Only the lines above the first section heading can be a headline; below that it is the summary or an entry.
  // With none (most student resumes go straight from contact details to a summary), use the latest job title.
  const looksLikeContact = (l) => /\|/.test(l) && (/@|\d{5}/.test(l) || CITY_RE.test(l));
  f.headline = ((sec.head || []).find((l) => !skipHead(l) && !looksLikeContact(l) && l.length >= 6 && l.length <= 100 && !/^[A-Z]{2,}$/.test(l) && !/resume/i.test(l)) || '').slice(0, 120);
  // No headline line: use how the summary describes the person ("Software developer (BCA, 2027) who builds..." -> "Software developer (BCA, 2027)").
  if (!f.headline && f.bio) {
    const lead = (f.bio.match(/^((?:[A-Za-z][A-Za-z\/.-]*\s){0,4}?(?:developers?|engineers?|designers?|analysts?|managers?|students?|scientists?|interns?|consultants?|architects?)(?:\s*\([^)]{1,30}\))?)/i) || [])[1];
    if (lead) f.headline = lead.charAt(0).toUpperCase() + lead.slice(1);
  }
  if (!f.headline && exps[0] && exps[0].title && ROLE.test(exps[0].title)) f.headline = exps[0].title;

  const detected = { skills: f.skills.length, education: f.education.length, experience: f.experience.length, links: Object.values(f.links).filter(Boolean).length, contact: [email, f.phone, f.location].filter(Boolean).length };
  return { fields: f, email, name, detected };
}

export { extractText, parseResume };
