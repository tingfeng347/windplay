(function (global) {
  'use strict';
  const Core = global.WindGardenCore;
  class GardenAudio {
    constructor({ getGarden, onStep, onError, onInterrupted = () => {} }) {
      this.getGarden = getGarden; this.onStep = onStep; this.onError = onError; this.onInterrupted = onInterrupted;
      this.context = null; this.master = null; this.timer = null; this.running = false;
      this.step = 0; this.nextTime = 0; this.voices = new Set(); this.visualEvents = [];
      this.unavailable = false; this.generation = 0;
    }
    async enable() {
      if (this.unavailable) return false;
      try {
        if (!this.context) {
          const Audio = global.AudioContext || global.webkitAudioContext;
          if (!Audio) throw new Error('此浏览器没有 Web Audio。');
          this.context = new Audio();
          this.context.addEventListener('statechange', () => {
            if (this.running && this.context.state !== 'running') { this.stop(); this.onInterrupted(); }
          });
          this.master = this.context.createGain();
          this.master.gain.value = this.getGarden().volume * .52;
          const compressor = this.context.createDynamicsCompressor();
          compressor.threshold.value = -16; compressor.ratio.value = 4;
          this.master.connect(compressor); compressor.connect(this.context.destination);
        }
        if (this.context.state !== 'running') await this.context.resume();
        if (this.context.state !== 'running') throw new Error('浏览器未能启用声音。');
        return true;
      } catch (error) {
        this.unavailable = true; this.onError(error); return false;
      }
    }
    setVolume(value) {
      if (this.master) this.master.gain.setTargetAtTime(value * .52, this.context.currentTime, .025);
    }
    playNote(plant, when) {
      if (!this.context || this.context.state !== 'running') return;
      const ctx = this.context, base = Core.frequencyForRow(plant.row), timbre = plant.timbre;
      const envelope = ctx.createGain(), duration = timbre === 'bell' ? 1.55 : timbre === 'reed' ? .65 : .72;
      envelope.gain.setValueAtTime(0, when);
      const amplitude = timbre === 'bell' ? .22 : timbre === 'reed' ? .16 : .24;
      envelope.gain.linearRampToValueAtTime(amplitude, when + (timbre === 'reed' ? .065 : .009));
      envelope.gain.exponentialRampToValueAtTime(.0001, when + duration);
      envelope.connect(this.master);
      const voice = { envelope, oscillators: [] };
      const partials = timbre === 'bell' ? [[1, 1, 'sine'], [2.01, .23, 'sine'], [3.99, .07, 'sine']]
        : timbre === 'reed' ? [[1, .72, 'triangle'], [2, .13, 'sine']]
          : [[1, .83, 'triangle'], [2, .15, 'sine']];
      partials.forEach(([ratio, gain, type]) => {
        const osc = ctx.createOscillator(), level = ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(base * ratio, when); level.gain.value = gain;
        if (timbre === 'pluck') osc.frequency.exponentialRampToValueAtTime(base * ratio * .996, when + .16);
        osc.connect(level); level.connect(envelope); osc.start(when); osc.stop(when + duration + .04);
        voice.oscillators.push(osc);
        osc.onended = () => { osc.disconnect(); level.disconnect(); };
      });
      this.voices.add(voice);
      voice.oscillators[0].addEventListener('ended', () => { envelope.disconnect(); this.voices.delete(voice); });
    }
    async preview(plant) {
      const generation = this.generation;
      if (await this.enable() && generation === this.generation && !global.document?.hidden) this.playNote(plant, this.context.currentTime + .01);
    }
    async start() {
      if (this.running) return true;
      const generation = ++this.generation;
      const audible = await this.enable();
      if (generation !== this.generation) return false;
      this.running = true; this.step = 0; this.visualEvents.length = 0;
      this.nextTime = this.now() + .055;
      this.tick(); this.timer = global.setInterval(() => this.tick(), 25);
      return audible;
    }
    now() { return this.context && !this.unavailable ? this.context.currentTime : performance.now() / 1000; }
    tick() {
      if (!this.running) return;
      const now = this.now();
      if (this.nextTime < now - .15) {
        const duration = Core.stepDuration(this.getGarden().tempo), skipped = Math.ceil((now - this.nextTime) / duration);
        this.step = (this.step + skipped) % Core.STEPS; this.nextTime += skipped * duration; this.visualEvents.length = 0;
      }
      while (this.nextTime < now + .09) {
        const garden = this.getGarden(), step = this.step, plants = Core.eventsAtStep(garden, step);
        if (!this.unavailable) plants.forEach(plant => this.playNote(plant, this.nextTime));
        this.visualEvents.push({ time: this.nextTime, step, duration: Core.stepDuration(garden.tempo), ids: plants.map(p => p.id) });
        this.nextTime += Core.stepDuration(garden.tempo); this.step = (step + 1) % Core.STEPS;
      }
      while (this.visualEvents.length && this.visualEvents[0].time <= now) this.onStep(this.visualEvents.shift());
    }
    stop() {
      this.generation++; this.running = false; global.clearInterval(this.timer); this.timer = null; this.visualEvents.length = 0;
      if (!this.context) return;
      const now = this.context.currentTime;
      this.voices.forEach(voice => {
        try { voice.envelope.gain.cancelScheduledValues(now); voice.envelope.gain.setTargetAtTime(.0001, now, .012);
          voice.oscillators.forEach(osc => { try { osc.stop(now + .06); } catch {} }); } catch {}
      });
    }
  }
  global.WindGardenAudio = GardenAudio;
})(globalThis);
