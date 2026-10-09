const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
for(const name of ['chinese_armchair','chinese_tea_table','shrub_04'])test(name+' retains licensed source geometry, UVs and complete offline materials',()=>{
 const root=path.join(__dirname,'../assets/models',name),model=JSON.parse(fs.readFileSync(path.join(root,'model.gltf'))),original=JSON.parse(fs.readFileSync(path.join(root,'original.gltf.json'))),buffer=fs.readFileSync(path.join(root,'model.bin'));
 assert.equal(buffer.length,model.buffers[0].byteLength);assert.equal(model.asset.extras.license,'CC0-1.0');assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),model.asset.extras.originalBufferSha256);
 assert.deepEqual(model.accessors,original.accessors,'no silent loss of carving, member geometry or authored UVs');assert.deepEqual(model.meshes,original.meshes);
 for(const image of model.images)assert.ok(fs.existsSync(path.join(root,image.uri)),'all PBR maps are locally available');
 for(const mesh of model.meshes)for(const primitive of mesh.primitives){
  const positions=model.accessors[primitive.attributes.POSITION],index=model.accessors[primitive.indices],view=model.bufferViews[index.bufferView],offset=(view.byteOffset||0)+(index.byteOffset||0);
  for(let i=0;i<index.count;i++){const n=index.componentType===5123?buffer.readUInt16LE(offset+i*2):buffer.readUInt32LE(offset+i*4);assert.ok(n<positions.count,'all triangles reference source vertices');}
 }
});
