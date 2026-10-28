const MAX_OCR_PAGES = 20;
const MAX_EXTRACTED_CHARS = 100_000;

async function extractScannedPdfText(pageCount, { renderPage, recognizePage } = {}) {
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error('This PDF has no pages to scan.');
  if (pageCount > MAX_OCR_PAGES) throw new Error(`Scanned PDF OCR supports up to ${MAX_OCR_PAGES} pages at a time. Split this file and import the smaller parts.`);
  if (typeof renderPage !== 'function' || typeof recognizePage !== 'function') throw new Error('Local OCR is not available in this app build.');
  const pages = [];
  let total = 0;
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const image = await renderPage(pageNumber);
    const result = String(await recognizePage(image) || '').replace(/\u0000/g, '').trim();
    if (result) {
      const pageText = `[Page ${pageNumber}]\n${result}`;
      const remaining = MAX_EXTRACTED_CHARS - total;
      if (remaining <= 0) break;
      pages.push(pageText.slice(0, remaining));
      total += Math.min(pageText.length, remaining);
    }
  }
  return pages.join('\n\n');
}

module.exports = { MAX_OCR_PAGES, extractScannedPdfText };
