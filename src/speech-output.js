(function (root) {
  function createSpeechOutput(synthesis, Utterance, synthesizeLocal, AudioCtor = root?.Audio, URLApi = root?.URL, BlobCtor = root?.Blob) {
    const queue = [];
    let active = false;
    let generation = 0;
    let activeAudio = null;
    let activeUrl = '';
    function releaseAudio() {
      if (activeAudio) { activeAudio.pause?.(); activeAudio = null; }
      if (activeUrl) { URLApi?.revokeObjectURL?.(activeUrl); activeUrl = ''; }
    }
    function drain() {
      if (active || !queue.length) return;
      active = true;
      const item = queue.shift();
      const activeGeneration = generation;
      let finished = false;
      const finish = (error) => {
        if (finished || activeGeneration !== generation) return;
        finished = true; releaseAudio(); active = false;
        if (error) item.onError?.(error);
        drain();
      };
      if (item.provider !== 'system') {
        if (!synthesizeLocal || !AudioCtor || !BlobCtor || !URLApi?.createObjectURL) { finish(new Error('Local speech playback is unavailable in this build.')); return; }
        Promise.resolve().then(() => synthesizeLocal(item.text, item.settings)).then((result) => {
          if (activeGeneration !== generation) return;
          const bytes = result.audio instanceof Uint8Array ? result.audio : new Uint8Array(result.audio);
          activeUrl = URLApi.createObjectURL(new BlobCtor([bytes], { type: result.mimeType || 'audio/wav' }));
          activeAudio = new AudioCtor(activeUrl);
          activeAudio.addEventListener('ended', () => finish());
          activeAudio.addEventListener('error', () => finish(new Error('The local voice audio could not be played.')));
          Promise.resolve(activeAudio.play()).catch(() => finish(new Error('The local voice audio could not be played.')));
        }).catch(finish);
        return;
      }
      if (!synthesis || !Utterance) { finish(new Error('System speech output is unavailable.')); return; }
      const utterance = new Utterance(item.text);
      utterance.rate = item.rate; utterance.pitch = 1; utterance.volume = 1;
      utterance.voice = synthesis.getVoices().find((voice) => voice.voiceURI === item.voiceURI) || null;
      utterance.onend = finish;
      utterance.onerror = finish;
      synthesis.speak(utterance);
    }
    return Object.freeze({
      enqueue(text, options = {}) {
        const value = String(text || '').trim();
        const provider = options.provider || 'system';
        if (!value || (provider === 'system' ? (!synthesis || !Utterance) : (!synthesizeLocal || !['piper', 'kokoro'].includes(provider)))) return false;
        queue.push({ text: value.slice(0, 4000), rate: Math.max(.7, Math.min(1.3, Number(options.rate) || .96)), voiceURI: String(options.voiceURI || ''), provider, settings: options, onError: options.onError });
        drain();
        return true;
      },
      stop() { generation++; queue.length = 0; active = false; releaseAudio(); synthesis?.cancel(); },
      voices() { return synthesis?.getVoices?.() || []; },
      pending() { return queue.length + (active ? 1 : 0); }
    });
  }
  const localSynthesize = (text, options = {}) => root?.fullyPrepared?.speech?.synthesizeLocal?.({ provider: options.provider, endpoint: options.endpoint, voice: options.voice, text });
  const api = createSpeechOutput(root?.speechSynthesis, root?.SpeechSynthesisUtterance, localSynthesize);
  if (root) root.FullyPreparedSpeechOutput = api;
  if (typeof module === 'object' && module.exports) module.exports = { createSpeechOutput };
})(typeof globalThis === 'object' ? globalThis : this);
