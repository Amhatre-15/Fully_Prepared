const test = require('node:test');
const assert = require('node:assert/strict');
const { createSpeechOutput } = require('../src/speech-output.js');

test('queues speech sequentially with selected voice and bounded rate', () => {
  const spoken = [];
  const voices = [{ voiceURI: 'voice-a', name: 'Voice A' }];
  const synth = { getVoices: () => voices, speak: (item) => spoken.push(item), cancel: () => {} };
  class Utterance { constructor(text) { this.text = text; } }
  const output = createSpeechOutput(synth, Utterance);
  assert.equal(output.enqueue('First question', { voiceURI: 'voice-a', rate: 8 }), true);
  output.enqueue('Second question');
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].voice.voiceURI, 'voice-a');
  assert.equal(spoken[0].rate, 1.3);
  spoken[0].onend();
  assert.equal(spoken.length, 2);
  assert.equal(spoken[1].text, 'Second question');
  assert.equal(output.pending(), 1);
});

test('stopping clears queued speech and ignores late completion events', () => {
  const spoken = [];
  const synth = { getVoices: () => [], speak: (item) => spoken.push(item), cancel: () => {} };
  class Utterance { constructor(text) { this.text = text; } }
  const output = createSpeechOutput(synth, Utterance);
  output.enqueue('Currently speaking');
  output.enqueue('Must not be spoken');
  const lateEnd = spoken[0].onend;
  output.stop();
  output.enqueue('New playback');
  lateEnd();
  assert.equal(spoken.length, 2);
  assert.equal(spoken[1].text, 'New playback');
  assert.equal(output.pending(), 1);
});

test('plays local Piper/Kokoro audio sequentially and releases temporary audio URLs', async () => {
  const calls = []; const audios = []; const revoked = [];
  const urlApi = { createObjectURL: () => `blob:test-${calls.length}`, revokeObjectURL: (url) => revoked.push(url) };
  class AudioMock {
    constructor(url) { this.url = url; this.listeners = {}; audios.push(this); }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    play() { return Promise.resolve(); }
    pause() {}
  }
  const synthesize = async (text, settings) => { calls.push({ text, settings }); return { audio: new Uint8Array([1, 2, 3]), mimeType: 'audio/wav' }; };
  const output = createSpeechOutput(null, null, synthesize, AudioMock, urlApi, Blob);
  assert.equal(output.enqueue('Piper question', { provider: 'piper', endpoint: 'http://127.0.0.1:5000/v1/audio/speech', voice: 'en_US-lessac-medium' }), true);
  output.enqueue('Kokoro question', { provider: 'kokoro', endpoint: 'http://127.0.0.1:8880/v1/audio/speech', voice: 'af_sky' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 1);
  assert.equal(audios[0].url, 'blob:test-1');
  audios[0].listeners.ended();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 2);
  assert.equal(calls[1].settings.provider, 'kokoro');
  audios[1].listeners.ended();
  assert.deepEqual(revoked, ['blob:test-1', 'blob:test-2']);
  assert.equal(output.pending(), 0);
});
