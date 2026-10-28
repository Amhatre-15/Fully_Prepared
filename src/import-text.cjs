const { TextDecoder } = require('node:util');

async function extractImportedText(extension, fileBuffer, options = {}) {
  if (extension === 'txt') return new TextDecoder('utf-8').decode(fileBuffer);
  if (extension === 'docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  }
  if (extension === 'pdf') {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: new Uint8Array(fileBuffer), isEvalSupported: false, useSystemFonts: true });
    const pdf = await task.promise;
    if (pdf.numPages > 100) {
      await task.destroy();
      throw new Error('This PDF has more than 100 pages. Split it into smaller files and try again.');
    }
    const pages = [];
    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => typeof item.str === 'string' ? item.str : '').join(' '));
        page.cleanup();
      }
      const text = pages.join('\n');
      if (!text.trim()) {
        if (typeof options.ocrPdf === 'function') return await options.ocrPdf(fileBuffer, pdf.numPages);
        throw new Error('No selectable text was found. This may be a scanned PDF. Local OCR is required to read scanned pages.');
      }
      return text;
    } finally {
      await task.destroy();
    }
  }
  throw new Error('Choose a PDF, DOCX, or TXT file.');
}

module.exports = { extractImportedText };
