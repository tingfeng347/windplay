import {build as bundle} from 'esbuild';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {dirname,resolve,basename,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {imageAsset,modelAsset,bakedCloth} from './optimize-assets.mjs';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,16);
let cloth;
export async function compile(online=false,{assetBase=process.env.WINDPLAY_GARDEN_ASSET_BASE}={}){
 const assets=new Map(),initialAssets=new Set();
 function asset(bytes,name,type,deferred=false){
  if(!online)return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
  const clean=name.replace(/[^a-z0-9_.-]/gi,'-'),extension=extname(clean);
  const file=`assets/${clean.slice(0,-extension.length)}-${hash(bytes)}${extension}`;
  assets.set(file,bytes);if(!deferred)initialAssets.add(file);
  if(type==='image/webp'){const prompt=Buffer.from(bytes).toString().match(/<impeccable:prompt>([\s\S]*?)<\/impeccable:prompt>/)?.[1];if(!prompt)throw new Error('WebP derivative missing origin');assets.set(file+'.json',Buffer.from(JSON.stringify({prompt:prompt.replaceAll('&amp;','&')},null,2)));}
  return file;
 }
 const [template,css,result]=await Promise.all([
  readFile(resolve(root,'src/index.html'),'utf8'),readFile(resolve(root,'src/styles.css'),'utf8'),
  bundle({entryPoints:[resolve(root,'src/app.js')],bundle:true,write:false,format:'iife',target:'es2020',minify:true,legalComments:'inline',plugins:[{name:'garden-assets',setup(builder){
   builder.onLoad({filter:/src\/cloth\.js$/},()=>({contents:cloth??=bakedCloth(),loader:'js'}));
   builder.onLoad({filter:/\.(jpg|png)$/},async({path})=>{const converted=await imageAsset(path),preview=await imageAsset(path,true);const uri=(v,deferred=false)=>asset(v.bytes,basename(path).replace(/\.(jpg|png)$/i,v.extension),v.extension==='.webp'?'image/webp':'image/jpeg',deferred);return {contents:`import {textureURL} from ${JSON.stringify(resolve(root,'src/texture-streaming.js'))};export default textureURL(${JSON.stringify(uri(preview))},${JSON.stringify(uri(converted,true))});`,loader:'js'};});
   builder.onLoad({filter:/\.hdr$/},async({path})=>({contents:'export default '+JSON.stringify(asset(await readFile(path),basename(path),'application/octet-stream'))+';',loader:'js'}));
   builder.onLoad({filter:/\.gltf$/},async({path})=>{
    if(path.includes('/tree_small_02/')){
     const far=await modelAsset(path,true),near=await modelAsset(path),model=structuredClone(far.model),detail=structuredClone(near.model);
     model.buffers[0].uri=asset(far.bytes,'tree-overview.bin.gz','application/gzip');detail.buffers[0].uri=asset(near.bytes,'tree-detail.bin.gz','application/gzip',true);
     detail.images=[];detail.textures=[];detail.materials=[];for(const mesh of detail.meshes)for(const primitive of mesh.primitives)delete primitive.material;
     let source='';for(const [i,entry] of model.images.entries()){source+=`import image${i} from ${JSON.stringify(resolve(dirname(path),entry.uri))};\n`;entry.uri='';}
     source+=`const model=${JSON.stringify(model)};\n`;for(let i=0;i<model.images.length;i++)source+=`model.images[${i}].uri=image${i};\n`;
     return {contents:source+`export default {overview:model,detail:${JSON.stringify(detail)}};`,loader:'js',resolveDir:dirname(path)};
    }
    const optimized=await modelAsset(path),model=structuredClone(optimized.model),bytes=optimized.bytes;model.buffers[0].uri=asset(bytes,basename(dirname(path))+'.bin.gz','application/gzip');
    let source='';for(const [i,entry] of model.images.entries()){source+=`import image${i} from ${JSON.stringify(resolve(dirname(path),entry.uri))};\n`;entry.uri='';}
    source+=`const model=${JSON.stringify(model)};\n`;for(let i=0;i<model.images.length;i++)source+=`model.images[${i}].uri=image${i};\n`;
    return {contents:source+'export default model;',loader:'js',resolveDir:dirname(path)};
   });
  }}]})
 ]);
 let packFile;
 if(online){
  const entries={},chunks=[];let offset=0;
  for(const file of [...initialAssets].sort())if(/\.(webp|jpg|png|hdr)$/.test(file)){
   const bytes=assets.get(file);entries[file]={offset,size:bytes.length};chunks.push(bytes);offset+=bytes.length;assets.delete(file);initialAssets.delete(file);
  }
  const header=Buffer.from(JSON.stringify(entries)),length=Buffer.alloc(4);length.writeUInt32LE(header.length);
  const packed=gzipSync(Buffer.concat([length,header,...chunks]),{level:9});packFile=`assets/initial-${hash(packed)}.pack.gz`;assets.set(packFile,packed);initialAssets.add(packFile);
 }
 const script=result.outputFiles[0].text;
 let html=template.replace('<link rel="stylesheet" href="styles.css">',()=>`<style>${css}</style>`);
 if(online){
  let metadata=`<meta name="windplay-asset-pack" content="${packFile}">`;
  const configured=assetBase;
  if(configured){const base=new URL(configured);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw new Error('CDN base must be a public HTTPS directory URL');if(!base.pathname.endsWith('/'))base.pathname+='/';metadata+=`<meta name="windplay-asset-base" content="${base.href.replaceAll('&','&amp;').replaceAll('"','&quot;')}"><link rel="preconnect" href="${base.origin}" crossorigin>`;}
  html=html.replace('</head>',metadata+'</head>');
  const file=`assets/app-${hash(script)}.js`;assets.set(file,Buffer.from(script));initialAssets.add(file);html=html.replace('<script type="module" src="app.js"></script>',()=>`<script defer src="${file}"></script>`);}
 else html=html.replace('<script type="module" src="app.js"></script>',()=>`<script>${script.replace(/<\/script/gi,'<\\/script')}</script>`);
 if(/__[A-Z0-9_]+__/.test(html.replace(/__THREE(?:_DEVTOOLS)?__/g,'')))throw new Error('Unresolved build token');
 return {html,assets,initialAssets};
}
export async function build(write=true){
 const offline=await compile();
 if(write){
  const web=await compile(true);
  for(const dir of ['demo','dist']){await mkdir(resolve(root,dir),{recursive:true});await writeFile(resolve(root,dir,'index.html'),offline.html);}
  const output=resolve(root,'dist/web');await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});await writeFile(resolve(output,'index.html'),web.html);
  for(const [file,bytes] of web.assets){await mkdir(dirname(resolve(output,file)),{recursive:true});await writeFile(resolve(output,file),bytes);}
  const report={entryBytes:Buffer.byteLength(web.html),initialResourceBytes:[...web.initialAssets].reduce((n,file)=>n+web.assets.get(file).length,0),resourceBytes:[...web.assets.values()].reduce((n,b)=>n+b.length,0),files:web.assets.size,initialRequests:web.initialAssets.size,offlineBytes:Buffer.byteLength(offline.html)};
  await writeFile(resolve(root,'dist/loading-report.json'),JSON.stringify(report,null,2));console.log('Garden loading:',report);
 }
 return offline.html;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const html=await build();console.log(`Built ${root}: ${(Buffer.byteLength(html)/1048576).toFixed(2)} MiB offline`);}
