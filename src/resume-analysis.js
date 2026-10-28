(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FullyPreparedResumeAnalysis = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const stopWords = new Set(('a an the and or but if then than of for to in on at by with from as is are be been being this that these those it its your you we our their they them will can should must have has had having experience years year work working role team skills skill ability abilities knowledge required preferred responsibilities qualification qualifications including plus strong excellent good successful relevant candidate position job company business environment using use used across within into about').split(' '));
  const synonymGroups = [
    ['build', 'built', 'develop', 'developed', 'create', 'created', 'implement', 'implemented'],
    ['lead', 'led', 'manage', 'managed', 'supervise', 'supervised'],
    ['analyze', 'analyzed', 'analyse', 'analysed', 'evaluate', 'evaluated', 'assess', 'assessed'],
    ['improve', 'improved', 'enhance', 'enhanced', 'optimize', 'optimized', 'optimise', 'optimised'],
    ['communicate', 'communication', 'present', 'presented', 'explain', 'explained'],
    ['automate', 'automated', 'automation', 'streamline', 'streamlined'],
    ['design', 'designed', 'prototype', 'prototyped'],
    ['mentor', 'mentored', 'coach', 'coached']
  ];
  const synonymLookup = new Map(synonymGroups.flatMap((group) => group.map((term) => [term, group])));

  function tokenize(value) {
    return String(value || '').toLowerCase().match(/[a-z0-9][a-z0-9+#.-]*/g) || [];
  }

  function meaningfulTerms(value) {
    const counts = new Map();
    for (const token of tokenize(value)) {
      const normalized = token.replace(/^[.+#-]+|[.+#-]+$/g, '');
      if (normalized.length < 2 || stopWords.has(normalized) || /^\d+$/.test(normalized)) continue;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).map(([term]) => term);
  }

  function matchingEvidence(terms, resumeTerms) {
    const evidence = [];
    for (const term of terms) {
      const group = synonymLookup.get(term) || [term];
      const resumeTerm = group.find((candidate) => resumeTerms.has(candidate));
      if (resumeTerm) evidence.push({ jobTerm: term, resumeTerm });
    }
    return evidence;
  }

  function analyzeResume({ resumeText, jobTitle, jobDescription }) {
    const resume = String(resumeText || '').slice(0, 100_000);
    const role = String(jobTitle || '').trim();
    const description = String(jobDescription || '').slice(0, 30_000);
    const roleTerms = meaningfulTerms(role);
    const jobTerms = meaningfulTerms(description);
    if (resume.trim().length < 80) throw new Error('This resume has too little readable text to assess. Try a text-based PDF, DOCX, or TXT file.');
    if (roleTerms.length === 0) throw new Error('Enter the job title so the review can be tied to a specific role.');
    if (description.trim().length < 40) throw new Error('Paste at least 40 characters of the job description for a useful comparison.');
    if (jobTerms.length === 0) throw new Error('The job description needs readable role requirements or skill terms.');

    const resumeTerms = new Set(tokenize(resume));
    const allTerms = [...new Set([...roleTerms, ...jobTerms])].slice(0, 18);
    const matchedEvidence = matchingEvidence(allTerms, resumeTerms);
    const matchedKeywords = matchedEvidence.map((item) => item.jobTerm);
    const missingKeywords = allTerms.filter((term) => !matchedKeywords.includes(term));

    const roleHits = matchingEvidence(roleTerms, resumeTerms);
    const roleScore = Math.round((roleHits.length / roleTerms.length) * 25);
    const descriptionTerms = jobTerms.slice(0, 12);
    const descriptionHits = matchingEvidence(descriptionTerms, resumeTerms);
    const keywordScore = Math.round((descriptionHits.length / descriptionTerms.length) * 45);

    const sectionChecks = [
      /\b(experience|employment|work history|professional background)\b/i.test(resume),
      /\b(education|academic|degree|university|college)\b/i.test(resume),
      /\b(skills|technical skills|core competencies|proficiencies)\b/i.test(resume),
      /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\d(). -]{7,}\d))/i.test(resume)
    ];
    const structureScore = Math.round((sectionChecks.filter(Boolean).length / sectionChecks.length) * 15);

    const achievementCount = (resume.match(/\b(increased|improved|reduced|delivered|launched|built|led|managed|saved|grew|achieved|created|automated|optimized|supported|implemented|designed)\b/gi) || []).length;
    const quantifiedCount = (resume.match(/\b\d+(?:\.\d+)?\s*(?:%|percent|k\+?|m\+?|million|thousand|hours?|days?|weeks?|months?|years?|users?|clients?|customers?|projects?|teams?)\b/gi) || []).length;
    const evidenceScore = Math.min(15, Math.round(Math.min(achievementCount, 5) * 1.5 + Math.min(quantifiedCount, 4) * 1.875));

    const score = Math.max(0, Math.min(100, roleScore + keywordScore + structureScore + evidenceScore));
    const band = score >= 80 ? 'Strong evidence of alignment' : score >= 65 ? 'Good alignment' : score >= 45 ? 'Partial alignment' : 'Limited evidence of alignment';
    const recommendations = [];
    if (missingKeywords.length) recommendations.push(`If you genuinely have this experience, reflect the job's language where it accurately describes your work: ${missingKeywords.slice(0, 6).join(', ')}.`);
    if (!sectionChecks[0]) recommendations.push('Add a clearly labeled Experience section with role, employer, dates, and concise outcome-focused bullets.');
    if (!sectionChecks[2]) recommendations.push('Add a focused Skills section containing only skills you can confidently discuss.');
    if (!sectionChecks[1]) recommendations.push('Add an Education or relevant training section if it supports this role.');
    if (quantifiedCount < 2) recommendations.push('Where you can substantiate it, add measurable scope or outcomes (for example, volume, time saved, quality, or revenue). Do not invent numbers.');
    if (!sectionChecks[3]) recommendations.push('Make contact details easy to find; include a professional email and phone number if appropriate.');
    if (!recommendations.length) recommendations.push('The resume shows several relevant signals. Tailor the summary and strongest evidence to the role, and verify every claim before sending.');

    return {
      score,
      band,
      rubric: { roleTerms: roleScore, jobKeywords: keywordScore, structure: structureScore, evidence: evidenceScore },
      matchedKeywords,
      matchedEvidence,
      missingKeywords,
      recommendations,
      sectionChecks: { experience: sectionChecks[0], education: sectionChecks[1], skills: sectionChecks[2], contact: sectionChecks[3] },
      caveat: 'This is a local, rule-based estimate of text and section overlap—not an ATS score, hiring prediction, or assessment of your worth. It recognizes only a small disclosed set of verb synonyms and cannot reliably infer broader context. Review the evidence yourself and never add a skill or result you cannot support.'
    };
  }

  return { analyzeResume };
});
