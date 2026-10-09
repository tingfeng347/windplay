const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
for(const name of ['tree_small_02','fern_02'])test(name+' keeps valid offline buffers and the original botanical extent',()=>{
 const root=path.join(__dirname,'../assets/models',name),model=JSON.parse(fs.readFileSync(path.join(root,'model.gltf'))),original=JSON.parse(fs.readFileSync(path.join(root,'original.gltf.json'))),buffer=fs.readFileSync(path.join(root,'model.bin'));
 assert.equal(buffer.length,model.buffers[0].byteLength);assert.equal(model.asset.extras.license,'CC0-1.0');assert.match(model.asset.extras.originalBufferSha256,/^[0-9a-f]{64}$/);
 for(const image of model.images)assert.ok(fs.existsSync(path.join(root,image.uri)),'every image is locally available');
 const sizes={5126:4,5125:4,5123:2,5122:2,5121:1},dimensions={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 for(const accessor of model.accessors){const view=model.bufferViews[accessor.bufferView];assert.ok(view.byteOffset+view.byteLength<=buffer.length);assert.ok(accessor.count*dimensions[accessor.type]*sizes[accessor.componentType]<=view.byteLength,'accessor is fully backed by bytes');}
 for(let mi=0;mi<model.meshes.length;mi++)for(let pi=0;pi<model.meshes[mi].primitives.length;pi++){
  const primitive=model.meshes[mi].primitives[pi],source=original.meshes[mi].primitives[pi],a=model.accessors[primitive.attributes.POSITION],b=original.accessors[source.attributes.POSITION],node=model.nodes.find(n=>n.mesh===mi);
  for(let k=0;k<3;k++)for(const edge of ['min','max']){const world=a[edge][k]/(a.normalized?65535:1)*(node.scale?.[k]??1)+(node.translation?.[k]??0),expected=b[edge][k]+(original.nodes.find(n=>n.mesh===mi).translation?.[k]??0);const tolerance=name==='tree_small_02'&&pi===0?.06:.001;assert.ok(Math.abs(world-expected)<tolerance,'leaf and trunk silhouettes stay within 1 mm; simplified twig tips within 6 cm');}
  const index=model.accessors[primitive.indices],view=model.bufferViews[index.bufferView];for(let i=0;i<index.count;i++)assert.ok(buffer.readUInt32LE(view.byteOffset+i*4)<a.count,'triangles reference existing vertices');
 }
 if(name==='tree_small_02'){assert.ok(model.extensionsRequired.includes('KHR_mesh_quantization'));assert.ok(model.asset.extras.trianglesAfter>model.asset.extras.trianglesBefore*.60,'leaf-border preservation retains the botanical canopy');}
});
