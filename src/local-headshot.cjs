function validateLocalImageEndpoint(value) {
  let url;
  try { url = new URL(String(value || '')); } catch { throw new Error('Enter a valid local Stable Diffusion WebUI address.'); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const loopback = host === 'localhost' || host === '::1' || /^127(?:\.\d{1,3}){3}$/.test(host);
  if (url.protocol !== 'http:' || !loopback || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('AI headshots only connect to a local Stable Diffusion WebUI at a loopback HTTP address.');
  }
  return `${url.origin}/sdapi/v1/img2img`;
}

function validateImageDataUrl(value) {
  if (typeof value !== 'string' || value.length > 14_000_000) throw new Error('Choose a local photo under 10 MB before generating.');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new Error('The selected photo must be a JPEG, PNG, or WebP image.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length < 16 || bytes.length > 10 * 1024 * 1024) throw new Error('Choose a local photo between 16 bytes and 10 MB.');
  const valid = match[1] === 'image/png'
    ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : match[1] === 'image/jpeg'
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw new Error('The selected photo data does not match its image format.');
  return { mime: match[1], base64: match[2], bytes };
}

function decodeGeneratedImage(value) {
  if (typeof value !== 'string' || value.length > 24_000_000) throw new Error('The local image model returned an image that is too large.');
  const base64 = value.replace(/^data:image\/(?:jpeg|png|webp);base64,/, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error('The local image model returned invalid image data.');
  const bytes = Buffer.from(base64, 'base64');
  const mime = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
    : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'image/jpeg'
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : '';
  if (!mime || bytes.length > 16 * 1024 * 1024) throw new Error('The local image model returned an unsupported or oversized image.');
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

async function generateLocalHeadshot(payload, fetchImpl = fetch) {
  if (!payload || typeof payload !== 'object') throw new Error('Choose a photo before generating a headshot.');
  const endpoint = validateLocalImageEndpoint(payload.endpoint);
  const image = validateImageDataUrl(payload.image);
  const style = String(payload.style || '').trim();
  if (!style || style.length > 500) throw new Error('Describe a headshot style in 1–500 characters.');
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      init_images: [image.base64],
      prompt: `Create a professional, realistic profile headshot based on the supplied person's photo. Preserve the person's identity, age, skin tone, and natural facial features. Do not add text, logos, or another person. Style: ${style}`,
      negative_prompt: 'different identity, changed age, altered skin tone, extra people, text, watermark, distorted face, deformed eyes, low quality',
      denoising_strength: 0.32,
      steps: 20,
      width: 512,
      height: 512,
      batch_size: 1,
      n_iter: 1
    }),
    signal: AbortSignal.timeout(120_000)
  });
  const raw = await response.text();
  if (Buffer.byteLength(raw, 'utf8') > 24 * 1024 * 1024) throw new Error('The local image service response is too large.');
  let result;
  try { result = raw ? JSON.parse(raw) : {}; } catch { throw new Error('The local image service returned invalid JSON.'); }
  if (!response.ok) throw new Error(`Local image generation failed: ${String(result.error || result.detail || `HTTP ${response.status}`).slice(0, 300)}`);
  if (!Array.isArray(result.images) || typeof result.images[0] !== 'string') throw new Error('The local image service returned no generated image.');
  return { dataUrl: decodeGeneratedImage(result.images[0]) };
}

module.exports = { validateLocalImageEndpoint, validateImageDataUrl, decodeGeneratedImage, generateLocalHeadshot };
