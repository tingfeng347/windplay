/**
 * 三维模型与投影 · 零依赖
 * 同一套点在 persp=0 时是正视平面图，persp=1 时带透视和纵深，用来实现 2D ⇄ 3D 平滑切换。
 * 浏览器用 window.Models；Node.js 用 require('./models.js')。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Models = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * 先绕 Y 轴（yaw）再绕 X 轴（pitch）旋转，然后投影到屏幕。
   * camera: { yaw, pitch, dist, persp, cx, cy, scale }；返回 { x, y, s, z }，s 为该点的缩放系数。
   */
  function project(point, camera) {
    const { yaw = 0, pitch = 0, dist = 3.2, persp = 1, cx = 0, cy = 0, scale = 1 } = camera;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosX = Math.cos(pitch), sinX = Math.sin(pitch);
    const x1 = point.x * cosY + point.z * sinY;
    const z1 = -point.x * sinY + point.z * cosY;
    const y2 = point.y * cosX - z1 * sinX;
    const z2 = point.y * sinX + z1 * cosX;
    const s = 1 + (dist / Math.max(0.2, dist + z2) - 1) * persp;
    return { x:cx + x1 * s * scale, y:cy + y2 * s * scale, s, z:z2 };
  }

  /**
   * 从灰度蒙版生成带厚度的点云：越靠近笔画中心越厚，前后两层让旋转时有体积感。
   * mask: 长度 width*height 的 0..255 数组；返回归一化到 [-1, 1] 的点。
   */
  function glyphCloud(mask, width, height, { step = 4, radius = 5, depth = 0.34, threshold = 96 } = {}) {
    const inside = new Float32Array(width * height);
    for (let i = 0; i < inside.length; i += 1) inside[i] = mask[i] >= threshold ? 1 : 0;
    const blurred = boxBlur(inside, width, height, radius);
    const half = Math.max(width, height) / 2;
    const points = [];
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = y * width + x;
        if (!inside[index]) continue;
        const v = blurred[index];
        const base = { x:(x - width / 2) / half, y:(y - height / 2) / half, v };
        points.push({ ...base, z:-v * depth, layer:0 });
        if (v > 0.45) points.push({ ...base, z:v * depth, layer:1 });
      }
    }
    return points;
  }

  function boxBlur(source, width, height, radius) {
    const pass = (input, horizontal) => {
      const output = new Float32Array(input.length);
      const span = radius * 2 + 1;
      for (let a = 0; a < (horizontal ? height : width); a += 1) {
        let sum = 0;
        const at = b => horizontal ? input[a * width + b] : input[b * width + a];
        const limit = horizontal ? width : height;
        for (let b = -radius; b <= radius; b += 1) sum += b >= 0 && b < limit ? at(b) : 0;
        for (let b = 0; b < limit; b += 1) {
          output[horizontal ? a * width + b : b * width + a] = sum / span;
          const leave = b - radius, enter = b + radius + 1;
          if (leave >= 0) sum -= at(leave);
          if (enter < limit) sum += at(enter);
        }
      }
      return output;
    };
    return pass(pass(source, true), false);
  }

  /** 均匀分布在球面上的点（斐波那契螺旋），用于检索向量空间。 */
  function sphere(count, radius = 1) {
    const golden = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length:count }, (_, i) => {
      const y = 1 - (i / Math.max(1, count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      return { x:Math.cos(theta) * r * radius, y:y * radius, z:Math.sin(theta) * r * radius };
    });
  }

  /** 圆环轨道：a2a 子 agent 在 XZ 平面绕主 agent 运行。 */
  function orbit(angle, radius = 1, lift = 0) {
    return { x:Math.cos(angle) * radius, y:lift, z:Math.sin(angle) * radius };
  }

  // WindAgent 编排图：plan-and-execute 加审阅回环。
  const AGENT_GRAPH = Object.freeze({
    nodes: Object.freeze([
      Object.freeze({ id:'input',      label:'INPUT',      x:-1.25, y: 0.05, z: 0.00 }),
      Object.freeze({ id:'planner',    label:'PLANNER',    x:-0.62, y:-0.38, z: 0.35 }),
      Object.freeze({ id:'researcher', label:'RESEARCHER', x: 0.02, y: 0.12, z:-0.42 }),
      Object.freeze({ id:'mcp',        label:'MCP TOOLS',  x: 0.12, y:-0.62, z: 0.55 }),
      Object.freeze({ id:'writer',     label:'WRITER',     x: 0.64, y: 0.36, z: 0.22 }),
      Object.freeze({ id:'reviewer',   label:'REVIEWER',   x: 1.18, y:-0.18, z:-0.25 })
    ]),
    edges: Object.freeze([
      Object.freeze(['input', 'planner']),
      Object.freeze(['planner', 'researcher']),
      Object.freeze(['researcher', 'mcp']),
      Object.freeze(['researcher', 'writer']),
      Object.freeze(['writer', 'reviewer']),
      Object.freeze(['reviewer', 'planner'])
    ])
  });

  return Object.freeze({ project, glyphCloud, boxBlur, sphere, orbit, AGENT_GRAPH });
});
