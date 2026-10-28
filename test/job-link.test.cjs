const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicAddress, validateJobUrl, parseJobPostingHtml, fetchJobPosting } = require('../src/job-link.cjs');

test('job import allows public HTTPS URLs and blocks private/local destinations', () => {
  assert.equal(validateJobUrl('https://jobs.example.com/roles/42#apply').hash, '');
  for (const address of ['127.0.0.1', '10.2.3.4', '172.20.0.1', '192.168.1.2', '169.254.1.1', '::1', 'fc00::1', '::ffff:127.0.0.1']) assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress('93.184.216.34'), true);
  assert.throws(() => validateJobUrl('http://jobs.example.com/'), /public HTTPS/);
  assert.throws(() => validateJobUrl('https://127.0.0.1/'), /private-network/i);
  assert.throws(() => validateJobUrl('https://user:secret@jobs.example.com/'), /public HTTPS/);
});

test('parses JSON-LD JobPosting metadata and decodes text without returning HTML', () => {
  const html = `<html><head><title>Role page</title><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'JobPosting', title: 'Data Analyst',
    description: '<p>Build reports &amp; improve workflows.</p>', hiringOrganization: { name: 'Example Co' }
  })}</script></head></html>`;
  assert.deepEqual(parseJobPostingHtml(html, 'https://jobs.example.com/42'), {
    title: 'Data Analyst', company: 'Example Co', description: 'Build reports & improve workflows.', sourceUrl: 'https://jobs.example.com/42'
  });
});

test('fetch follows only revalidated public HTTPS redirects and bounds response metadata', async () => {
  let requests = 0;
  const result = await fetchJobPosting('https://jobs.example.com/role', {
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
    request: async (url) => {
      requests++;
      assert.equal(url.hostname, 'jobs.example.com');
      return { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<meta property="og:title" content="Engineer"><meta name="description" content="Build resilient systems with our platform.">' };
    }
  });
  assert.equal(requests, 1);
  assert.equal(result.title, 'Engineer');
  assert.match(result.description, /Build resilient systems/);
  await assert.rejects(fetchJobPosting('https://jobs.example.com/role', {
    lookup: async () => [{ address: '10.0.0.2', family: 4 }], request: async () => assert.fail('must not request private host')
  }), /public IP/);
  await assert.rejects(fetchJobPosting('https://jobs.example.com/role', {
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
    request: async () => ({ status: 302, headers: { location: 'http://127.0.0.1/admin' }, body: '' })
  }), /public HTTPS|Local and private/);
});
