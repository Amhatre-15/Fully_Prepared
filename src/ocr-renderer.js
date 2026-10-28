import * as pdfjs from '../node_modules/pdfjs-dist/legacy/build/pdf.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
let pdfDocument;

window.loadPdfForOcr = async (dataUrl) => {
  if (typeof dataUrl !== 'string' || dataUrl.length > 15_000_000 || !dataUrl.startsWith('data:application/pdf;base64,')) {
    throw new Error('The PDF content is invalid or exceeds the OCR size limit.');
  }
  const base64 = dataUrl.slice('data:application/pdf;base64,'.length);
  const binary = atob(base64);
  const data = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) data[index] = binary.charCodeAt(index);
  pdfDocument = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise;
  if (pdfDocument.numPages > 20) throw new Error('Scanned PDF OCR supports up to 20 pages at a time. Split this file and import the smaller parts.');
  return pdfDocument.numPages;
};

window.renderPdfOcrPage = async (pageNumber) => {
  if (!pdfDocument || !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdfDocument.numPages) {
    throw new Error('The requested PDF page is not available for OCR.');
  }
  const page = await pdfDocument.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.max(0.5, Math.min(2, 2200 / Math.max(base.width, base.height)));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('The PDF page renderer is unavailable.');
  await page.render({ canvasContext: context, viewport }).promise;
  const image = canvas.toDataURL('image/png');
  canvas.width = 0; canvas.height = 0; page.cleanup();
  return image;
};
