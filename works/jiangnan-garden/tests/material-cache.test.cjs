const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises');
test('different timber and plaster shader programs never share a compiled-program cache identity',async()=>{
 const T=await import('three'),{build}=await import('esbuild'),{pathToFileURL}=require('node:url');
 const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.cache/garden-material-test.mjs');await fs.mkdir(path.dirname(out),{recursive:true});
 const result=await build({entryPoints:[path.resolve(__dirname,'../src/materials.js')],bundle:true,write:false,platform:'node',format:'esm',external:['three'],loader:{'.jpg':'text'}});await fs.writeFile(out,result.outputFiles[0].text);
 const previousDocument=global.document,originalLoad=T.TextureLoader.prototype.loadAsync;
 global.document={createElement(){return {getContext(){return {createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};}};}};
 T.TextureLoader.prototype.loadAsync=async()=>new T.Texture();
 try{
  const {materials}=await import(pathToFileURL(out)),m=await materials();
  const shaders=[m.wood,m.darkWood,m.plaster].map(material=>{const shader={vertexShader:'#include <begin_vertex>\n#include <uv_vertex>',fragmentShader:'#include <map_fragment>\n#include <roughnessmap_fragment>'};material.onBeforeCompile(shader);return {key:material.customProgramCacheKey(),text:shader.vertexShader+shader.fragmentShader};});
  for(let i=0;i<shaders.length;i++)for(let j=i+1;j<shaders.length;j++)if(shaders[i].text!==shaders[j].text)assert.notEqual(shaders[i].key,shaders[j].key,'renderer cannot reuse another wood finish or grain scale');
 }finally{global.document=previousDocument;T.TextureLoader.prototype.loadAsync=originalLoad;await fs.unlink(out);}
});
