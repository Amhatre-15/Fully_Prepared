const test = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { extractImportedText } = require('../src/import-text.cjs');

function onePagePdf(text, includeScriptAction = false) {
  const escaped = text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R${includeScriptAction ? ' /OpenAction 6 0 R' : ''} >>`,
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(`BT /F1 18 Tf 72 720 Td (${escaped}) Tj ET`, 'ascii')} >>\nstream\nBT /F1 18 Tf 72 720 Td (${escaped}) Tj ET\nendstream`,
    ...(includeScriptAction ? ['<< /S /JavaScript /JS (globalThis.compromised=true) >>'] : [])
  ];
  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document, 'ascii'));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document, 'ascii');
  document += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) document += `${String(offset).padStart(10, '0')} 00000 n \n`;
  document += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(document, 'ascii');
}

test('extracts UTF-8 text files', async () => {
  assert.equal(await extractImportedText('txt', Buffer.from('Resume — analyst')), 'Resume — analyst');
});

test('extracts selectable text from PDF locally', async () => {
  const text = await extractImportedText('pdf', onePagePdf('Alex Example Resume'));
  assert.match(text, /Alex Example Resume/);
});

test('hands image-only PDFs to an injected OCR provider without sending them remotely', async () => {
  let received;
  const result = await extractImportedText('pdf', onePagePdf(''), {
    ocrPdf: async (buffer, pageCount) => { received = { buffer, pageCount }; return '[Page 1]\nScanned resume text'; }
  });
  assert.equal(received.pageCount, 1);
  assert.equal(received.buffer.length, onePagePdf('').length);
  assert.match(result, /Scanned resume text/);
});

test('reports scanned PDFs clearly when OCR support is not supplied', async () => {
  await assert.rejects(extractImportedText('pdf', onePagePdf('')), /may be a scanned PDF/);
});

test('extracts paragraphs from DOCX locally', async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Alex Example Resume</w:t></w:r></w:p></w:body></w:document>');
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  assert.match(await extractImportedText('docx', buffer), /Alex Example Resume/);
});

test('rejects unsupported file types, including executable and macro-enabled formats', async () => {
  await assert.rejects(extractImportedText('exe', Buffer.from('not a document')), /Choose a PDF, DOCX, or TXT/);
  await assert.rejects(extractImportedText('docm', Buffer.from('macro content')), /Choose a PDF, DOCX, or TXT/);
  await assert.rejects(extractImportedText('html', Buffer.from('<script>alert(1)</script>')), /Choose a PDF, DOCX, or TXT/);
});

test('extracts documents as text and does not expose embedded PDF JavaScript actions', async () => {
  const pdf = onePagePdf('Safe text content from this document', true);
  const extracted = await extractImportedText('pdf', pdf);
  assert.match(extracted, /Safe text content/);
  assert.doesNotMatch(extracted, /globalThis\.compromised/);
});
