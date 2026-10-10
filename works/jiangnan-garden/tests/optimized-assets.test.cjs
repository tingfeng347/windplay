const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
test('baked static cloth exactly matches the gravity solver without startup simulation',async()=>{
 const {bakedCloth}=await import('../scripts/optimize-assets.mjs'),original=await import('../src/cloth.js');
 const source=bakedCloth(),start=performance.now(),baked=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 for(const args of [[1.18,2.38,-1],[1.02,2.27,1]])assert.deepEqual(baked.settleCurtain(...args).positions,original.settleCurtain(...args).positions);
 assert.deepEqual(baked.settleQuilt().positions,original.settleQuilt().positions);
 assert.ok(performance.now()-start<500,'Runtime only reconstructs the exact typed arrays');
 assert.doesNotMatch(source,/for\s*\(|while\s*\(/,'No iterative gravity loop ships');
});
test('compressed tree keeps its full original detail and a smaller overview',async()=>{
 const {modelAsset}=await import('../scripts/optimize-assets.mjs'),fs=require('node:fs'),root=path.resolve(__dirname,'../assets/models/tree_small_02/model.gltf'),source=JSON.parse(fs.readFileSync(root)),full=await modelAsset(root),overview=await modelAsset(root,true);
 const count=model=>model.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+model.accessors[p.indices].count/3,0);
 assert.equal(count(full.model),count(source),'No full-detail faces are removed');
 assert.ok(count(overview.model)<count(source)*.5,'Distant view has fewer subdivisions');
 for(const model of [full.model,overview.model]){assert.deepEqual(model.nodes,source.nodes);assert.deepEqual(model.materials,source.materials);assert.ok(model.extensionsRequired.includes('EXT_meshopt_compression'));}
 const {MeshoptDecoder}=await import('three/addons/libs/meshopt_decoder.module.js'),{gunzipSync}=require('node:zlib');await MeshoptDecoder.ready;const buffer=gunzipSync(full.bytes);
 for(const view of full.model.bufferViews){const e=view.extensions.EXT_meshopt_compression,out=new Uint8Array(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(out,e.count,e.byteStride,buffer.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);assert.equal(out.byteLength,view.byteLength);}
});
test('shared trees retain placement, shader deformation, and depth/distance shadows',async()=>{
 const T=await import('three'),{treeInstances}=await import('../src/tree-instances.js'),template=new T.Group(),source=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());source.position.set(.2,.3,-.4);template.add(source);
 const trees=treeInstances(template),a=trees.plant(2,3,6,1.2,.4,3),b=trees.plant(-2,1,4,1.1,2.3,3);a.position.y=.8;const scene=new T.Scene();trees.flush(scene);
 const mesh=scene.children[0];assert.ok(mesh.isInstancedMesh);assert.equal(mesh.count,2);assert.equal(mesh.geometry.getAttribute('position'),source.geometry.getAttribute('position'));
 a.updateMatrix();template.updateMatrixWorld();const expected=new T.Matrix4().multiplyMatrices(a.matrix,source.matrixWorld),actual=new T.Matrix4();mesh.getMatrixAt(0,actual);for(let i=0;i<16;i++)assert.ok(Math.abs(actual.elements[i]-expected.elements[i])<1e-6);
 for(const material of [mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial]){const shader={vertexShader:'#include <begin_vertex>\n#include <beginnormal_vertex>'};material.onBeforeCompile(shader);assert.match(shader.vertexShader,/treeBend\*position.y\*position.y/);}
 assert.ok(b.position.x===-2);
});
