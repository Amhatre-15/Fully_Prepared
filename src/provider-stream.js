(function (root) {
  function extractDelta(value, provider) {
    if (provider === 'ollama') return value.message?.content || value.response || '';
    return value.choices?.[0]?.delta?.content || value.choices?.[0]?.text || '';
  }

  async function consumeProviderStream(response, provider, onDelta = () => {}) {
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const failure = await response.json();
        detail = failure.error?.message || failure.error || failure.message || detail;
      } catch {}
      throw new Error(String(detail).slice(0, 400));
    }
    if (!response.body?.getReader) throw new Error('This model endpoint does not support streamed responses.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    let complete = '';
    let stopped = false;
    function parseLine(line) {
      const value = line.trim();
      if (!value) return;
      if (provider !== 'ollama') {
        if (!value.startsWith('data:')) return;
        const data = value.slice(5).trim();
        if (!data || data === '[DONE]') return;
        line = data;
      }
      let parsed;
      try { parsed = JSON.parse(line); }
      catch { throw new Error('The model returned a malformed streaming response.'); }
      const delta = extractDelta(parsed, provider);
      if (typeof delta === 'string' && delta) { complete += delta; onDelta(delta); }
      if (provider === 'ollama' && parsed.done === true) stopped = true;
    }
    while (!stopped) {
      const { value, done } = await reader.read();
      buffered += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() || '';
      for (const line of lines) parseLine(line);
      if (done) break;
    }
    if (buffered.trim()) parseLine(buffered);
    return complete;
  }

  const api = Object.freeze({ consumeProviderStream });
  if (root) root.FullyPreparedProviderStream = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
