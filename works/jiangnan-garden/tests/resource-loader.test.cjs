const test=require('node:test'),assert=require('node:assert/strict'),{gzipSync}=require('node:zlib'),{createHash}=require('node:crypto');
test('a configured CDN changes resource metadata while keeping the script local',async()=>{
 const {compile}=await import('../scripts/build.mjs');
 const {html,assets}=await compile(true,{assetBase:'https://cdn.example.test/garden'});
 assert.match(html,/name="windplay-asset-base" content="https:\/\/cdn.example.test\/garden\/"/);
 const script=/src="([^"]+\.js)"/.exec(html)[1];assert.ok(assets.has(script));assert.match(script,/^assets\//);
});
test('packed initial assets retain all original bytes and need at most eight requests',async()=>{
 const {compile}=await import('../scripts/build.mjs'),{unpackResources,decompressResource}=await import('../src/resource-loader.js'),{createHash}=require('node:crypto');
 const {html,assets,initialAssets}=await compile(true);assert.ok(initialAssets.size<=8);const name=/name="windplay-asset-pack" content="([^"]+)"/.exec(html)[1],unpacked=unpackResources(await decompressResource(assets.get(name)));
 assert.equal(unpacked.size,53);for(const [name,bytes] of unpacked){assert.match(name,new RegExp(createHash('sha256').update(bytes).digest('hex').slice(0,16)));assert.equal(assets.has(name),false,'Do not duplicate packed bytes in the deployment');}
 assert.throws(()=>unpackResources(new Uint8Array([255,255,255,255])),/Invalid/);
 const sample=new Uint8Array([0,1,255,3]);assert.deepEqual(await decompressResource(gzipSync(sample)),sample);assert.strictEqual(await decompressResource(sample),sample);
});
test('CDN failure falls back, versioned cache is reused, and corrupt responses are not cached',async()=>{
 const good=new Uint8Array([7,8,9]),hash=createHash('sha256').update(good).digest('hex').slice(0,16),file=`assets/tree-${hash}.gz`;
 const original={document:global.document,fetch:global.fetch,caches:global.caches},data=new Map(),requests=[];
 global.document={baseURI:'https://example.test/works/garden/demo/index.html',querySelector(selector){if(selector.includes('windplay-asset-base'))return {content:'https://cdn.example.test/garden/'};return null;}};
 global.caches={open:async()=>({match:async key=>data.get(key)?.clone(),put:async(key,r)=>{data.set(key,r.clone());}})};
 global.fetch=async url=>{requests.push(url);return url.startsWith('https://cdn.')?new Response('',{status:503}):new Response(new Uint8Array([7,8,9]));};
 try{const loader=await import('../src/resource-loader.js?cache-test');assert.deepEqual(await loader.resourceBytes(file),new Uint8Array([7,8,9]));assert.equal(requests.length,2);assert.ok(requests[0].startsWith('https://cdn.example.test/garden/assets/'));
  const second=await import('../src/resource-loader.js?cache-test-second');assert.deepEqual(await second.resourceBytes(file),new Uint8Array([7,8,9]));assert.equal(requests.length,2);
  global.fetch=async url=>url.startsWith('https://cdn.')?new Response(new Uint8Array([0])):new Response(good);
  const third=await import('../src/resource-loader.js?cache-test-corrupt');data.clear();assert.deepEqual(await third.resourceBytes(file),good,'A stale or corrupt CDN body also falls back');
  global.caches={open:async()=>({match:async()=>{throw new Error('Cache unavailable');},put:async()=>{throw new Error('Quota');}})};
  const uncached=await import('../src/resource-loader.js?cache-test-unavailable');assert.deepEqual(await uncached.resourceBytes(file),good,'Restricted cache access still allows a network load');
  global.fetch=async()=>new Response('',{status:500});await assert.rejects(second.resourceBytes('assets/missing-0123456789abcdef.gz'));assert.equal(data.has('https://example.test/works/garden/demo/assets/missing-0123456789abcdef.gz'),false);
 }finally{Object.assign(global,original);}
});
