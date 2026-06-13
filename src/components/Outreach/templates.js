export const TEMPLATES = [
  {
    id: 'hiring-manager',
    label: 'Hiring Manager',
    fields: ['Name', 'Company'],
    body: (f) =>
      `Hi ${f['Name'] || '[Name]'}, I noticed ${f['Company'] || '[Company]'} has an open Data Analyst role and I wanted to reach out directly. I have hands-on experience with Power BI, SQL, and Excel — most recently building dashboards at AtliQ Technologies and supporting 500+ learners at Codebasics. I would love to learn more about the team and what you are looking for. Would you be open to a 15-minute chat?`,
  },
  {
    id: 'peer-analyst',
    label: 'Peer Data Analyst',
    fields: ['Name', 'Topic / Company', 'Subject'],
    body: (f) =>
      `Hi ${f['Name'] || '[Name]'}, I have been following your work on ${f['Topic / Company'] || '[topic/company]'} and found your posts on ${f['Subject'] || '[subject]'} really insightful. I am transitioning into data analytics from a strong analytical background and would love to hear about your journey at ${f['Topic / Company'] || '[Company]'}. Not asking for a job — just 10 minutes of your perspective. Would that be okay?`,
  },
  {
    id: 'codebasics-referral',
    label: 'Codebasics Referral',
    fields: ['Name', 'What you helped them with'],
    body: (f) =>
      `Hi ${f['Name'] || '[Name]'}, great to connect! I remember ${f['What you helped them with'] || '[specific thing you helped them with]'} on Discord a few months back. I am now actively looking for a Data Analyst role in Chennai or remote. If your company has any openings or if you know someone hiring, I would be grateful for an introduction. I can send my portfolio and resume. Thank you!`,
  },
];
