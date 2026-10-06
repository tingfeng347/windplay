(function (global) {
  'use strict';
  const Core = global.WindGardenCore;
  const COLORS = { bell: '#F2CE71', reed: '#D97A70', pluck: '#719FC2' };
  class GardenRenderer {
    constructor(canvas, getState) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.getState = getState;
      this.width = 0; this.height = 0; this.flashes = new Map(); this.lastPaint = 0;
      this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
      this.resize(); this.frame = this.frame.bind(this); this.frameId = requestAnimationFrame(this.frame);
    }
    resize() {
      const bounds = this.canvas.getBoundingClientRect(), ratio = Math.min(global.devicePixelRatio || 1, 2);
      this.width = bounds.width; this.height = bounds.height;
      this.canvas.width = Math.round(this.width * ratio); this.canvas.height = Math.round(this.height * ratio);
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0); this.paint(performance.now() / 1000);
    }
    layout() {
      const mobile = this.width < 600;
      return { x: mobile ? 34 : 64, y: mobile ? 57 : 66,
        width: this.width - (mobile ? 54 : 97), height: this.height - (mobile ? 141 : 154), ground: this.height - 58 };
    }
    pointFor(plant, time, swaying = true) {
      const grid = this.layout(), cw = grid.width / Core.STEPS, ch = grid.height / Core.ROWS;
      const shift = plant.timbre === 'bell' ? -Math.min(3, cw * .12) : plant.timbre === 'reed' ? Math.min(4, cw * .15) : 0;
      const phase = plant.id * 1.713, state = this.getState();
      const sway = state.reducedMotion || !swaying ? 0 : Math.sin(time * 1.3 + phase) * (state.playing ? 3.6 : 1.3);
      return { x: grid.x + (plant.step + .5) * cw + shift + sway, y: grid.y + (plant.row + .5) * ch,
        baseX: grid.x + (plant.step + .5) * cw + shift, radius: Math.min(13.8, Math.max(7.8, cw * .25)) };
    }
    cellAt(x, y) {
      const grid = this.layout();
      if (x < grid.x || x > grid.x + grid.width || y < grid.y || y > grid.y + grid.height) return null;
      return Core.coordinateToCell({ x: x - grid.x, y: y - grid.y, width: grid.width, height: grid.height });
    }
    hitAt(x, y) {
      let best = null, distance = Infinity;
      const time = performance.now() / 1000;
      for (const plant of this.getState().garden.plants) {
        const point = this.pointFor(plant, time), d = Math.hypot(point.x - x, point.y - y);
        if (d < Math.max(18, point.radius + 7) && d < distance) { best = plant; distance = d; }
      }
      return best;
    }
    trigger(ids) { const time = performance.now() / 1000; ids.forEach(id => this.flashes.set(id, time)); }
    frame(timestamp) {
      if (timestamp - this.lastPaint >= 1000 / 30) { this.lastPaint = timestamp; this.paint(timestamp / 1000); }
      this.frameId = requestAnimationFrame(this.frame);
    }
    leaf(x, y, angle, size, color) {
      const ctx = this.ctx; ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(size * .1, -size * .7, size, -size * .5, size, 0);
      ctx.bezierCurveTo(size * .4, size * .24, size * .12, size * .18, 0, 0); ctx.fill(); ctx.restore();
    }
    flower(plant, point, pulse, selected, time) {
      const ctx = this.ctx, r = point.radius, grid = this.layout();
      const x = point.x, y = point.y, baseY = grid.ground + Math.sin(plant.id * 2.4) * 6;
      const stemColor = plant.timbre === 'reed' ? '#5D8170' : '#497F60';
      ctx.strokeStyle = stemColor; ctx.lineWidth = this.width < 600 ? 1.3 : 1.8;
      ctx.beginPath(); ctx.moveTo(point.baseX, baseY); ctx.bezierCurveTo(point.baseX - 10, baseY - (baseY - y) * .4, x + 12, y + 35, x, y); ctx.stroke();
      const length = baseY - y;
      this.leaf(point.baseX - 1, y + length * .58, -.56, r * 1.7, '#598E6D');
      this.leaf(point.baseX + 1, y + length * .75, Math.PI + .55, r * 1.45, '#6D9A72');
      if (plant.timbre === 'reed') this.leaf(point.baseX, y + length * .36, -.73, r * 1.85, '#739B75');
      if (pulse > 0 && !this.getState().reducedMotion) {
        ctx.strokeStyle = COLORS[plant.timbre]; ctx.globalAlpha = pulse * .45; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, r + (1 - pulse) * 22, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.getState().reducedMotion ? 0 : Math.sin(time * 1.3 + plant.id) * .09);
      const scale = 1 + pulse * .13; ctx.scale(scale, scale);
      ctx.fillStyle = COLORS[plant.timbre];
      if (plant.timbre === 'bell') {
        for (let petal = 0; petal < 5; petal++) {
          ctx.save(); ctx.rotate(petal * Math.PI * 2 / 5 - Math.PI / 2);
          ctx.beginPath(); ctx.ellipse(r * .49, 0, r * .62, r * .38, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        ctx.fillStyle = '#A87638'; ctx.beginPath(); ctx.arc(0, 0, r * .28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF0B8'; ctx.beginPath(); ctx.arc(-r * .09, -r * .12, r * .11, 0, Math.PI * 2); ctx.fill();
      } else if (plant.timbre === 'reed') {
        ctx.strokeStyle = '#7B7762'; ctx.lineWidth = 1.1;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(0, r * .55); ctx.quadraticCurveTo(i * r * .7, 0, i * r * .57, -r * .92); ctx.stroke();
          for (let seed = 0; seed < 3; seed++) {
            ctx.save(); ctx.translate(i * r * .45, -r * .28 - seed * r * .27); ctx.rotate(i * .32);
            ctx.fillStyle = seed % 2 ? '#E69A85' : COLORS.reed;
            ctx.beginPath(); ctx.ellipse(0, 0, r * .26, r * .37, -.22, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        }
      } else {
        for (let petal = 0; petal < 7; petal++) {
          const a = petal * Math.PI * 2 / 7;
          ctx.beginPath(); ctx.arc(Math.cos(a) * r * .49, Math.sin(a) * r * .49, r * .48, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#CAE1E9'; ctx.beginPath(); ctx.arc(0, 0, r * .39, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4B809D'; ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * .15, -r * .22); ctx.lineTo(i * r * .15, r * .22); ctx.stroke(); }
      }
      ctx.restore();
      if (selected) {
        ctx.strokeStyle = '#194C45'; ctx.lineWidth = 1.8; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    paint(time) {
      const ctx = this.ctx, w = this.width, h = this.height;
      if (!w || !h || !ctx) return;
      const state = this.getState(), grid = this.layout();
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#DDECE8'); sky.addColorStop(.65, '#EDF4DF'); sky.addColorStop(1, '#BDCEA0');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      const sunlight = ctx.createRadialGradient(w * .78, h * .2, 4, w * .78, h * .2, w * .33);
      sunlight.addColorStop(0, 'rgba(255,245,198,.65)'); sunlight.addColorStop(1, 'rgba(255,245,198,0)');
      ctx.fillStyle = sunlight; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#C3D3B8'; ctx.beginPath(); ctx.moveTo(0, h - 102);
      ctx.bezierCurveTo(w * .2, h - 141, w * .32, h - 74, w * .52, h - 112);
      ctx.bezierCurveTo(w * .76, h - 148, w * .91, h - 91, w, h - 117); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      ctx.fillStyle = '#AAC09A'; ctx.beginPath(); ctx.moveTo(0, h - 84);
      ctx.bezierCurveTo(w * .25, h - 102, w * .55, h - 76, w * .72, h - 95);
      ctx.quadraticCurveTo(w * .91, h - 113, w, h - 74); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      ctx.strokeStyle = 'rgba(64,104,78,.12)'; ctx.lineWidth = 1;
      for (let row = 0; row < Core.ROWS; row++) {
        const y = grid.y + (row + .5) * grid.height / Core.ROWS;
        ctx.beginPath(); ctx.moveTo(grid.x, y); ctx.lineTo(grid.x + grid.width, y); ctx.stroke();
        ctx.fillStyle = '#426354'; ctx.font = `${w < 600 ? 10 : 12}px "PingFang SC", sans-serif`; ctx.textAlign = 'right';
        ctx.fillText(Core.PITCHES[row].label, grid.x - 13, y + 4);
      }
      for (let step = 0; step < Core.STEPS; step++) {
        const x = grid.x + (step + .5) * grid.width / Core.STEPS;
        ctx.strokeStyle = step % 4 === 0 ? 'rgba(64,104,78,.14)' : 'rgba(64,104,78,.055)';
        ctx.beginPath(); ctx.moveTo(x, grid.y - 12); ctx.lineTo(x, h - 51); ctx.stroke();
      }
      let head = -1;
      if (state.playing && state.playhead) {
        const progress = state.reducedMotion ? .5 : Core.clamp((time - state.playhead.startedAt) / state.playhead.duration, 0, 1);
        head = state.playhead.step + progress;
        const x = grid.x + head / Core.STEPS * grid.width;
        const wind = ctx.createLinearGradient(x - 35, 0, x + 16, 0);
        wind.addColorStop(0, 'rgba(255,255,238,0)'); wind.addColorStop(.72, 'rgba(255,255,238,.58)'); wind.addColorStop(1, 'rgba(255,255,238,0)');
        ctx.fillStyle = wind; ctx.fillRect(x - 35, grid.y - 25, 51, grid.ground - grid.y + 28);
        ctx.strokeStyle = 'rgba(255,255,250,.82)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, grid.y - 16); ctx.bezierCurveTo(x - 11, h * .38, x + 8, h * .7, x, grid.ground); ctx.stroke();
      }
      if (state.cursor && !state.selectedId) {
        const x = grid.x + (state.cursor.step + .5) * grid.width / Core.STEPS, y = grid.y + (state.cursor.row + .5) * grid.height / Core.ROWS;
        ctx.strokeStyle = '#467D6C'; ctx.lineWidth = 1.3; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(x, y, w < 600 ? 10 : 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(70,125,108,.4)'; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
      }
      const plants = [...state.garden.plants].sort((a, b) => a.row - b.row || a.id - b.id);
      plants.forEach(plant => {
        const flash = this.flashes.get(plant.id), elapsed = flash === undefined ? 99 : time - flash;
        const pulse = Core.clamp(1 - elapsed / .65, 0, 1);
        if (elapsed > 1) this.flashes.delete(plant.id);
        this.flower(plant, this.pointFor(plant, time), pulse, state.selectedId === plant.id, time);
      });
      // Deterministic low meadow blades give the flowers a shared ground.
      for (let i = 0; i < Math.ceil(w / 9); i++) {
        const x = i * 9 + Math.sin(i * 9.2) * 3, y = h - 51 + Math.sin(i * 2.31) * 8;
        const bend = state.reducedMotion ? 2 : Math.sin(time * 1.3 + i * .61) * 2 + 2;
        ctx.strokeStyle = i % 3 ? '#88A676' : '#709465'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.quadraticCurveTo(x + bend, y - 2, x + bend + 3, y - 11 - (i % 4) * 3); ctx.stroke();
      }
      const ground = ctx.createLinearGradient(0, h - 54, 0, h);
      ground.addColorStop(0, 'rgba(177,199,145,0)'); ground.addColorStop(.65, '#C8D6AE'); ground.addColorStop(1, '#CFDCB9');
      ctx.fillStyle = ground; ctx.fillRect(0, h - 54, w, 54);
      ctx.textAlign = 'center'; ctx.font = `${w < 600 ? 9 : 11}px "PingFang SC", sans-serif`;
      for (let step = 0; step < Core.STEPS; step++) {
        const x = grid.x + (step + .5) * grid.width / Core.STEPS, active = head >= step && head < step + 1;
        if (active) { ctx.fillStyle = '#194C45'; ctx.beginPath(); ctx.arc(x, h - 28, w < 600 ? 8 : 11, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = active ? '#F8FCED' : step % 4 === 0 ? '#365D48' : '#667E59'; ctx.fillText(String(step + 1), x, h - 24.5);
      }
      ctx.textAlign = 'left'; ctx.fillStyle = '#44675A'; ctx.font = `${12}px "PingFang SC", sans-serif`;
      ctx.fillText(state.playing ? '风正在经过' : state.garden.plants.length ? '花园等风来' : '点一下空地，种下第一个音', grid.x, 30);
      ctx.textAlign = 'right'; ctx.fillText('越高，音越高', w - (w < 600 ? 20 : 32), 30);
    }
  }
  global.WindGardenRenderer = GardenRenderer;
})(globalThis);
