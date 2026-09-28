/**
 * 配乐总谱 · 零依赖
 * 把 120 BPM 的 A 小调循环、鼓组和转场音效展开成按时间排序的事件表。
 * 事件只描述“何时、什么声音”，由浏览器端 audio.js 合成；Node.js 中可直接测试。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./timeline.js'));
  else root.Score = factory(root.Timeline);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Timeline) {
  'use strict';

  const { BEAT, BAR, SCENES, DURATION, TYPING } = Timeline;
  const STEP = BEAT / 4;

  // Am → F → C → G，和弦用三音近距离排列，避免长音垫层互相打架。
  const PROGRESSION = Object.freeze([
    Object.freeze({ root:45, chord:Object.freeze([57, 60, 64]) }),
    Object.freeze({ root:41, chord:Object.freeze([57, 60, 65]) }),
    Object.freeze({ root:48, chord:Object.freeze([55, 60, 64]) }),
    Object.freeze({ root:43, chord:Object.freeze([55, 59, 62]) })
  ]);
  const ARP = [0, 1, 2, 3, 2, 1, 3, 4];
  const BASS = [0, 0, 12, 0, 0, 12, 0, 7];

  /** 每小节所在段落：intro 只有垫层，build 进鼓，drop 全编制，outro 收尾。 */
  function section(bar) {
    if (bar < 2) return 'intro';
    if (bar < 4) return 'build';
    if (bar < 12) return 'drop';
    return 'outro';
  }

  function build() {
    const events = [];
    const add = (time, kind, props = {}) => events.push(Object.freeze({ time:Math.round(time * 1e6) / 1e6, kind, ...props }));
    const bars = Math.round(DURATION / BAR);

    for (let bar = 0; bar < bars; bar += 1) {
      const t0 = bar * BAR;
      const part = section(bar);
      const { root, chord } = PROGRESSION[bar % PROGRESSION.length];
      const tones = [...chord, chord[0] + 12, chord[1] + 12].map(n => n + 12);

      if (part === 'outro') {
        if (bar === 12) add(t0, 'pad', { notes:PROGRESSION[0].chord, dur:BAR * 2, gain:0.5 });
      } else {
        add(t0, 'pad', { notes:chord, dur:BAR, gain:part === 'drop' ? 0.34 : 0.5 });
      }

      for (let step = 0; step < 16; step += 1) {
        const t = t0 + step * STEP;
        const beat = step % 4 === 0;
        if (part === 'intro' && bar === 1 && step % 2 === 0) add(t, 'arp', { note:tones[ARP[step % 8]], gain:0.16 });
        if (part === 'build') {
          if (step % 8 === 0) add(t, 'kick', { gain:0.7 });
          if (step % 2 === 0) add(t, 'hat', { gain:step % 4 === 2 ? 0.26 : 0.14 });
          if (step % 2 === 0) add(t, 'arp', { note:tones[ARP[step % 8]], gain:0.18 });
          if (bar === 3 && step % 2 === 0) add(t, 'bass', { note:root + BASS[(step / 2) % 8], dur:STEP * 1.6, gain:0.45 });
        }
        if (part === 'drop') {
          if (beat) add(t, 'kick', { gain:1 });
          if (step === 4 || step === 12) add(t, 'clap', { gain:0.62 });
          if (step % 4 === 2) add(t, 'hat', { gain:0.34, open:step === 14 });
          else if (!beat) add(t, 'hat', { gain:0.1 });
          add(t, 'arp', { note:tones[ARP[step % 8]] + (bar % 2 && step > 11 ? 12 : 0), gain:0.15 });
          if (step % 2 === 0) add(t, 'bass', { note:root + BASS[(step / 2) % 8], dur:STEP * 1.6, gain:0.55 });
        }
        if (part === 'outro' && bar === 12 && step % 2 === 0) {
          add(t, 'arp', { note:PROGRESSION[0].chord[ARP[step % 8] % 3] + 24, gain:0.16 * (1 - step / 20) });
        }
      }
    }

    add(26, 'bell', { note:81, dur:2, gain:0.22 });
    add(26, 'pad', { notes:[57, 64, 69], dur:1.8, gain:0.3 });

    // 转场：每个场景切入前一点点起风声；大标题落点用冲击音。
    for (const scene of SCENES.slice(1)) add(scene.start - 0.22, 'whoosh', { dur:0.42, gain:0.34 });
    add(6, 'riser', { dur:2, gain:0.32 });
    add(22.5, 'riser', { dur:1.5, gain:0.22 });
    for (const time of [8, 24]) add(time, 'impact', { gain:1 });
    add(16, 'impact', { gain:0.55 });
    for (const [time, dur] of [[11.78, 0.2], [16, 0.16], [17.82, 0.16], [21.84, 0.14], [2.78, 0.1]]) add(time, 'glitch', { dur, gain:0.2 });

    // 打字声：固定间隔并带轻微摆动，听起来像真人敲键盘。
    for (const [start, end] of Object.values(TYPING)) {
      for (let t = start, i = 0; t < end; i += 1, t = start + i * 0.052 + (i % 3 === 1 ? 0.012 : 0)) add(t, 'type', { gain:0.22, seed:i });
    }

    return Object.freeze(events.filter(e => e.time >= 0 && e.time < DURATION).sort((a, b) => a.time - b.time || a.kind.localeCompare(b.kind)));
  }

  const EVENTS = build();

  function lowerBound(time) {
    let low = 0;
    let high = EVENTS.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (EVENTS[mid].time < time) low = mid + 1;
      else high = mid;
    }
    return low;
  }

  /** 单个循环内 [from, to) 的事件。 */
  function eventsBetween(from, to) {
    return EVENTS.slice(lowerBound(from), lowerBound(to));
  }

  /**
   * 连续播放时钟上 [from, to) 的事件；跨过循环终点时自动展开到下一轮。
   * 返回 { at, event }，at 为连续时钟时间。
   */
  function eventsInRange(from, to) {
    const result = [];
    if (!(to > from)) return result;
    for (let loop = Math.floor(from / DURATION); loop * DURATION < to; loop += 1) {
      const offset = loop * DURATION;
      for (const event of eventsBetween(Math.max(0, from - offset), Math.min(DURATION, to - offset))) {
        result.push({ at:offset + event.time, event });
      }
    }
    return result;
  }

  return Object.freeze({ STEP, PROGRESSION, EVENTS, section, eventsBetween, eventsInRange });
});
