const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const H = require('../src/halftone.js');
const P = require('../src/point-cloud.js');

function stripes() {
  const pixels = new Uint8ClampedArray(96 * 32 * 4);
  for (let y=0;y<32;y++) for (let x=0;x<96;x++) {
    const i=(y*96+x)*4; pixels[i+Math.floor(x/32)]=255; pixels[i+3]=255;
  }
  return H.fromPixels(pixels,96,32,{width:96,spacing:8,autoLevels:false,threshold:0,edgeFade:0});
}

test('RGB 采样保留红、绿、蓝，SVG 逐点填色且默认交互', () => {
  const model=stripes(), colors=['#ff0000','#00ff00','#0000ff'];
  assert.equal(model.dots.length,48);
  assert.deepEqual(new Set(model.dots.map(p=>p.color)),new Set(colors));
  const svg=H.toSVG(model);
  for (const color of colors) assert(svg.includes(`fill="${color}"`));
  assert(svg.includes('data-halftone-interactive="true"'));
  const mono={...model,config:{...model.config,sourceColors:false,foreground:'#123456'}};
  assert(P.prepare(mono).points.every(p=>p[4]==='#123456'));
});

test('透明像素不污染平均色，半透明颜色按 alpha 加权', () => {
  const pixels=new Uint8ClampedArray(64*64*4);
  for (let i=0;i<64*64;i++) pixels.set(i%2?[0,0,255,0]:[255,0,0,255],i*4);
  const cfg={width:64,spacing:8,autoLevels:false,threshold:0,edgeFade:0};
  assert(H.fromPixels(pixels,64,64,cfg).dots.every(p=>p.color==='#ff0000'));
  for (let i=1;i<64*64;i+=2) pixels[i*4+3]=128;
  assert(H.fromPixels(pixels,64,64,cfg).dots.every(p=>p.color==='#aa0055'));
});

test('三维排序携带颜色，平面模式和旧模型兼容', () => {
  const model=stripes(), scene=P.prepare(model);
  const points=P.project(scene,{yaw:1.2,pitch:.7,zoom:1},{width:800,height:300});
  assert(points.every(p=>p.color===model.dots[p.index].color));
  assert(points.every((p,i,a)=>!i||p.z>=a[i-1].z));
  assert(P.prepare(model,{threeD:false}).points.every(p=>p[2]===0));
  const legacy={...model,dots:model.dots.map(({color,...dot})=>dot)};
  assert(P.prepare(legacy).points.every(p=>p[4]===model.config.foreground));
});

test('独立 HTML 无外框，保留键盘入口，成品脚本可独立解析', () => {
  const html=P.toHTML(stripes());
  assert(!/<(?:input|button|aside|header|footer|img)\b/.test(html));
  assert(!/data:image|<script\s+src=/.test(html));
  assert(html.includes('tabindex="0"'));
  assert(html.includes('canvas:focus,canvas:focus-visible{border:0;outline:none;box-shadow:none}'));
  assert(!/outline:\s*\d+px|border:\s*\d+px/.test(html));
  for (const [name,count] of [['index.html',3],['test-point-cloud.html',1]]) {
    const text=fs.readFileSync(path.resolve(__dirname,'../dist',name),'utf8');
    const scripts=[...text.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length,count);
    scripts.forEach(m=>new vm.Script(m[1]));
    assert(!/__[A-Z_]+__/.test(text));
  }
});
