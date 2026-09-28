/**
 * 实时合成配乐 · 零依赖
 * 不加载任何音频文件：鼓、贝斯、垫层、琶音和转场音效全部用 Web Audio 振荡器与噪声合成。
 * 开启声音后画面改由音频时钟驱动，鼓点与转场保持采样级同步。
 */
(function (root) {
  'use strict';

  const { Score } = root;
  const LOOKAHEAD = 0.14;
  const mtof = note => 440 * Math.pow(2, (note - 69) / 12);

  class ReelAudio {
    constructor() {
      this.ctx = null;
      this.enabled = false;
      this.cursor = null;
      this.anchor = { ctx:0, abs:0 };
    }

    get supported() {
      return Boolean(root.AudioContext || root.webkitAudioContext);
    }

    /** 声音开启且音频线程在运行时，播放时钟以音频为准。 */
    get active() {
      return this.enabled && this.ctx !== null && this.ctx.state === 'running';
    }

    init() {
      if (this.ctx) return true;
      const Context = root.AudioContext || root.webkitAudioContext;
      if (!Context) return false;
      const ctx = new Context({ latencyHint:'interactive' });
      this.ctx = ctx;

      this.master = ctx.createGain();
      this.master.gain.value = 0;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.22;
      this.master.connect(compressor).connect(ctx.destination);

      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this.impulse(2.4);
      const reverbOut = ctx.createGain();
      reverbOut.gain.value = 0.36;
      this.reverb.connect(reverbOut).connect(this.master);

      this.echo = ctx.createDelay(1);
      this.echo.delayTime.value = 0.375;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.3;
      const echoOut = ctx.createGain();
      echoOut.gain.value = 0.26;
      this.echo.connect(feedback).connect(this.echo);
      this.echo.connect(echoOut).connect(this.master);

      this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

      this.newBus();
      return true;
    }

    impulse(seconds) {
      const { ctx } = this;
      const length = Math.floor(ctx.sampleRate * seconds);
      const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel += 1) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
      }
      return buffer;
    }

    /** 每次暂停或跳转都换一组总线，已经排进未来的音符随旧总线一起淡出。 */
    newBus() {
      const { ctx } = this;
      if (this.bus) {
        const old = this.bus;
        const now = ctx.currentTime;
        for (const node of Object.values(old)) node.gain.setTargetAtTime(0, now, 0.015);
        setTimeout(() => Object.values(old).forEach(node => node.disconnect()), 400);
      }
      const make = target => { const gain = ctx.createGain(); gain.connect(target); return gain; };
      this.bus = { dry:make(this.master), wet:make(this.reverb), echo:make(this.echo) };
    }

    async setEnabled(on, abs) {
      if (on && !this.init()) return false;
      this.enabled = on;
      if (!this.ctx) return on;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(on ? 0.6 : 0, now, 0.05);
      if (on) {
        if (this.ctx.state !== 'running') await this.ctx.resume();
        this.sync(abs);
      } else {
        this.cursor = null;
        this.newBus();
      }
      return on;
    }

    /** 以当前连续播放时间 abs 为锚点重新对齐音频时钟（播放、跳转后调用）。 */
    sync(abs) {
      if (!this.ctx) return;
      this.newBus();
      this.anchor = { ctx:this.ctx.currentTime + 0.03, abs };
      this.cursor = abs;
    }

    stop() {
      if (!this.ctx) return;
      this.cursor = null;
      this.newBus();
    }

    now() {
      return this.anchor.abs + (this.ctx.currentTime - this.anchor.ctx);
    }

    update(abs) {
      if (!this.active) return;
      if (this.cursor === null) this.sync(abs);
      const horizon = abs + LOOKAHEAD;
      if (horizon <= this.cursor) return;
      for (const { at, event } of Score.eventsInRange(this.cursor, horizon)) {
        const when = this.anchor.ctx + (at - this.anchor.abs);
        if (when >= this.ctx.currentTime - 0.01) this.play(event, Math.max(when, this.ctx.currentTime));
      }
      this.cursor = horizon;
    }

    play(event, when) {
      const voice = this[event.kind];
      if (voice) voice.call(this, event, when);
    }

    // ── 基础构件 ─────────────────────────────────────────────

    gain(value = 0) {
      const node = this.ctx.createGain();
      node.gain.value = value;
      return node;
    }

    envelope(param, when, peak, attack, decay, floor = 0.0001) {
      param.setValueAtTime(floor, when);
      param.linearRampToValueAtTime(peak, when + attack);
      param.exponentialRampToValueAtTime(floor, when + attack + decay);
    }

    osc(type, frequency, when, stop) {
      const node = this.ctx.createOscillator();
      node.type = type;
      node.frequency.setValueAtTime(frequency, when);
      node.start(when);
      node.stop(stop);
      return node;
    }

    noiseSource(when, dur) {
      const node = this.ctx.createBufferSource();
      node.buffer = this.noise;
      node.start(when, Math.random() * 1.2, dur + 0.05);
      return node;
    }

    filter(type, frequency, q = 0.7) {
      const node = this.ctx.createBiquadFilter();
      node.type = type;
      node.frequency.value = frequency;
      node.Q.value = q;
      return node;
    }

    send(node, { dry = 1, wet = 0, echo = 0 }) {
      for (const [bus, amount] of [[this.bus.dry, dry], [this.bus.wet, wet], [this.bus.echo, echo]]) {
        if (amount <= 0) continue;
        const tap = this.gain(amount);
        node.connect(tap).connect(bus);
      }
    }

    // ── 乐器 ────────────────────────────────────────────────

    kick({ gain = 1 }, when) {
      const osc = this.osc('sine', 150, when, when + 0.5);
      osc.frequency.exponentialRampToValueAtTime(44, when + 0.13);
      const amp = this.gain();
      this.envelope(amp.gain, when, gain * 0.95, 0.004, 0.42);
      osc.connect(amp);
      this.send(amp, { dry:1 });
      const click = this.noiseSource(when, 0.02);
      const hp = this.filter('highpass', 3200);
      const clickAmp = this.gain();
      this.envelope(clickAmp.gain, when, gain * 0.18, 0.001, 0.018);
      click.connect(hp).connect(clickAmp);
      this.send(clickAmp, { dry:1 });
    }

    clap({ gain = 0.6 }, when) {
      const src = this.noiseSource(when, 0.3);
      const bp = this.filter('bandpass', 1500, 0.9);
      const amp = this.gain();
      const p = amp.gain;
      p.setValueAtTime(0.0001, when);
      for (const offset of [0, 0.011, 0.022]) {
        p.linearRampToValueAtTime(gain, when + offset + 0.001);
        p.exponentialRampToValueAtTime(gain * 0.2, when + offset + 0.009);
      }
      p.exponentialRampToValueAtTime(0.0001, when + 0.22);
      src.connect(bp).connect(amp);
      this.send(amp, { dry:0.9, wet:0.5 });
    }

    hat({ gain = 0.2, open = false }, when) {
      const dur = open ? 0.22 : 0.045;
      const src = this.noiseSource(when, dur);
      const hp = this.filter('highpass', 7600);
      const amp = this.gain();
      this.envelope(amp.gain, when, gain * 0.5, 0.001, dur);
      src.connect(hp).connect(amp);
      this.send(amp, { dry:1, wet:0.1 });
    }

    bass({ note, dur = 0.2, gain = 0.5 }, when) {
      const saw = this.osc('sawtooth', mtof(note - 12), when, when + dur + 0.1);
      const sub = this.osc('sine', mtof(note - 24), when, when + dur + 0.1);
      const lp = this.filter('lowpass', 900, 3);
      lp.frequency.setValueAtTime(1100, when);
      lp.frequency.exponentialRampToValueAtTime(170, when + dur);
      const amp = this.gain();
      this.envelope(amp.gain, when, gain * 0.42, 0.006, dur);
      saw.connect(lp);
      sub.connect(amp);
      lp.connect(amp);
      this.send(amp, { dry:1 });
    }

    pad({ notes, dur = 2, gain = 0.4 }, when) {
      const amp = this.gain();
      const peak = gain * 0.075;
      amp.gain.setValueAtTime(0.0001, when);
      amp.gain.linearRampToValueAtTime(peak, when + Math.min(0.6, dur * 0.3));
      amp.gain.setValueAtTime(peak, when + dur * 0.75);
      amp.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.6);
      const lp = this.filter('lowpass', 1500, 0.5);
      for (const note of notes) {
        for (const detune of [-8, 7]) {
          const osc = this.osc('sawtooth', mtof(note), when, when + dur + 0.7);
          osc.detune.value = detune;
          osc.connect(lp);
        }
      }
      lp.connect(amp);
      this.send(amp, { dry:0.55, wet:0.9 });
    }

    arp({ note, gain = 0.15 }, when) {
      const tri = this.osc('triangle', mtof(note), when, when + 0.35);
      const sq = this.osc('square', mtof(note), when, when + 0.35);
      const sqAmp = this.gain(0.18);
      const lp = this.filter('lowpass', 3200);
      const amp = this.gain();
      this.envelope(amp.gain, when, gain * 0.5, 0.003, 0.24);
      tri.connect(lp);
      sq.connect(sqAmp).connect(lp);
      lp.connect(amp);
      this.send(amp, { dry:0.8, echo:0.7, wet:0.25 });
    }

    bell({ note, dur = 2, gain = 0.2 }, when) {
      for (const [ratio, level] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
        const osc = this.osc('sine', mtof(note) * ratio, when, when + dur);
        const amp = this.gain();
        this.envelope(amp.gain, when, gain * level * 0.6, 0.004, dur * (1.1 - ratio / 8));
        osc.connect(amp);
        this.send(amp, { dry:0.7, wet:0.8, echo:0.3 });
      }
    }

    type({ gain = 0.2, seed = 0 }, when) {
      const src = this.noiseSource(when, 0.03);
      const bp = this.filter('bandpass', 2400 + (seed * 997 % 2200), 2.2);
      const amp = this.gain();
      this.envelope(amp.gain, when, gain * 0.7, 0.001, 0.022);
      src.connect(bp).connect(amp);
      this.send(amp, { dry:1 });
    }

    whoosh({ dur = 0.4, gain = 0.3 }, when) {
      const src = this.noiseSource(when, dur + 0.1);
      const bp = this.filter('bandpass', 260, 1.3);
      bp.frequency.exponentialRampToValueAtTime(3200, when + dur);
      const amp = this.gain();
      amp.gain.setValueAtTime(0.0001, when);
      amp.gain.exponentialRampToValueAtTime(gain * 0.6, when + dur * 0.75);
      amp.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.06);
      src.connect(bp).connect(amp);
      this.send(amp, { dry:0.8, wet:0.6 });
    }

    riser({ dur = 2, gain = 0.3 }, when) {
      const src = this.noiseSource(when, dur);
      const bp = this.filter('bandpass', 400, 1.6);
      bp.frequency.exponentialRampToValueAtTime(6400, when + dur);
      const saw = this.osc('sawtooth', 110, when, when + dur);
      saw.frequency.exponentialRampToValueAtTime(880, when + dur);
      const sawAmp = this.gain(0.05);
      const amp = this.gain();
      amp.gain.setValueAtTime(0.0001, when);
      amp.gain.exponentialRampToValueAtTime(gain * 0.55, when + dur - 0.02);
      amp.gain.linearRampToValueAtTime(0.0001, when + dur);
      src.connect(bp).connect(amp);
      saw.connect(sawAmp).connect(amp);
      this.send(amp, { dry:0.8, wet:0.5 });
    }

    impact({ gain = 1 }, when) {
      const osc = this.osc('sine', 120, when, when + 1.6);
      osc.frequency.exponentialRampToValueAtTime(32, when + 0.9);
      const amp = this.gain();
      this.envelope(amp.gain, when, gain * 0.9, 0.003, 1.4);
      osc.connect(amp);
      this.send(amp, { dry:1, wet:0.35 });
      const src = this.noiseSource(when, 1.2);
      const lp = this.filter('lowpass', 1400);
      lp.frequency.exponentialRampToValueAtTime(160, when + 1);
      const noiseAmp = this.gain();
      this.envelope(noiseAmp.gain, when, gain * 0.5, 0.002, 1);
      src.connect(lp).connect(noiseAmp);
      this.send(noiseAmp, { dry:0.7, wet:0.9 });
    }

    glitch({ dur = 0.15, gain = 0.2 }, when) {
      const osc = this.osc('square', 400, when, when + dur);
      let seed = Math.floor(when * 1000);
      for (let t = 0; t < dur; t += 0.018) {
        seed = (seed * 16807) % 2147483647;
        osc.frequency.setValueAtTime(180 + (seed % 2400), when + t);
      }
      const amp = this.gain();
      amp.gain.setValueAtTime(gain * 0.22, when);
      amp.gain.setValueAtTime(0.0001, when + dur);
      const hp = this.filter('highpass', 300);
      osc.connect(hp).connect(amp);
      this.send(amp, { dry:1 });
    }
  }

  root.ReelAudio = ReelAudio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
