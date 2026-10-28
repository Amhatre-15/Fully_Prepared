const assert = require('node:assert/strict');
const test = require('node:test');
const { MAX_OCR_PAGES, extractScannedPdfText } = require('../src/ocr-pdf.cjs');

test('processes scanned pages in order and labels OCR text by page', async () => {
  const rendered = [];
  const recognized = [];
  const text = await extractScannedPdfText(3, {
    renderPage: async (page) => { rendered.push(page); return `image-${page}`; },
    recognizePage: async (image) => { recognized.push(image); return `Resume content ${image}`; }
  });
  assert.deepEqual(rendered, [1, 2, 3]);
  assert.deepEqual(recognized, ['image-1', 'image-2', 'image-3']);
  assert.match(text, /^\[Page 1\]/);
  assert.match(text, /\[Page 3\]/);
});

test('bounds scanned-PDF OCR page count and requires local render/recognition adapters', async () => {
  await assert.rejects(extractScannedPdfText(MAX_OCR_PAGES + 1, { renderPage: async () => '', recognizePage: async () => '' }), /up to 20 pages/);
  await assert.rejects(extractScannedPdfText(1), /not available/);
});

test('the bundled English language model initializes with local Tesseract assets', { timeout: 30_000 }, async () => {
  const path = require('node:path');
  const { createWorker } = require('tesseract.js');
  const language = require('@tesseract.js-data/eng');
  const worker = await createWorker('eng', 1, {
    langPath: language.langPath,
    gzip: true,
    corePath: path.dirname(require.resolve('tesseract.js-core')),
    workerPath: require.resolve('tesseract.js/src/worker-script/node/index.js'),
    logger: () => {}
  });
  await worker.terminate();
});
