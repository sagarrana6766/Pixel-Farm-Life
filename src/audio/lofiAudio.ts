// Calming Lo-Fi procedural Web Audio engine & sound design
class LofiAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private vinylGain: GainNode | null = null;

  private isPlaying: boolean = false;
  private currentTrackIdx: number = 0;
  private musicTimer: number | null = null;
  private vinylNode: AudioNode | null = null;
  private rainNode: AudioNode | null = null;

  public tracks = [
    { id: 'morning_dew', name: 'Morning Dew (Warm Rhodes & Birds)' },
    { id: 'golden_meadow', name: 'Golden Meadow (Kalimba & Soft Breeze)' },
    { id: 'starlit_hearth', name: 'Starlit Hearth (Mellow Lo-Fi Beats)' },
    { id: 'rainy_porch', name: 'Rainy Porch (Gentle Patter & Chords)' },
  ];

  // Chord frequencies (Hz) for authentic warm lo-fi jazz voicings
  private chordProgressions = [
    // Track 0: Cmaj9 -> Am9 -> Dm9 -> G13
    [
      [130.81, 164.81, 196.00, 246.94, 293.66], // Cmaj9
      [110.00, 146.83, 164.81, 196.00, 261.63], // Am9
      [146.83, 174.61, 220.00, 261.63, 329.63], // Dm9
      [98.00, 146.83, 164.81, 196.00, 246.94],  // G13
    ],
    // Track 1: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
    [
      [174.61, 220.00, 261.63, 329.63],         // Fmaj7
      [164.81, 196.00, 246.94, 293.66],         // Em7
      [146.83, 174.61, 220.00, 261.63],         // Dm7
      [130.81, 164.81, 196.00, 246.94],         // Cmaj7
    ],
    // Track 2: Abmaj7 -> Fm7 -> Bbm9 -> Eb7
    [
      [103.83, 155.56, 196.00, 233.08],         // Abmaj7
      [87.31, 130.81, 155.56, 207.65],          // Fm7
      [116.54, 155.56, 174.61, 207.65, 277.18], // Bbm9
      [155.56, 196.00, 233.08, 277.18],         // Eb7
    ],
    // Track 3: Dmaj9 -> Bm9 -> Em9 -> A7
    [
      [146.83, 185.00, 220.00, 277.18, 329.63], // Dmaj9
      [123.47, 146.83, 185.00, 220.00, 293.66], // Bm9
      [164.81, 196.00, 246.94, 293.66, 369.99], // Em9
      [110.00, 164.81, 185.00, 220.00, 277.18], // A7
    ]
  ];

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.vinylGain = this.ctx.createGain();
      this.vinylGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      this.vinylGain.connect(this.musicGain);

      this.startVinylNoise();
      this.startRainAmbience();
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  private ensureCtx() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMasterVolume(val: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.05);
    }
  }

  public setVinylVolume(val: number) {
    if (this.vinylGain && this.ctx) {
      this.vinylGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.05);
    }
  }

  public setRainVolume(val: number) {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public startMusic() {
    this.ensureCtx();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleNextBar();
  }

  public pauseMusic() {
    this.isPlaying = false;
    if (this.musicTimer) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public switchTrack(idx: number) {
    this.currentTrackIdx = idx % this.tracks.length;
  }

  public getCurrentTrackIndex(): number {
    return this.currentTrackIdx;
  }

  // Generative lo-fi chord & melody sequencer
  private chordStep: number = 0;
  private scheduleNextBar() {
    if (!this.isPlaying || !this.ctx || !this.musicGain) return;

    const chords = this.chordProgressions[this.currentTrackIdx] || this.chordProgressions[0];
    const currentChord = chords[this.chordStep % chords.length];
    this.chordStep++;

    const now = this.ctx.currentTime;
    const barDuration = 4.0; // 4 seconds per chord, very relaxing ~60 BPM

    // Play Warm Rhodes Lo-Fi Chord
    currentChord.forEach((freq, idx) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc2.type = 'sine';
      
      // Slight tape wow & flutter / micro detuning for vintage charm
      const detune = (Math.random() - 0.5) * 8;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);
      osc2.frequency.setValueAtTime(freq * 2, now);
      osc2.detune.setValueAtTime(-detune, now);

      // Warm low-pass filter characteristic of lofi hip-hop
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750 + Math.random() * 150, now);
      filter.Q.setValueAtTime(1.2, now);

      // Gentle mellow attack & long release
      const vel = 0.08 / (idx + 1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vel, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(vel * 0.4, now + barDuration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + barDuration);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + barDuration);
      osc2.stop(now + barDuration);
    });

    // Gentle kalimba / electric piano bell arpeggio notes during the bar
    const arpeggioNotes = [currentChord[0] * 2, currentChord[2] * 2, currentChord[1] * 2, currentChord[currentChord.length - 1] * 2];
    arpeggioNotes.forEach((f, nIdx) => {
      const delayTime = now + (nIdx * 0.9) + 0.2 + (Math.random() * 0.15);
      this.playKalimbaNote(f, delayTime);
    });

    // Soft lo-fi kick & brush snare on 1 and 3
    this.playSoftBeat(now);
    this.playSoftBeat(now + 2.0, true);

    this.musicTimer = window.setTimeout(() => {
      this.scheduleNextBar();
    }, barDuration * 980);
  }

  private playKalimbaNote(freq: number, time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.Q.setValueAtTime(3.0, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.035, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 1.25);
  }

  private playSoftBeat(time: number, isSnare: boolean = false) {
    if (!this.ctx || !this.musicGain) return;
    if (!isSnare) {
      // Soft sub kick
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(95, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.18);
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.22);
    } else {
      // Soft brushed tape snare / rimshot
      const node = this.ctx.createBufferSource();
      const buffer = this.createNoiseBuffer(0.12);
      node.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, time);
      filter.Q.setValueAtTime(1.8, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.03, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
      node.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      node.start(time);
    }
  }

  private createNoiseBuffer(durationSec: number): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const bufferSize = Math.floor(this.ctx.sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private startVinylNoise() {
    if (!this.ctx || !this.vinylGain) return;
    // Vinyl crackle loop
    const buffer = this.createNoiseBuffer(3.0);
    const data = buffer.getChannelData(0);
    // Add intermittent clicks
    for (let i = 0; i < data.length; i++) {
      if (Math.random() < 0.002) {
        data[i] = (Math.random() - 0.5) * 1.5;
      } else {
        data[i] *= 0.15;
      }
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.vinylGain);
    noise.start();
    this.vinylNode = noise;
  }

  private startRainAmbience() {
    if (!this.ctx || !this.ambientGain) return;
    const buffer = this.createNoiseBuffer(4.0);
    const rain = this.ctx.createBufferSource();
    rain.buffer = buffer;
    rain.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, this.ctx.currentTime);

    rain.connect(filter);
    filter.connect(this.ambientGain);
    rain.start();
    this.rainNode = rain;
  }

  // --- Sound Effects (SFX) ---

  public playTill() {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playWater() {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    [380, 520, 680].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, t + 0.08);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  public playPlant() {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playHarvest() {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playCast() {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playBiteAlert() {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174, now + 0.06);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playCatchSuccess() {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A C# E A fanfare
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playFootstep(isWood: boolean = false) {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isWood ? 'square' : 'triangle';
    const baseFreq = isWood ? 190 : 120;
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 20, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playEmote() {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 880, 1046.50]; // E A C
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playPlaceDecor() {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playDoor() {
    this.ensureCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}

export const lofiAudio = new LofiAudioEngine();
