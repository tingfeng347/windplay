const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const goldens=require('./fixtures/surface-pixels.json');
test('background procedural generation retains every original 1024px color, bump and roughness pixel',async()=>{
 const T=await import('three'),{surfacePixels,advanceSeed,generateSurfaces}=await import('../src/surface-pixels.js');let seed=519;
 for(const g of goldens){assert.equal(seed,g.seed);const rgb=new T.Color(g.color).convertLinearToSRGB(),job={kind:g.kind,values:[rgb.r*255,rgb.g*255,rgb.b*255],seed};
  const [pixels]=await generateSurfaces([job]);assert.deepEqual(pixels.map(p=>createHash('sha256').update(p).digest('hex')),g.hashes);seed=advanceSeed(seed,1024*1024*(g.kind==='linen'?1:2));
 }
});
