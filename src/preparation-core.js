(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FullyPreparedPreparationCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  function buildResumeText(draft) {
    const lines = [];
    const add = (value) => { if (String(value || '').trim()) lines.push(String(value).trim()); };
    const section = (title) => { if (lines.length) lines.push(''); lines.push(title.toUpperCase()); };
    add(draft.name);
    add(draft.headline);
    add([draft.email, draft.phone, draft.location].filter(Boolean).join(' | '));
    if (draft.summary?.trim()) { section('Professional Summary'); add(draft.summary); }
    const roles = (draft.experiences || []).filter((item) => item.role?.trim() || item.company?.trim() || item.details?.trim());
    if (roles.length) {
      section('Experience');
      for (const item of roles) {
        add([item.role, item.company].filter(Boolean).join(' — '));
        add(item.dates);
        for (const line of String(item.details || '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) add(`• ${line.replace(/^[•*-]\s*/, '')}`);
      }
    }
    if (draft.education?.trim()) { section('Education'); add(draft.education); }
    if (draft.skills?.trim()) { section('Skills'); add(draft.skills.split(',').map((skill) => skill.trim()).filter(Boolean).join(' · ')); }
    return lines.join('\n');
  }
  function validateResumeDraft(draft) {
    if (!String(draft.name || '').trim()) return 'Enter your name to build the resume.';
    if (!String(draft.headline || '').trim()) return 'Add a professional headline or target role.';
    if (String(draft.email || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(draft.email).trim())) return 'Check the email address format.';
    if (!String(draft.summary || '').trim() && !(draft.experiences || []).some((item) => item.role?.trim() && item.company?.trim())) return 'Add a short summary or at least one role and company.';
    return '';
  }
  function createCustomQuestion({ text, category = 'Other', tags = '', id = `custom-${Date.now()}` }) {
    const question = String(text || '').trim();
    if (question.length < 12 || question.length > 600) throw new Error('Write a question between 12 and 600 characters.');
    const categories = new Set(['Behavioral', 'Technical', 'Leadership', 'Motivation', 'Situational', 'Other']);
    if (!categories.has(category)) throw new Error('Choose one of the available question categories.');
    const normalizedTags = (Array.isArray(tags) ? tags : String(tags).split(','))
      .map((tag) => String(tag).trim().slice(0, 40)).filter(Boolean).slice(0, 8);
    return { id, text: question, category, tags: normalizedTags, origin: 'custom', favorite: false, practiced: false, notes: '' };
  }
  return { buildResumeText, validateResumeDraft, createCustomQuestion };
});
