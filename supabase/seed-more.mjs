import { companies as baseCompanies } from './seed-data.mjs';

// Extra seed content: more companies, people and many more roles across fields. All fictional.
// Jobs are written as one compact row each and expanded from a template per role family, so every description names
// the real company, title, place and skills, and nothing is claimed beyond that.

export const moreCompanies = [
  ['saffron-insurance', 'Saffron Insurance', 'Insurance', '1001-5000', 'Mumbai', 'General and health insurer selling through 40,000 agents and a growing app. Claims, pricing and technology teams sit together in the Mumbai office.'],
  ['meadow-foods', 'Meadow Foods', 'Food and beverage', '1001-5000', 'Chennai', 'Packaged foods maker with plants in Tamil Nadu and Karnataka. Supply chain, quality and sales hire every quarter.'],
  ['harbor-shipping', 'Harbor Shipping Lines', 'Maritime logistics', '501-1000', 'Kochi', 'Container shipping and port services on the west coast. Operations run around the clock and most managers started on the port floor.'],
  ['pixel-pond', 'Pixel Pond Studio', 'Animation and games', '51-200', 'Bengaluru', 'Animation studio making children\'s series and game cinematics for platforms in India and Europe.'],
  ['veda-pharma', 'Veda Pharma', 'Pharmaceuticals', '1001-5000', 'Hyderabad', 'Makes generic medicines for 60 countries. Regulatory, quality and production teams work to strict audit schedules.'],
  ['urbanroots', 'Urbanroots Realty', 'Real estate', '201-500', 'Pune', 'Residential developer building mid-priced apartments in Pune and Nashik, with an in-house design and sales team.'],
  ['nimbus-telecom', 'Nimbus Telecom', 'Telecommunications', '5001-10000', 'Gurugram', 'Broadband and mobile network operator rolling out fibre to smaller cities. Network, customer and data teams are hiring.'],
  ['cedar-schools', 'Cedar Schools', 'School education', '1001-5000', 'Madurai', 'Network of 22 CBSE schools across southern Tamil Nadu, with a central curriculum and teacher-training team.'],
  ['tidal-media', 'Tidal Media', 'Digital media', '51-200', 'Mumbai', 'Regional-language news and video publisher with a newsroom, a studio and a small product team.'],
  ['granite-build', 'Granite Build', 'Construction', '1001-5000', 'Hyderabad', 'Builds roads, bridges and commercial towers. Site engineers rotate through projects every eighteen months.'],
  ['bloom-clinics', 'Bloom Clinics', 'Healthcare services', '501-1000', 'Bengaluru', 'Chain of 34 primary-care and diagnostic clinics, with a central operations and patient-experience team.'],
  ['ember-hospitality', 'Ember Hospitality', 'Hotels and travel', '501-1000', 'Goa', 'Boutique hotels and resorts in Goa and Kerala, known for training front-of-house staff into managers.'],
  ['quantum-labs', 'Quantum Labs AI', 'Artificial intelligence', '51-200', 'Bengaluru', 'Builds language and vision models for Indian-language customer support. Small research team, fast product cycles.'],
  ['loom-textiles', 'Loom & Weave Textiles', 'Textiles and apparel', '1001-5000', 'Tiruppur', 'Knitwear exporter supplying European retailers, with in-house design, merchandising and compliance teams.'],
  ['sundial-edu', 'Sundial Learning', 'Education technology', '201-500', 'Bengaluru', 'Cohort-based courses in data, design and business for working professionals, taught by practitioners.'],
  ['ironbridge-energy', 'Ironbridge Power', 'Power and utilities', '1001-5000', 'Nagpur', 'Thermal and solar power generation with a grid-operations centre and a maintenance engineering team.'],
];

export const moreUnverified = ['tidal-media', 'ember-hospitality', 'urbanroots'];

// company, founder, founder title, recruiter, recruiter title
export const moreContacts = [
  ['saffron-insurance', 'Madhavan Pillai', 'Chairman and Managing Director', 'Ritu Chaudhary', 'Head of Talent Acquisition'],
  ['meadow-foods', 'Subbulakshmi Ramanathan', 'Founder and Chair', 'Gopal Krishnan', 'Senior HR Manager'],
  ['harbor-shipping', 'Captain Anil Varghese', 'Founder and CEO', 'Sheela Thomas', 'Talent Partner'],
  ['pixel-pond', 'Rhea D\'Souza', 'Co-founder and Creative Director', 'Manoj Gowda', 'Studio Recruiter'],
  ['veda-pharma', 'Dr. Srinivas Rao', 'Founder and Managing Director', 'Padma Latha', 'Head of Human Resources'],
  ['urbanroots', 'Nikhil Joshi', 'Founder and CEO', 'Swati Kulkarni', 'HR Lead'],
  ['nimbus-telecom', 'Gaurav Malhotra', 'Chief Executive Officer', 'Tanvi Arora', 'Lead Recruiter'],
  ['cedar-schools', 'Dr. Meenakshi Sundaram', 'Founder and Chairperson', 'Revathi Chandran', 'Academic Recruitment Head'],
  ['tidal-media', 'Zoya Fernandes', 'Founder and Editor-in-Chief', 'Kunal Mehta', 'People and Culture Manager'],
  ['granite-build', 'Venkat Reddy', 'Managing Director', 'Fatima Sheikh', 'Senior Talent Partner'],
  ['bloom-clinics', 'Dr. Aarti Hegde', 'Founder and CEO', 'Prakash Naik', 'Clinic Hiring Manager'],
  ['ember-hospitality', 'Joaquim Pereira', 'Founder and Managing Director', 'Maria Gonsalves', 'Head of People'],
  ['quantum-labs', 'Dr. Vikram Seshadri', 'Co-founder and Chief Scientist', 'Ananya Bhat', 'Talent Lead'],
  ['loom-textiles', 'Palaniswamy Gounder', 'Chairman', 'Deepa Karthikeyan', 'HR Manager'],
  ['sundial-edu', 'Shruti Venkatesh', 'Co-founder and CEO', 'Arjun Prabhu', 'Talent Acquisition Specialist'],
  ['ironbridge-energy', 'Rajiv Deshmukh', 'Managing Director', 'Vaishali Patil', 'Senior HR Business Partner'],
];

export const moreBackgrounds = {
  'saffron-insurance': ['started as an agent and built the company\'s first digital claims system', 'recruited actuaries and engineers for a national insurer'],
  'meadow-foods': ['opened the first plant in 1996 and still reviews every product recipe', 'ran campus hiring for a food major for nine years'],
  'harbor-shipping': ['sailed for fifteen years before moving ashore to run port operations', 'built crew and port-staff hiring from scratch'],
  'pixel-pond': ['animated feature films before founding the studio', 'hired artists for two game studios in Bengaluru'],
  'veda-pharma': ['led process chemistry before starting the company', 'handled regulatory and quality hiring for a large pharma group'],
  'urbanroots': ['developed apartment projects in Pune for twelve years', 'moved from site administration into people operations'],
  'nimbus-telecom': ['rolled out mobile networks across three states', 'hired network engineers for a global telecom vendor'],
  'cedar-schools': ['taught mathematics for twenty years before founding the first school', 'was a school principal and now recruits teachers across the network'],
  'tidal-media': ['reported for national dailies before launching the publication', 'built the HR function for two digital media start-ups'],
  'granite-build': ['was a site engineer on highway projects before becoming a contractor', 'recruits site and design engineers for infrastructure projects'],
  'bloom-clinics': ['practised family medicine for fourteen years', 'ran hospital staffing for a Bengaluru network'],
  'ember-hospitality': ['worked up from hotel front desk to resort manager', 'trained and hired hospitality staff across Goa'],
  'quantum-labs': ['researched speech recognition before co-founding the company', 'hired machine-learning engineers at two AI start-ups'],
  'loom-textiles': ['grew a family knitting unit into an export business', 'manages hiring for factory and design teams'],
  'sundial-edu': ['taught analytics at a business school before founding the company', 'recruited instructors and programme managers for an online university'],
  'ironbridge-energy': ['managed a 1,000 MW plant before moving to the board', 'recruits engineers and technicians for power plants'],
};

// company, name, title, college, graduation year
export const moreEmployees = [
  ['saffron-insurance', 'Pranav Iyer', 'Actuarial Analyst', 'PSG College of Technology', 2020],
  ['saffron-insurance', 'Neha Kapoor', 'Product Manager', 'Anna University', 2017],
  ['meadow-foods', 'Suresh Babu', 'Quality Manager', 'Coimbatore Institute of Technology', 2013],
  ['meadow-foods', 'Aarthi Mohan', 'Supply Chain Analyst', 'PSG College of Technology', 2021],
  ['harbor-shipping', 'Joseph Mathew', 'Port Operations Lead', 'CUSAT', 2015],
  ['pixel-pond', 'Ishita Rao', 'Lead Animator', 'Srishti Institute of Art, Design and Technology', 2016],
  ['pixel-pond', 'Dev Malhotra', 'Pipeline Engineer', 'NIT Trichy', 2019],
  ['veda-pharma', 'Lavanya Reddy', 'Regulatory Affairs Specialist', 'Osmania University', 2018],
  ['veda-pharma', 'Karthikeyan S', 'Production Chemist', 'PSG College of Technology', 2017],
  ['urbanroots', 'Omkar Patwardhan', 'Sales Manager', 'Savitribai Phule Pune University', 2014],
  ['nimbus-telecom', 'Sanjana Verma', 'Network Planning Engineer', 'NIT Trichy', 2020],
  ['nimbus-telecom', 'Rahul Chandra', 'Data Analyst', 'IIT Madras', 2019],
  ['cedar-schools', 'Bhuvaneswari K', 'Head of Mathematics', 'Madurai Kamaraj University', 2008],
  ['tidal-media', 'Faizan Ali', 'Video Producer', 'Xavier Institute of Communications', 2018],
  ['granite-build', 'Harish Babu', 'Senior Site Engineer', 'NIT Warangal', 2015],
  ['granite-build', 'Sneha Pillai', 'Structural Design Engineer', 'Anna University', 2019],
  ['bloom-clinics', 'Dr. Ramya Shekar', 'Clinic Operations Head', 'Bangalore Medical College', 2012],
  ['ember-hospitality', 'Alvito Fernandes', 'Front Office Manager', 'Goa University', 2014],
  ['quantum-labs', 'Mithun Kumar', 'Machine Learning Engineer', 'PSG College of Technology', 2021],
  ['quantum-labs', 'Pooja Narayan', 'Research Engineer', 'IISc Bengaluru', 2020],
  ['loom-textiles', 'Divya Palanisamy', 'Merchandiser', 'PSG College of Technology', 2018],
  ['sundial-edu', 'Aditya Rao', 'Programme Manager', 'Anna University', 2016],
  ['ironbridge-energy', 'Mahesh Kale', 'Plant Maintenance Engineer', 'VNIT Nagpur', 2012],
];

const LPA = 100000;

// Role families. {c} company, {t} title (without level words), {l} location, {s} first two skills.
const F = {
  backend: { skills: ['Python', 'SQL', 'REST APIs', 'Docker', 'Git'], sum: 'Build and run the services behind {c}\'s products, with code review from senior engineers.', resp: ['Design and build APIs and background jobs in {s}', 'Write tests and keep services observable', 'Review code and improve slow queries', 'Take part in on-call and fix what broke'], req: ['Solid grounding in {s}', 'You can explain a system you built and why', 'Comfortable with Git and code review'] },
  frontend: { skills: ['React', 'TypeScript', 'CSS', 'Testing', 'Accessibility'], sum: 'Build the screens customers use every day at {c}, with design and product in the same room.', resp: ['Build and test interface components in {s}', 'Turn designs into accessible, fast pages', 'Fix bugs reported by support and users', 'Share what you learn in team demos'], req: ['Hands-on with {s}', 'Care about accessibility and performance', 'A portfolio or repository we can read'] },
  fullstack: { skills: ['JavaScript', 'Node.js', 'React', 'SQL', 'Git'], sum: 'Own features end to end at {c}, from database to screen.', resp: ['Build features across the stack in {s}', 'Design tables and endpoints with review', 'Test, deploy and watch what you ship', 'Talk to the people who use it'], req: ['Comfortable with {s}', 'Have shipped at least one project end to end', 'Clear written communication'] },
  mobile: { skills: ['React Native', 'TypeScript', 'Android', 'REST APIs', 'Git'], sum: 'Build the mobile app {c} customers rely on, including on slow networks and older phones.', resp: ['Build and release app features in {s}', 'Profile and fix slow screens and crashes', 'Work with backend engineers on APIs', 'Write tests for the flows that matter'], req: ['Experience with {s}', 'You have published or demonstrated a mobile app', 'Patience for device and network quirks'] },
  devops: { skills: ['Docker', 'Kubernetes', 'Linux', 'Terraform', 'CI/CD'], sum: 'Keep {c}\'s systems deployable and reliable, and make the next release boring.', resp: ['Maintain build and deploy pipelines in {s}', 'Automate infrastructure and cut manual steps', 'Respond to incidents and write the follow-ups', 'Watch cost and capacity'], req: ['Working knowledge of {s}', 'You can debug a failing deploy calmly', 'Basic scripting'] },
  data_engineer: { skills: ['SQL', 'Python', 'Airflow', 'Kafka', 'Data Modeling'], sum: 'Build the pipelines that give {c} trustworthy data.', resp: ['Build and monitor pipelines in {s}', 'Model tables other teams can rely on', 'Find and fix data-quality problems at the source', 'Document datasets and owners'], req: ['Strong in {s}', 'You have moved data from messy to usable', 'Careful with details'] },
  data_scientist: { skills: ['Python', 'Statistics', 'SQL', 'Machine Learning', 'Pandas'], sum: 'Use data to answer real questions at {c} and say plainly how sure you are.', resp: ['Analyse and model data using {s}', 'Design experiments and read the results honestly', 'Explain findings to non-specialists', 'Hand over models others can maintain'], req: ['Good grasp of {s}', 'A project where you worked from raw data to a conclusion', 'Honest about uncertainty'] },
  ml_engineer: { skills: ['Python', 'PyTorch', 'Machine Learning', 'MLOps', 'Docker'], sum: 'Train, evaluate and ship machine-learning features at {c}.', resp: ['Train and evaluate models with {s}', 'Build the serving and monitoring around them', 'Measure quality on real examples, not just benchmarks', 'Work with product on what is worth building'], req: ['Experience with {s}', 'You have shipped or deployed a model', 'Comfortable reading papers and code'] },
  qa: { skills: ['Testing', 'Selenium', 'Cypress', 'API Testing', 'SQL'], sum: 'Make sure what {c} ships works, by testing early and automating what repeats.', resp: ['Write and maintain automated tests in {s}', 'Test new features and reproduce reported bugs', 'Report issues clearly with steps and evidence', 'Improve how the team tests'], req: ['Hands-on with {s}', 'Methodical and curious about edge cases', 'Clear bug reports'] },
  security: { skills: ['Networking', 'SIEM', 'Incident Response', 'Linux', 'Python'], sum: 'Protect {c} and its customers by finding problems before others do.', resp: ['Monitor alerts and investigate incidents using {s}', 'Review systems and code for weaknesses', 'Write up findings with clear fixes', 'Help teams build securely'], req: ['Knowledge of {s}', 'Curious and careful, with a bias for evidence', 'Willing to work some shifts'] },
  embedded: { skills: ['C++', 'Embedded Systems', 'Linux', 'Electrical Engineering', 'Testing'], sum: 'Write the software that runs on {c}\'s devices and machines.', resp: ['Write and test firmware in {s}', 'Bring up new boards with the hardware team', 'Debug on the bench and in the field', 'Document interfaces and limits'], req: ['Experience with {s}', 'You have built something that runs on hardware', 'Patient debugging'] },
  product: { skills: ['Roadmapping', 'Analytics', 'Stakeholder Management', 'User Research', 'SQL'], sum: 'Decide what {c} builds next, with evidence from users and data.', resp: ['Write clear problems and priorities using {s}', 'Talk to users every week', 'Work with design and engineering to ship', 'Measure whether it worked'], req: ['Practice in {s}', 'You can say no and explain why', 'Comfortable with numbers'] },
  designer: { skills: ['Figma', 'Prototyping', 'User Research', 'Design Systems', 'Accessibility'], sum: 'Design products at {c} that are simple to use, and test them with the people who use them.', resp: ['Design flows and screens in {s}', 'Test designs with users and revise', 'Contribute to the shared design system', 'Hand over specs developers can build from'], req: ['A portfolio showing {s}', 'You can explain your decisions', 'Care for accessibility'] },
  graphic: { skills: ['Illustration', 'Figma', 'Photoshop', 'Typography', 'Animation'], sum: 'Create the visuals that carry {c}\'s brand across print, web and social.', resp: ['Design campaign and brand assets using {s}', 'Keep visuals consistent across channels', 'Take feedback and turn work around quickly', 'Prepare files for print and web'], req: ['A portfolio with {s}', 'Strong sense of layout and type', 'Meets deadlines'] },
  content: { skills: ['Content Writing', 'Editing', 'SEO', 'Research', 'Social Media'], sum: 'Write and edit what {c} publishes: clear, accurate and worth reading.', resp: ['Write and edit articles and pages using {s}', 'Research topics and check facts', 'Work with design and marketing on campaigns', 'Track which pieces people read'], req: ['Clear writing and strong editing', 'Experience with {s}', 'Samples we can read'] },
  marketing: { skills: ['SEO', 'Google Ads', 'Analytics', 'Email Marketing', 'Content Writing'], sum: 'Grow {c} by finding the right people and giving them a reason to act.', resp: ['Plan and run campaigns using {s}', 'Report what worked in plain numbers', 'Test messages and landing pages', 'Work with sales on leads'], req: ['Experience with {s}', 'Comfortable with spreadsheets and dashboards', 'Curious about customers'] },
  sales: { skills: ['Communication', 'CRM', 'Negotiation', 'Cold Calling', 'Presentation'], sum: 'Open and grow customer relationships for {c}, with training and a clear territory.', resp: ['Find and qualify prospects using {s}', 'Run calls and demos and follow up', 'Keep the CRM accurate', 'Share what customers tell you with the team'], req: ['Good at {s}', 'Resilient and organised', 'Fluent in English; local language is a plus'] },
  success: { skills: ['Communication', 'CRM', 'Zendesk', 'Empathy', 'Analytics'], sum: 'Help {c} customers get value, and keep them.', resp: ['Onboard and support accounts using {s}', 'Spot customers at risk and act early', 'Turn feedback into requests the team can use', 'Write help articles'], req: ['Strength in {s}', 'Calm with upset customers', 'Clear writing'] },
  support: { skills: ['Customer Support', 'Communication', 'Zendesk', 'Troubleshooting', 'Empathy'], sum: 'Answer {c} customers quickly and kindly, and fix the cause where you can.', resp: ['Handle tickets and calls using {s}', 'Escalate with full details', 'Update help articles when answers change', 'Report recurring problems'], req: ['Good at {s}', 'Clear spoken and written English', 'Willing to work some shifts'] },
  hr: { skills: ['Recruitment', 'Communication', 'ATS', 'Onboarding', 'Excel'], sum: 'Support hiring and people operations at {c}, from first call to first day.', resp: ['Coordinate hiring and onboarding using {s}', 'Keep employee records accurate', 'Answer employee questions', 'Prepare monthly people reports'], req: ['Working knowledge of {s}', 'Discreet and organised', 'Pursuing or holding a relevant degree'] },
  recruiter: { skills: ['Sourcing', 'Interviewing', 'ATS', 'Communication', 'Negotiation'], sum: 'Find and hire the people {c} needs, and give every candidate a clear answer.', resp: ['Source and screen candidates using {s}', 'Coordinate interviews with hiring managers', 'Keep candidates informed at every stage', 'Report pipeline health weekly'], req: ['Experience with {s}', 'Comfortable on the phone', 'Honest and organised'] },
  finance: { skills: ['Excel', 'Accounting', 'GST', 'Financial Modeling', 'Tally'], sum: 'Keep {c}\'s numbers accurate and explain what they mean.', resp: ['Maintain books and reconcile accounts using {s}', 'Prepare monthly reports', 'Support audits and tax filings', 'Flag anything unusual early'], req: ['Strong in {s}', 'Careful and honest with numbers', 'Degree in commerce, finance or similar'] },
  ops: { skills: ['Operations', 'Excel', 'Logistics', 'Lean', 'Communication'], sum: 'Keep {c}\'s operations running on time and improve them a little every week.', resp: ['Coordinate daily operations using {s}', 'Track delays and fix their causes', 'Report weekly numbers', 'Work with suppliers and site teams'], req: ['Comfortable with {s}', 'Calm under pressure', 'Willing to be on site'] },
  analyst: { skills: ['SQL', 'Excel', 'Power BI', 'Data Analysis', 'Presentation'], sum: 'Turn {c}\'s data into answers that people act on.', resp: ['Build reports and dashboards using {s}', 'Answer questions from teams with data', 'Check numbers before they are shared', 'Explain results plainly'], req: ['Strong in {s}', 'Curious and careful', 'Clear explanations'] },
  pm: { skills: ['Project Management', 'Stakeholder Management', 'Agile', 'Jira', 'Communication'], sum: 'Run projects at {c} so they finish on time, on budget and with fewer surprises.', resp: ['Plan and track projects using {s}', 'Keep stakeholders informed', 'Raise risks early', 'Run retrospectives and fix what slowed you'], req: ['Experience with {s}', 'Organised and direct', 'Comfortable with deadlines'] },
  teacher: { skills: ['Communication', 'Presentation', 'Public Speaking', 'Documentation', 'Empathy'], sum: 'Teach and mentor learners at {c}, with a prepared curriculum and a supportive team.', resp: ['Plan and teach classes using {s}', 'Assess work and give useful feedback', 'Meet parents or learners regularly', 'Contribute to curriculum improvements'], req: ['Strength in {s}', 'Relevant degree or certification', 'Patience and warmth'] },
  health: { skills: ['Communication', 'Empathy', 'Documentation', 'Excel', 'Operations'], sum: 'Keep {c}\'s clinics running smoothly so clinicians can focus on patients.', resp: ['Manage appointments and records using {s}', 'Welcome and guide patients', 'Coordinate with doctors and labs', 'Keep records accurate and private'], req: ['Good at {s}', 'Kind and organised', 'Comfort with healthcare software'] },
  civil: { skills: ['AutoCAD', 'Project Management', 'Safety', 'Documentation', 'Excel'], sum: 'Plan and supervise construction work for {c}, from drawing to handover.', resp: ['Supervise site work and quality using {s}', 'Prepare drawings and quantity estimates', 'Keep safety records and run toolbox talks', 'Report progress daily'], req: ['Skilled in {s}', 'B.E. or B.Tech in civil engineering', 'Willing to be on site'] },
  mechanical: { skills: ['AutoCAD', 'MATLAB', 'Troubleshooting', 'Safety', 'Documentation'], sum: 'Design, maintain and improve machinery for {c}.', resp: ['Design and maintain equipment using {s}', 'Diagnose faults and plan repairs', 'Follow and improve safety procedures', 'Document changes and results'], req: ['Skilled in {s}', 'B.E. or B.Tech in mechanical or electrical engineering', 'Practical mindset'] },
  video: { skills: ['Animation', 'Illustration', 'Prototyping', 'Presentation', 'Editing'], sum: 'Produce video and motion work for {c} from script to final cut.', resp: ['Edit and animate using {s}', 'Work with writers and designers on briefs', 'Deliver in the formats each channel needs', 'Keep files organised for the team'], req: ['A reel showing {s}', 'Good sense of timing', 'Meets deadlines'] },
  legal: { skills: ['Risk', 'Documentation', 'Communication', 'Research', 'Negotiation'], sum: 'Review contracts and keep {c} compliant, in plain language.', resp: ['Review and draft agreements using {s}', 'Track regulatory changes', 'Advise teams before they commit', 'Keep clear records'], req: ['LLB with strong {s}', 'Careful and practical', 'Clear writing'] },
};

const NAMES = new Map([...baseCompanies, ...moreCompanies].map(([slug, name]) => [slug, name]));
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const first2 = (skills) => `${skills[0]} and ${skills[1]}`;
const LEVEL_REQ = { intern: 'Final-year or recently graduated student; a project or coursework in the field', junior: '0 to 2 years of experience or strong projects', mid: '3 to 5 years of relevant experience', senior: '6 or more years of experience, with ownership of a significant system or area', lead: 'Experience leading a small team and setting direction' };
const LEVEL_WORD = { intern: 'internship', junior: 'junior', mid: 'mid-level', senior: 'senior', lead: 'lead' };
const TYPE_WORD = { full_time: 'full-time', part_time: 'part-time', contract: 'contract', internship: 'internship' };

// family, company, title, location, mode, type, level, minLPA, maxLPA, hoursAgo, closesInDays
const POSTINGS = [
  ['backend', 'saffron-insurance', 'Backend Engineer, Claims Platform', 'Mumbai', 'hybrid', 'full_time', 'mid', 14, 22, 30, 24],
  ['data_scientist', 'saffron-insurance', 'Pricing Data Scientist', 'Mumbai', 'hybrid', 'full_time', 'mid', 15, 25, 70, 20],
  ['sales', 'saffron-insurance', 'Agency Development Executive', 'Pune', 'onsite', 'full_time', 'junior', 4, 7, 20, 30],
  ['finance', 'saffron-insurance', 'Claims Accountant', 'Mumbai', 'onsite', 'full_time', 'junior', 4, 6.5, 120, 16],
  ['ops', 'meadow-foods', 'Supply Chain Planner', 'Chennai', 'onsite', 'full_time', 'mid', 7, 11, 40, 22],
  ['mechanical', 'meadow-foods', 'Production Maintenance Engineer', 'Hosur', 'onsite', 'full_time', 'junior', 3.5, 6, 90, 18],
  ['marketing', 'meadow-foods', 'Brand Marketing Executive', 'Chennai', 'hybrid', 'full_time', 'junior', 4.5, 7.5, 55, 26],
  ['analyst', 'meadow-foods', 'Sales Data Analyst', 'Chennai', 'hybrid', 'full_time', 'junior', 5, 8, 36, 21],
  ['ops', 'harbor-shipping', 'Port Operations Coordinator', 'Kochi', 'onsite', 'full_time', 'junior', 4, 6.5, 26, 20],
  ['finance', 'harbor-shipping', 'Freight Billing Analyst', 'Kochi', 'onsite', 'full_time', 'mid', 5, 8, 150, 15],
  ['backend', 'harbor-shipping', 'Software Engineer, Fleet Tracking', 'Kochi', 'hybrid', 'full_time', 'mid', 10, 16, 48, 28],
  ['legal', 'harbor-shipping', 'Maritime Compliance Associate', 'Mumbai', 'onsite', 'full_time', 'mid', 8, 13, 100, 25],
  ['video', 'pixel-pond', '2D Animator', 'Bengaluru', 'hybrid', 'full_time', 'mid', 6, 10, 18, 27],
  ['graphic', 'pixel-pond', 'Concept Artist', 'Bengaluru', 'hybrid', 'full_time', 'mid', 7, 12, 60, 22],
  ['backend', 'pixel-pond', 'Pipeline Engineer', 'Bengaluru', 'hybrid', 'full_time', 'mid', 12, 18, 84, 19],
  ['graphic', 'pixel-pond', 'Animation Intern', 'Bengaluru', 'onsite', 'internship', 'intern', 2.4, 3.6, 12, 14],
  ['qa', 'veda-pharma', 'Quality Control Analyst', 'Hyderabad', 'onsite', 'full_time', 'junior', 3.5, 5.5, 44, 24],
  ['legal', 'veda-pharma', 'Regulatory Affairs Associate', 'Hyderabad', 'onsite', 'full_time', 'mid', 7, 11, 110, 20],
  ['analyst', 'veda-pharma', 'Clinical Data Analyst', 'Hyderabad', 'hybrid', 'full_time', 'mid', 8, 13, 28, 30],
  ['mechanical', 'veda-pharma', 'Production Engineer', 'Hyderabad', 'onsite', 'full_time', 'junior', 4, 6.5, 72, 17],
  ['sales', 'urbanroots', 'Property Sales Executive', 'Pune', 'onsite', 'full_time', 'junior', 3.5, 8, 22, 21],
  ['civil', 'urbanroots', 'Site Engineer', 'Nashik', 'onsite', 'full_time', 'junior', 4, 6.5, 66, 23],
  ['graphic', 'urbanroots', '3D Visualiser', 'Pune', 'hybrid', 'full_time', 'mid', 6, 10, 130, 16],
  ['marketing', 'urbanroots', 'Digital Marketing Specialist', 'Pune', 'hybrid', 'full_time', 'mid', 6, 10, 38, 29],
  ['devops', 'nimbus-telecom', 'Site Reliability Engineer', 'Gurugram', 'hybrid', 'full_time', 'senior', 24, 38, 52, 25],
  ['data_engineer', 'nimbus-telecom', 'Data Engineer, Network Analytics', 'Gurugram', 'hybrid', 'full_time', 'mid', 16, 26, 34, 28],
  ['success', 'nimbus-telecom', 'Enterprise Customer Success Manager', 'Gurugram', 'hybrid', 'full_time', 'mid', 12, 18, 80, 22],
  ['mechanical', 'nimbus-telecom', 'Fibre Network Planning Engineer', 'Noida', 'onsite', 'full_time', 'junior', 5, 8.5, 25, 19],
  ['support', 'nimbus-telecom', 'Customer Support Associate', 'Gurugram', 'onsite', 'full_time', 'junior', 2.8, 4.2, 15, 12],
  ['teacher', 'cedar-schools', 'Mathematics Teacher, Grades 6 to 10', 'Madurai', 'onsite', 'full_time', 'mid', 3.5, 6, 50, 30],
  ['teacher', 'cedar-schools', 'Science Teacher, Grades 6 to 10', 'Madurai', 'onsite', 'full_time', 'mid', 3.5, 6, 54, 30],
  ['hr', 'cedar-schools', 'HR Executive', 'Madurai', 'onsite', 'full_time', 'junior', 3, 4.5, 140, 15],
  ['product', 'cedar-schools', 'Academic Product Manager', 'Chennai', 'hybrid', 'full_time', 'mid', 9, 15, 62, 26],
  ['content', 'tidal-media', 'Tamil News Editor', 'Chennai', 'hybrid', 'full_time', 'mid', 5, 9, 16, 21],
  ['video', 'tidal-media', 'Video Producer', 'Mumbai', 'hybrid', 'full_time', 'mid', 6, 10, 46, 20],
  ['frontend', 'tidal-media', 'Frontend Developer, News Site', 'Mumbai', 'remote', 'full_time', 'junior', 6, 10, 28, 25],
  ['content', 'tidal-media', 'Editorial Intern', 'Mumbai', 'onsite', 'internship', 'intern', 1.8, 2.8, 10, 13],
  ['civil', 'granite-build', 'Structural Design Engineer', 'Hyderabad', 'hybrid', 'full_time', 'mid', 8, 13, 36, 27],
  ['civil', 'granite-build', 'Quantity Surveyor', 'Hyderabad', 'onsite', 'full_time', 'mid', 6, 10, 100, 18],
  ['pm', 'granite-build', 'Project Manager, Commercial Towers', 'Hyderabad', 'onsite', 'full_time', 'senior', 20, 32, 64, 29],
  ['civil', 'granite-build', 'Civil Engineering Trainee', 'Hyderabad', 'onsite', 'internship', 'intern', 2.4, 3.6, 20, 14],
  ['health', 'bloom-clinics', 'Clinic Front Desk Coordinator', 'Bengaluru', 'onsite', 'full_time', 'junior', 2.6, 4, 24, 15],
  ['ops', 'bloom-clinics', 'Clinic Operations Manager', 'Bengaluru', 'onsite', 'full_time', 'senior', 12, 18, 88, 24],
  ['fullstack', 'bloom-clinics', 'Full Stack Developer, Patient App', 'Bengaluru', 'hybrid', 'full_time', 'mid', 14, 22, 42, 26],
  ['analyst', 'bloom-clinics', 'Patient Experience Analyst', 'Bengaluru', 'hybrid', 'full_time', 'junior', 5, 8, 76, 21],
  ['ops', 'ember-hospitality', 'Front Office Manager', 'Goa', 'onsite', 'full_time', 'mid', 5, 8, 32, 20],
  ['marketing', 'ember-hospitality', 'Revenue and Marketing Executive', 'Goa', 'hybrid', 'full_time', 'junior', 4, 6.5, 74, 22],
  ['content', 'ember-hospitality', 'Social Media Associate', 'Goa', 'remote', 'part_time', 'junior', 2.4, 3.6, 58, 17],
  ['ml_engineer', 'quantum-labs', 'Machine Learning Engineer, Speech', 'Bengaluru', 'hybrid', 'full_time', 'senior', 30, 48, 14, 28],
  ['ml_engineer', 'quantum-labs', 'Applied Scientist, Language Models', 'Bengaluru', 'hybrid', 'full_time', 'senior', 34, 52, 40, 30],
  ['backend', 'quantum-labs', 'Backend Engineer, Inference Platform', 'Bengaluru', 'hybrid', 'full_time', 'mid', 18, 28, 21, 24],
  ['data_scientist', 'quantum-labs', 'Data Scientist, Evaluation', 'Bengaluru', 'remote', 'full_time', 'mid', 16, 26, 68, 21],
  ['ml_engineer', 'quantum-labs', 'Machine Learning Intern', 'Bengaluru', 'hybrid', 'internship', 'intern', 3, 4.8, 8, 15],
  ['ops', 'loom-textiles', 'Merchandiser', 'Tiruppur', 'onsite', 'full_time', 'junior', 3.5, 5.5, 46, 19],
  ['finance', 'loom-textiles', 'Export Documentation Executive', 'Tiruppur', 'onsite', 'full_time', 'junior', 3, 4.8, 92, 17],
  ['graphic', 'loom-textiles', 'Knitwear Designer', 'Tiruppur', 'onsite', 'full_time', 'mid', 5, 8.5, 60, 23],
  ['hr', 'loom-textiles', 'HR and Compliance Executive', 'Tiruppur', 'onsite', 'full_time', 'mid', 4.5, 7, 118, 16],
  ['teacher', 'sundial-edu', 'Data Analytics Instructor', 'Bengaluru', 'hybrid', 'part_time', 'senior', 8, 14, 27, 24],
  ['product', 'sundial-edu', 'Product Manager, Learner Experience', 'Bengaluru', 'hybrid', 'full_time', 'mid', 18, 28, 33, 27],
  ['success', 'sundial-edu', 'Learner Success Associate', 'Bengaluru', 'hybrid', 'full_time', 'junior', 4, 6.5, 19, 15],
  ['designer', 'sundial-edu', 'Product Designer', 'Bengaluru', 'hybrid', 'full_time', 'mid', 14, 22, 49, 26],
  ['mechanical', 'ironbridge-energy', 'Plant Maintenance Engineer', 'Nagpur', 'onsite', 'full_time', 'mid', 8, 13, 35, 25],
  ['mechanical', 'ironbridge-energy', 'Grid Operations Engineer', 'Nagpur', 'onsite', 'full_time', 'junior', 5, 8, 78, 21],
  ['security', 'ironbridge-energy', 'OT Security Analyst', 'Nagpur', 'hybrid', 'full_time', 'mid', 12, 20, 58, 28],
  ['embedded', 'ironbridge-energy', 'Embedded Software Engineer, Metering', 'Pune', 'hybrid', 'full_time', 'mid', 12, 19, 66, 24],
  // more roles at the original companies, to round out every field
  ['backend', 'indus-ledger', 'Backend Engineer, Lending', 'Bengaluru', 'hybrid', 'full_time', 'mid', 18, 28, 20, 25],
  ['frontend', 'indus-ledger', 'Frontend Engineer, Borrower App', 'Bengaluru', 'hybrid', 'full_time', 'junior', 10, 16, 44, 22],
  ['security', 'indus-ledger', 'Application Security Engineer', 'Bengaluru', 'hybrid', 'full_time', 'senior', 28, 42, 56, 30],
  ['analyst', 'indus-ledger', 'Credit Risk Analyst', 'Bengaluru', 'hybrid', 'full_time', 'junior', 8, 13, 30, 20],
  ['recruiter', 'jobs-territory', 'Technical Recruiter', 'Coimbatore', 'onsite', 'full_time', 'mid', 5, 8.5, 17, 25],
  ['sales', 'jobs-territory', 'Business Development Executive', 'Coimbatore', 'onsite', 'full_time', 'junior', 3.6, 6, 24, 21],
  ['support', 'jobs-territory', 'Customer Support Specialist', 'Coimbatore', 'onsite', 'full_time', 'junior', 2.8, 4.4, 40, 16],
  ['qa', 'tamarind-health', 'QA Engineer, Mobile', 'Chennai', 'hybrid', 'full_time', 'mid', 8, 13, 52, 23],
  ['mobile', 'tamarind-health', 'React Native Developer, Clinic App', 'Chennai', 'hybrid', 'full_time', 'mid', 12, 19, 38, 26],
  ['devops', 'brightwell-labs', 'Platform Engineer', 'Pune', 'remote', 'full_time', 'senior', 24, 36, 64, 28],
  ['content', 'brightwell-labs', 'Technical Writer', 'Pune', 'remote', 'full_time', 'mid', 9, 15, 72, 24],
  ['data_engineer', 'orchard-cloud', 'Data Engineer, Billing', 'Hyderabad', 'hybrid', 'full_time', 'mid', 15, 24, 31, 27],
  ['security', 'orchard-cloud', 'Cloud Security Engineer', 'Hyderabad', 'hybrid', 'full_time', 'senior', 28, 42, 83, 22],
  ['ops', 'meridian-freight', 'Depot Operations Executive', 'Mumbai', 'onsite', 'full_time', 'junior', 3.5, 5.5, 29, 18],
  ['analyst', 'meridian-freight', 'Logistics Data Analyst', 'Mumbai', 'hybrid', 'full_time', 'junior', 5, 8, 47, 24],
  ['embedded', 'lattice-robotics', 'Embedded Firmware Engineer', 'Bengaluru', 'onsite', 'full_time', 'mid', 16, 26, 39, 26],
  ['mechanical', 'lattice-robotics', 'Mechanical Design Engineer', 'Bengaluru', 'onsite', 'full_time', 'mid', 10, 16, 61, 23],
  ['product', 'fernhill-analytics', 'Product Manager, Retail Analytics', 'London', 'hybrid', 'full_time', 'senior', 60, 80, 45, 27],
  ['designer', 'parallax-games', 'UI Artist', 'Singapore', 'hybrid', 'full_time', 'mid', 45, 65, 37, 25],
  ['sales', 'koel-learning', 'Inside Sales Executive', 'Delhi', 'onsite', 'full_time', 'junior', 3.6, 6, 23, 14],
  ['hr', 'greenfield-energy', 'HR Business Partner', 'Coimbatore', 'hybrid', 'full_time', 'mid', 9, 14, 98, 22],
  ['pm', 'aster-mobility', 'Program Manager, City Launches', 'Gurugram', 'onsite', 'full_time', 'senior', 20, 30, 57, 21],
  ['finance', 'quayside-payments', 'Finance Analyst, Payouts', 'Dublin', 'hybrid', 'full_time', 'mid', 50, 68, 88, 26],
  ['legal', 'northgate-security', 'Privacy and Compliance Counsel', 'Toronto', 'hybrid', 'full_time', 'senior', 90, 120, 105, 29],
  ['marketing', 'basil-commerce', 'Growth Marketing Associate', 'Kochi', 'hybrid', 'full_time', 'junior', 4.5, 7, 21, 20],
  ['fullstack', 'vantage-retail', 'Full Stack Engineer, Loyalty', 'Austin', 'remote', 'full_time', 'mid', 90, 125, 43, 28],
  ['designer', 'halcyon-design', 'Visual Designer', 'Mumbai', 'hybrid', 'full_time', 'junior', 6, 10, 64, 19],
];

const currencyOf = (loc) => ({ London: ['GBP', 1000], Dublin: ['EUR', 1000], Singapore: ['SGD', 1000], Toronto: ['CAD', 1000], Austin: ['USD', 1000] })[loc];

function build(row) {
  const [family, co, title, loc, mode, type, level, minL, maxL, hrs, closes] = row;
  const f = F[family];
  const cur = currencyOf(loc);
  const [currency, unit] = cur ?? ['INR', LPA];
  const min = Math.round(minL * unit), max = Math.round(maxL * unit);
  const s2 = first2(f.skills);
  const fill = (t) => t.replaceAll('{c}', NAMES.get(co) ?? co).replaceAll('{s}', s2);
  const slug = `${slugify(title)}-${co.split('-')[0]}`;
  const where = mode === 'remote' ? 'working remotely' : `based in ${loc} (${mode === 'onsite' ? 'on-site' : mode})`;
  const summary = `${fill(f.sum)} This is a ${LEVEL_WORD[level]}, ${TYPE_WORD[type]} role ${where}.`;
  const req = [...f.req.map(fill), LEVEL_REQ[level]];
  return { slug, co, title, loc, mode, type, level, min, max, currency, skills: f.skills, summary, resp: f.resp.map(fill), req, hrs, closes };
}

export const moreJobs = POSTINGS.map(build);
