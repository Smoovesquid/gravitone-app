// Core audio engine — AudioContext, reverb, master chain

let audioInstance = null;

export function createAudioEngine() {
  if (audioInstance) return audioInstance;

  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Master gain
  const master = ctx.createGain();
  master.gain.value = 0.15;

  // Convolution reverb
  const reverb = ctx.createConvolver();
  const rate = ctx.sampleRate;
  const length = rate * 2.5;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.2);
    }
  }
  reverb.buffer = impulse;

  // Wet/dry mix
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  const dry = ctx.createGain();
  dry.gain.value = 0.7;

  master.connect(dry);
  master.connect(reverb);
  reverb.connect(wet);
  dry.connect(ctx.destination);
  wet.connect(ctx.destination);

  // Delay effect (unlockable)
  const delay = ctx.createDelay(2.0);
  delay.delayTime.value = 0.375; // dotted eighth at 120bpm
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.3;
  const delayWet = ctx.createGain();
  delayWet.gain.value = 0; // starts disabled

  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(delayWet);
  delayWet.connect(ctx.destination);

  // Chorus effect (unlockable) — implemented as a modulated delay
  const chorus = ctx.createDelay(0.1);
  chorus.delayTime.value = 0.02;
  const chorusWet = ctx.createGain();
  chorusWet.gain.value = 0; // starts disabled
  const chorusLFO = ctx.createOscillator();
  const chorusDepth = ctx.createGain();
  chorusLFO.frequency.value = 1.5;
  chorusDepth.gain.value = 0.002;
  chorusLFO.connect(chorusDepth);
  chorusDepth.connect(chorus.delayTime);
  chorusLFO.start();
  chorus.connect(chorusWet);
  chorusWet.connect(ctx.destination);

  audioInstance = {
    ctx,
    master,
    delay,
    delayWet,
    delayFeedback,
    chorus,
    chorusWet,
    effects: {
      delay: false,
      chorus: false,
    },
  };

  return audioInstance;
}

export function getAudio() {
  return audioInstance;
}

export function resumeAudio() {
  if (audioInstance && audioInstance.ctx.state === "suspended") {
    audioInstance.ctx.resume();
  }
}

export function enableEffect(name, enabled) {
  if (!audioInstance) return;
  audioInstance.effects[name] = enabled;
  if (name === "delay") {
    audioInstance.delayWet.gain.value = enabled ? 0.2 : 0;
  } else if (name === "chorus") {
    audioInstance.chorusWet.gain.value = enabled ? 0.15 : 0;
  }
}

// Connect a node to both master and any active effect sends
export function connectToMaster(node) {
  if (!audioInstance) return;
  node.connect(audioInstance.master);
  if (audioInstance.effects.delay) {
    node.connect(audioInstance.delay);
  }
  if (audioInstance.effects.chorus) {
    node.connect(audioInstance.chorus);
  }
}
