const dns = require('node:dns').promises;
const https = require('node:https');
const net = require('node:net');

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168))
      || (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100))
      || (a === 203 && b === 0 && c === 113));
  }
  if (family === 6) {
    const value = address.toLowerCase();
    if (value.startsWith('::ffff:')) return isPublicAddress(value.slice(7));
    const first = Number.parseInt(value.split(':')[0] || '0', 16);
    return first >= 0x2000 && first <= 0x3fff && !value.startsWith('2001:db8:') && !value.startsWith('2001:10:');
  }
  return false;
}

function validateJobUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { throw new Error('Enter a valid job-post URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') {
    throw new Error('For safety, job-post import requires a public HTTPS URL without credentials or a custom port.');
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Local and private job-post addresses are not allowed.');
  }
  if (net.isIP(host) && !isPublicAddress(host)) throw new Error('Private-network addresses are not allowed.');
  url.hash = '';
  return url;
}

function decodeEntities(value) {
  return String(value || '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code) => {
    const lower = code.toLowerCase();
    if (lower === 'amp') return '&'; if (lower === 'lt') return '<'; if (lower === 'gt') return '>';
    if (lower === 'quot') return '"'; if (lower === 'apos') return "'"; if (lower === 'nbsp') return ' ';
    const number = lower.startsWith('#x') ? Number.parseInt(lower.slice(2), 16) : Number.parseInt(lower.slice(1), 10);
    try { return Number.isFinite(number) && number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : ' '; } catch { return ' '; }
  });
}

function cleanText(value, maxLength) {
  return decodeEntities(String(value || '').replace(/<\/?(?:p|div|br|li|h[1-6]|section|article|tr)[^>]*>/gi, '\n').replace(/<[^>]*>/g, ' '))
    .replace(/[\t\r ]+/g, ' ').replace(/\n\s+/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, maxLength);
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  return result;
}

function parseJobPostingHtml(html, pageUrl) {
  const source = String(html || '').slice(0, 2 * 1024 * 1024);
  if (!source.trim()) throw new Error('The job page was empty.');
  const metas = {};
  for (const match of source.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (key && attrs.content) metas[key] = attrs.content;
  }
  let structured = null;
  for (const match of source.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1].replace(/^\s*<!--|-->\s*$/g, ''));
      const candidates = Array.isArray(data) ? data : [data];
      const queue = [...candidates];
      while (queue.length) {
        const item = queue.shift(); if (!item || typeof item !== 'object') continue;
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (types.some((type) => String(type || '').toLowerCase() === 'jobposting')) { structured = item; break; }
        if (Array.isArray(item['@graph'])) queue.push(...item['@graph']);
      }
      if (structured) break;
    } catch { /* Ignore malformed structured data and use ordinary page metadata. */ }
  }
  const titleTag = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const company = cleanText(structured?.hiringOrganization?.name || metas['og:site_name'] || '', 120);
  const title = cleanText(structured?.title || metas['og:title'] || metas.title || titleTag, 240);
  const description = cleanText(structured?.description || metas['og:description'] || metas.description || '', 20_000);
  if (!title && !description) throw new Error('Could not find readable job details on this page. You can still paste the job description manually.');
  return { title, company, description, sourceUrl: pageUrl };
}

function requestHttps(url, address, family, signal) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'GET', signal,
      headers: { 'User-Agent': 'FullyPrepared/0.1 (+job details import)', Accept: 'text/html,application/xhtml+xml' },
      lookup: (_hostname, _options, callback) => callback(null, address, family),
      servername: url.hostname
    }, (response) => {
      const chunks = []; let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) { request.destroy(new Error('Job page is larger than the 2 MB import limit.')); return; }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ status: response.statusCode || 0, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.setTimeout(12_000, () => request.destroy(new Error('The job page took too long to respond.')));
    request.on('error', reject); request.end();
  });
}

async function fetchJobPosting(value, { lookup = dns.lookup, request = requestHttps } = {}) {
  let url = validateJobUrl(value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const addresses = await lookup(url.hostname, { all: true, verbatim: true });
      if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error('The job page host does not resolve only to public IP addresses.');
      const response = await request(url, addresses[0].address, addresses[0].family, controller.signal);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects === 3 || !response.headers.location) throw new Error('The job page redirected too many times.');
        url = validateJobUrl(new URL(response.headers.location, url).toString());
        continue;
      }
      if (response.status < 200 || response.status >= 300) throw new Error(`The job page returned HTTP ${response.status}.`);
      const contentType = String(response.headers['content-type'] || '').toLowerCase();
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) throw new Error('The link did not return an HTML job page.');
      if (Buffer.byteLength(response.body, 'utf8') > 2 * 1024 * 1024) throw new Error('Job page is larger than the 2 MB import limit.');
      return parseJobPostingHtml(response.body, url.toString());
    }
    throw new Error('Could not follow the job-page link.');
  } finally { clearTimeout(timeout); }
}

module.exports = { isPublicAddress, validateJobUrl, parseJobPostingHtml, fetchJobPosting };
