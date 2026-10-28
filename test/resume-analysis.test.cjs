const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeResume } = require('../src/resume-analysis.js');

const resumeText = `Alex Example
alex@example.com | 555-555-1212
Professional Experience
Data Analyst, Northwind — 2022 to 2025
Built SQL dashboards and automated weekly reports, reducing reporting time by 35 percent.
Skills: SQL, Python, data analysis, communication, stakeholder management
Education: Bachelor of Science`;

test('resume review returns an explainable 100-point role-specific rubric', () => {
  const result = analyzeResume({
    resumeText,
    jobTitle: 'Data Analyst',
    jobDescription: 'Data Analyst needed to use SQL, Python, dashboards, and stakeholder communication. Analyze data, explain findings, and improve reporting workflows.'
  });
  assert.equal(result.score, Object.values(result.rubric).reduce((sum, value) => sum + value, 0));
  assert.equal(Object.values(result.rubric).reduce((sum, value) => sum + value, 0) <= 100, true);
  assert.ok(result.matchedKeywords.includes('sql'));
  assert.ok(result.matchedKeywords.includes('python'));
  assert.ok(result.rubric.roleTerms > 0);
  assert.equal(result.sectionChecks.experience, true);
  assert.equal(result.sectionChecks.skills, true);
  assert.equal(result.sectionChecks.education, true);
  assert.match(result.caveat, /not an ATS score, hiring prediction/);
});

test('resume review identifies uncovered job terms and recommends truthful tailoring', () => {
  const result = analyzeResume({
    resumeText,
    jobTitle: 'Product Designer',
    jobDescription: 'Product Designer will lead user research, prototyping, accessibility reviews, and design systems with engineering partners.'
  });
  assert.ok(result.missingKeywords.includes('prototyping'));
  assert.ok(result.recommendations.some((item) => /genuinely have this experience/.test(item)));
  assert.ok(result.recommendations.some((item) => /Do not invent numbers/.test(item)) || result.recommendations.some((item) => /cannot support/.test(item)));
});

test('resume review recognizes a limited, explainable set of verb synonyms', () => {
  const result = analyzeResume({
    resumeText: resumeText.replace('Built SQL dashboards', 'Developed SQL dashboards').replace('automated weekly reports', 'streamlined weekly reports'),
    jobTitle: 'Data Analyst',
    jobDescription: 'Build dashboards, automate reports, analyze data, and improve workflows. Communicate results with partners.'
  });
  assert.ok(result.matchedEvidence.some((item) => item.jobTerm === 'build' && item.resumeTerm === 'developed'));
  assert.ok(result.matchedEvidence.some((item) => item.jobTerm === 'automate' && item.resumeTerm === 'streamlined'));
  assert.match(result.caveat, /small disclosed set of verb synonyms/);
});

test('resume review requires a specific role, job requirements, and enough resume text', () => {
  assert.throws(() => analyzeResume({ resumeText, jobDescription: 'Long enough job description with multiple specific requirements.' }), /Enter the job title/);
  assert.throws(() => analyzeResume({ resumeText, jobTitle: 'Analyst', jobDescription: 'Short' }), /at least 40 characters/);
  assert.throws(() => analyzeResume({ resumeText: 'Short CV', jobTitle: 'Analyst', jobDescription: 'Long enough job description with multiple specific requirements.' }), /too little readable text/);
});
