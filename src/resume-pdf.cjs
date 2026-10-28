function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function normalizeResumeDraft(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Resume data is invalid.');
  const limits = { name: 100, headline: 140, email: 160, phone: 60, location: 120, summary: 1500, education: 1200, skills: 1200 };
  const draft = {};
  for (const [key, max] of Object.entries(limits)) {
    const value = input[key] == null ? '' : input[key];
    if (typeof value !== 'string' || value.length > max) throw new Error(`Resume ${key} is invalid or too long.`);
    draft[key] = value.trim();
  }
  draft.template = input.template == null ? 'modern' : input.template;
  if (!['modern', 'classic', 'compact'].includes(draft.template)) throw new Error('Choose a supported resume PDF template.');
  if (!Array.isArray(input.experiences) || input.experiences.length > 8) throw new Error('Resume experience data is invalid.');
  draft.experiences = input.experiences.map((experience) => {
    if (!experience || typeof experience !== 'object' || Array.isArray(experience)) throw new Error('Resume experience data is invalid.');
    const role = {};
    for (const [key, max] of Object.entries({ role: 100, company: 100, dates: 80, details: 2500 })) {
      const value = experience[key] == null ? '' : experience[key];
      if (typeof value !== 'string' || value.length > max) throw new Error(`Resume experience ${key} is invalid or too long.`);
      role[key] = value.trim();
    }
    return role;
  });
  if (!draft.name || !draft.headline) throw new Error('Add your name and professional headline before exporting.');
  return draft;
}

function lineBreaks(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function createResumeHtml(input) {
  const draft = normalizeResumeDraft(input);
  const themes = {
    modern: { accent: '#159d4b', heading: '#123d2a', sub: '#28724a', border: '#c9ddd1', body: 'Arial,Helvetica,sans-serif', size: '10.5pt', margin: '17mm 18mm', sectionGap: '18px' },
    classic: { accent: '#315b83', heading: '#193552', sub: '#476b8c', border: '#cbd7e2', body: 'Georgia,"Times New Roman",serif', size: '10.5pt', margin: '18mm 20mm', sectionGap: '20px' },
    compact: { accent: '#4b5563', heading: '#1f2937', sub: '#4b5563', border: '#d1d5db', body: 'Arial,Helvetica,sans-serif', size: '9.5pt', margin: '13mm 16mm', sectionGap: '13px' }
  };
  const theme = themes[draft.template];
  const contact = [draft.email, draft.phone, draft.location].filter(Boolean).map(escapeHtml).join('<span class="sep"> • </span>');
  const section = (title, content) => content ? `<section><h2>${title}</h2>${content}</section>` : '';
  const experience = draft.experiences
    .filter((item) => item.role || item.company || item.details)
    .map((item) => `<article class="role"><div class="role-head"><h3>${escapeHtml(item.role || item.company)}</h3>${item.dates ? `<span>${escapeHtml(item.dates)}</span>` : ''}</div>${item.role && item.company ? `<p class="company">${escapeHtml(item.company)}</p>` : ''}${item.details ? `<p>${lineBreaks(item.details)}</p>` : ''}</article>`).join('');
  const skillItems = draft.skills.split(',').map((skill) => skill.trim()).filter(Boolean);
  const skills = skillItems.map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(draft.name)} - Resume</title><style>
    @page{size:A4;margin:${theme.margin}}*{box-sizing:border-box}body{margin:0;color:#172522;font:${theme.size}/1.5 ${theme.body}}header{padding:0 0 17px;border-bottom:3px solid ${theme.accent}}h1{margin:0;color:${theme.heading};font-size:26pt;line-height:1.12;letter-spacing:-.5pt}header .headline{margin:7px 0 0;color:${theme.sub};font-size:12pt;font-weight:600}.contact{margin:12px 0 0;color:#4f6259;font-size:9.5pt}.sep{padding:0 5px;color:${theme.accent}}section{margin-top:${theme.sectionGap};break-inside:avoid}h2{margin:0 0 8px;padding-bottom:5px;border-bottom:1px solid ${theme.border};color:${theme.sub};font-size:11pt;letter-spacing:1pt;text-transform:uppercase}section>p{margin:0;white-space:pre-line}.role{margin:0 0 11px;break-inside:avoid}.role:last-child{margin-bottom:0}.role-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.role h3{margin:0;font-size:11pt}.role-head span{flex:none;color:#5d7166;font-size:9pt}.company{margin:2px 0 4px;color:${theme.sub};font-weight:600}.role p:not(.company){margin:3px 0 0;white-space:pre-line}.skills{display:flex;flex-wrap:wrap;gap:6px}.skill{display:inline-block;padding:3px 8px;border:1px solid ${theme.border};border-radius:10px;background:#f5f7f9;color:#294f3a;font-size:9pt}footer{position:fixed;bottom:-9mm;left:0;right:0;color:#87948c;font-size:8pt;text-align:center}
  </style></head><body><header><h1>${escapeHtml(draft.name)}</h1><p class="headline">${escapeHtml(draft.headline)}</p>${contact ? `<p class="contact">${contact}</p>` : ''}</header>${section('Professional Summary', draft.summary ? `<p>${lineBreaks(draft.summary)}</p>` : '')}${section('Experience', experience)}${section('Education & Training', draft.education ? `<p>${lineBreaks(draft.education)}</p>` : '')}${section('Skills', skills ? `<div class="skills">${skills}</div>` : '')}<footer>${escapeHtml(draft.name)} · Resume</footer></body></html>`;
}

module.exports = { createResumeHtml, normalizeResumeDraft };
