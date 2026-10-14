const test=require('node:test'),assert=require('node:assert/strict');
test('resource progress counts initial bytes once across CDN races, retries and cached completion',async()=>{
 const {resourceProgress}=await import('../src/loading-progress.js'),progress=resourceProgress({'assets/initial.pack.gz':100,'assets/tree.bin.gz':300});
 progress.update({url:'https://site.test/garden/assets/initial.pack.gz',loaded:40});
 progress.update({url:'https://cdn.test/assets/initial.pack.gz',loaded:20});
 assert.equal(progress.snapshot().loaded,40);
 progress.update({url:'assets/initial.pack.gz',loaded:100,complete:true});
 progress.update({url:'assets/tree.bin.gz',loaded:300,complete:true});
 progress.update({url:'assets/tree-detail.bin.gz',loaded:10000,complete:true});
 assert.deepEqual(progress.snapshot(),{loaded:400,total:400,complete:2,count:2});
 progress.update({url:'assets/tree.bin.gz',loaded:20});assert.equal(progress.snapshot().loaded,400);
 assert.deepEqual(resourceProgress().snapshot(),{loaded:0,total:0,complete:0,count:0});
});
test('streamed bytes report real intermediate progress and errors never report completion',async()=>{
 const {onResourceProgress,readResourceResponse}=await import('../src/resource-loader.js'),events=[],stop=onResourceProgress(event=>events.push(event));
 try{
  let part=0;const response=new Response(new ReadableStream({pull(controller){if(part++===0)controller.enqueue(new Uint8Array([1,2]));else{controller.enqueue(new Uint8Array([3,4,5]));controller.close();}}}));
  assert.deepEqual(await readResourceResponse(response,'assets/example'),new Uint8Array([1,2,3,4,5]));
  assert.deepEqual(events.map(e=>e.loaded),[2,5]);assert.ok(events.every(e=>!e.complete),'Verification, not transfer, marks completion');
  part=0;const failed=new Response(new ReadableStream({pull(controller){if(part++===0)controller.enqueue(new Uint8Array([1]));else controller.error(new Error('Connection lost'));}}));
  await assert.rejects(readResourceResponse(failed,'assets/failed'),/Connection lost/);assert.equal(events.at(-1).complete,false);
 }finally{stop();}
 const count=events.length;await readResourceResponse(new Response(new Uint8Array([1])),'assets/later-detail');assert.equal(events.length,count,'Loading UI detaches before in-game streaming');
});
