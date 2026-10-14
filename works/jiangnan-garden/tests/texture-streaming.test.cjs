const test=require('node:test'),assert=require('node:assert/strict');
test('detail images are deferred, model associations may be absent, and texture state is preserved',async()=>{
 const T=await import('three'),stream=await import('../src/texture-streaming.js'),preview=stream.textureURL('preview.webp','detail.webp'),texture=new T.Texture({width:512,height:512});
 texture.flipY=false;texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;texture.repeat.set(3,4);
 stream.watchModelTextures({parser:{associations:new Map([[new T.Texture(),undefined],[texture,{textures:0}]])}},{textures:[{source:0}],images:[{uri:preview}]});
 const original=T.ImageLoader.prototype.loadAsync,requests=[];T.ImageLoader.prototype.loadAsync=async url=>{requests.push(url);return {width:2048,height:2048};};
 try{assert.equal(requests.length,0,'Registration does not fetch high-resolution images');assert.equal(await stream.upgradeTextures(),true);assert.deepEqual(requests,['detail.webp']);assert.equal(texture.image.width,2048);assert.equal(texture.flipY,false);assert.equal(texture.colorSpace,T.SRGBColorSpace);assert.deepEqual(texture.repeat.toArray(),[3,4]);assert.equal(texture.wrapS,T.RepeatWrapping);}finally{T.ImageLoader.prototype.loadAsync=original;}
});
test('only selected images load; queued work follows the latest view and smooth quality wins over in-flight loads',async()=>{
 const T=await import('three'),stream=await import('../src/texture-streaming.js?selection'),requests=[],finish=[];
 const textures=Array.from({length:7},(_,i)=>{const t=new T.Texture({width:512,id:i});stream.watchTexture(t,stream.textureURL(`preview-${i}`,`detail-${i}`));return t;});
 const original=T.ImageLoader.prototype.loadAsync;T.ImageLoader.prototype.loadAsync=url=>{requests.push(url);return new Promise(resolve=>finish.push(()=>resolve({width:2048})));};
 try{
  const first=stream.upgradeTextures([textures[0]]);
  await new Promise(setImmediate);assert.deepEqual(requests,['detail-0']);
  const disabled=stream.upgradeTextures([],{enabled:false});finish.shift()();await Promise.all([first,disabled]);
  assert.equal(textures[0].image.width,512,'Late completion must not undo smooth quality');
  await stream.upgradeTextures([textures[0]]);assert.equal(textures[0].image.width,2048);assert.equal(requests.length,1,'Reuse decoded detail');
  const queued=stream.upgradeTextures(textures.slice(1));await new Promise(setImmediate);assert.equal(requests.length,5,'At most four image requests at once');
  const moved=stream.upgradeTextures([]);finish.splice(0).forEach(done=>done());await Promise.all([queued,moved]);
  assert.equal(requests.length,5,'Do not fetch queued resources from the old view');assert.ok(textures.slice(1).every(t=>t.image.width===512));
  await stream.upgradeTextures([],{enabled:false});assert.equal(textures[0].image.width,512);
 }finally{T.ImageLoader.prototype.loadAsync=original;}
});
test('shared image sources are fetched once, retain transforms, and failed detail can be retried',async(t)=>{
 t.mock.method(console,'warn',()=>{});
 const T=await import('three'),stream=await import('../src/texture-streaming.js?retry'),a=new T.Texture({width:512}),requests=[];
 stream.watchTexture(a,stream.textureURL('preview','detail'));const b=a.clone();b.repeat.set(4,5);stream.watchTexture(b);
 const original=T.ImageLoader.prototype.loadAsync;let fail=true;T.ImageLoader.prototype.loadAsync=async url=>{requests.push(url);if(fail)throw new Error('offline');return {width:2048};};
 try{
  assert.equal(await stream.upgradeTextures([a,b]),false);assert.equal(a.image.width,512);assert.equal(requests.length,1);
  assert.equal(await stream.upgradeTextures([a,b]),false);assert.equal(requests.length,1,'Do not retry a failing resource every frame');
  fail=false;await stream.upgradeTextures([]);assert.equal(await stream.upgradeTextures([a,b]),true);assert.equal(requests.length,2);assert.equal(b.image.width,2048);assert.deepEqual(b.repeat.toArray(),[4,5]);
 }finally{T.ImageLoader.prototype.loadAsync=original;}
});
