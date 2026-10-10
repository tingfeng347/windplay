const test=require('node:test'),assert=require('node:assert/strict');
test('detail images are deferred, model associations may be absent, and texture state is preserved',async()=>{
 const T=await import('three'),stream=await import('../src/texture-streaming.js'),preview=stream.textureURL('preview.webp','detail.webp'),texture=new T.Texture({width:512,height:512});
 texture.flipY=false;texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;texture.repeat.set(3,4);
 stream.watchModelTextures({parser:{associations:new Map([[new T.Texture(),undefined],[texture,{textures:0}]])}},{textures:[{source:0}],images:[{uri:preview}]});
 const original=T.ImageLoader.prototype.loadAsync,requests=[];T.ImageLoader.prototype.loadAsync=async url=>{requests.push(url);return {width:2048,height:2048};};
 try{assert.equal(requests.length,0,'Registration does not fetch high-resolution images');assert.equal(await stream.upgradeTextures(),true);assert.deepEqual(requests,['detail.webp']);assert.equal(texture.image.width,2048);assert.equal(texture.flipY,false);assert.equal(texture.colorSpace,T.SRGBColorSpace);assert.deepEqual(texture.repeat.toArray(),[3,4]);assert.equal(texture.wrapS,T.RepeatWrapping);}finally{T.ImageLoader.prototype.loadAsync=original;}
});
