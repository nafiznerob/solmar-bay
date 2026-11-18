// Sound, synthesized live with WebAudio — no audio files to ship. An engine
// hum that follows the car's speed, a two-tone siren while the police are
// after you, and short blips and bursts for shots, punches, pickups and
// crashes. The context only starts on a real gesture, and N mutes it.

export function createSound() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenHigh = false;
  let sirenTimer = 0;
  let muted = false;
  let unlocked = false;

  // The context only ever starts from a real gesture (a click or a key):
  // creating it earlier makes the browser warn on every frame.
  function onGesture() {
    unlocked = true;
    ensure();
  }
  window.addEventListener('pointerdown', onGesture);
  window.addEventListener('keydown', onGesture);

  function ensure() {
    if (!unlocked) return false;
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'square';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function blip(freqA, freqB, seconds, type, volume) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqA, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), t + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  function noiseBurst(seconds, volume, lowpass) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t);
  }

  return {
    unlock() { unlocked = true; ensure(); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
    /** Called every frame: the hum follows speed, the siren follows the wanted level. */
    update(dt, speed01, driving, wanted) {
      if (!ctx) return;
      if (engineGain) engineGain.gain.value = driving ? 0.05 + speed01 * 0.09 : 0;
      if (engineOsc) engineOsc.frequency.value = 55 + speed01 * 130;
      if (sirenGain) sirenGain.gain.value = wanted > 0 && !muted ? 0.045 : 0;
      if (wanted > 0 && sirenOsc) {
        sirenTimer += dt;
        if (sirenTimer > 0.42) {
          sirenTimer = 0;
          sirenHigh = !sirenHigh;
          sirenOsc.frequency.value = sirenHigh ? 960 : 720;
        }
      }
    },
    shot() { noiseBurst(0.12, 0.5, 2600); blip(220, 60, 0.1, 'square', 0.25); },
    punch() { noiseBurst(0.08, 0.35, 900); },
    pickup() { blip(880, 1320, 0.16, 'sine', 0.3); },
    crash() { noiseBurst(0.25, 0.5, 500); },
    mission() { blip(523, 523, 0.12, 'sine', 0.3); setTimeout(() => blip(784, 784, 0.2, 'sine', 0.3), 130); },
    click() { blip(660, 660, 0.06, 'sine', 0.2); },
  };
}
