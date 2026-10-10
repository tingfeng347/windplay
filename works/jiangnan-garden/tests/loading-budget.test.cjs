const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{gzipSync}=require('node:zlib');
test('the full-detail offline archive stays below 36 MiB compressed',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../demo/index.html'));
 assert.ok(gzipSync(html,{level:9}).length<36*1024*1024,'Do not reintroduce the 60 MiB embedded transfer');
});
test('online entry does not inline resources or require external CDNs',async()=>{
 const {compile}=await import('../scripts/build.mjs'),{html,assets,initialAssets}=await compile(true);
 assert.ok(Buffer.byteLength(html)<16*1024,'HTML can paint without waiting for model data');
 assert.doesNotMatch(html,/data:|https?:\/\//);
 const scripts=[...html.matchAll(/src="([^"]+\.js)"/g)];assert.equal(scripts.length,1);assert.ok(assets.has(scripts[0][1]));
 assert.ok([...initialAssets].every(name=>!name.includes('tree-detail')),'High detail is deferred until a close view');
 assert.ok([...initialAssets].reduce((sum,name)=>sum+assets.get(name).length,0)<12*1024*1024,'Initial resources stay under the first-entry budget');
});
