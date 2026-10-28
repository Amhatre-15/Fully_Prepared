const assert = require('node:assert/strict');
const test = require('node:test');
const { validateLocalImageEndpoint, validateImageDataUrl, decodeGeneratedImage, generateLocalHeadshot } = require('../src/local-headshot.cjs');

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 73, 69, 78, 68]);
const photo = `data:image/png;base64,${png.toString('base64')}`;

test('local image generation accepts loopback only and validates image bytes', () => {
  assert.equal(validateLocalImageEndpoint('http://127.0.0.1:7860'), 'http://127.0.0.1:7860/sdapi/v1/img2img');
  assert.equal(validateLocalImageEndpoint('http://localhost:7860'), 'http://localhost:7860/sdapi/v1/img2img');
  assert.throws(() => validateLocalImageEndpoint('https://example.com'), /local Stable Diffusion/);
  assert.throws(() => validateLocalImageEndpoint('http://127.0.0.1:7860/path'), /local Stable Diffusion/);
  assert.equal(validateImageDataUrl(photo).mime, 'image/png');
  assert.throws(() => validateImageDataUrl(`data:image/png;base64,${Buffer.alloc(20, 1).toString('base64')}`), /does not match/);
  assert.throws(() => decodeGeneratedImage(Buffer.from('not an image').toString('base64')), /unsupported/);
});

test('generates a source-grounded portrait through the validated local img2img API', async () => {
  let call;
  const result = await generateLocalHeadshot({ endpoint: 'http://127.0.0.1:7860', image: photo, style: 'soft studio lighting' }, async (url, options) => {
    call = { url, options };
    return { ok: true, status: 200, text: async () => JSON.stringify({ images: [png.toString('base64')] }) };
  });
  const body = JSON.parse(call.options.body);
  assert.equal(call.url, 'http://127.0.0.1:7860/sdapi/v1/img2img');
  assert.equal(body.init_images[0], png.toString('base64'));
  assert.match(body.prompt, /Preserve the person's identity/);
  assert.equal(body.denoising_strength, 0.32);
  assert.match(result.dataUrl, /^data:image\/png;base64,/);
});

test('rejects remote endpoints, missing source photos, and failed local image service responses', async () => {
  await assert.rejects(generateLocalHeadshot({ endpoint: 'http://example.com', image: photo, style: 'studio' }, fetch), /local Stable Diffusion/);
  await assert.rejects(generateLocalHeadshot({ endpoint: 'http://127.0.0.1:7860', style: 'studio' }, fetch), /Choose a local photo/);
  await assert.rejects(generateLocalHeadshot({ endpoint: 'http://127.0.0.1:7860', image: photo, style: 'studio' }, async () => ({ ok: false, status: 500, text: async () => JSON.stringify({ error: 'service unavailable' }) })), /service unavailable/);
});
