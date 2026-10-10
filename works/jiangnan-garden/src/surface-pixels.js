// The previous CanvasTexture pixels, including Float32 height rounding and
// Uint8ClampedArray conversion. Lookup tables avoid repeated identical trig.
export function surfacePixels({kind,values,seed,size=1024}){
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const color=new Uint8ClampedArray(size*size*4),height=new Float32Array(size*size);
 const bump=new Uint8ClampedArray(color.length),rough=new Uint8ClampedArray(color.length);
 const sin=(factor)=>Float64Array.from({length:size},(_,i)=>Math.sin(i*factor));
 const linen=kind==='linen'?Float64Array.from({length:size},(_,i)=>Math.sin(i*Math.PI/3)):null;
 const a=sin(kind==='ceramic'?.021:kind==='stone'?.027:.03),b=sin(kind==='ceramic'?.042:kind==='stone'?.015:.03),c=sin(kind==='ceramic'?.028:.039),d=sin(.02);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let n=(random()-.5)*.1,h=.5;
  if(kind==='stone'){n+=Math.sin(x*.04+b[y]*4)*Math.cos(y*.029)*.06;h=.4+random()*.32+a[x]*c[y]*.12;}
  else if(kind==='ceramic'){const crazing=Math.pow(Math.max(0,Math.cos(x*.075+d[y]*8)*Math.cos(y*.11+a[x]*5)),18);n+=b[x]*c[y]*.045-crazing*.07;h=.5+random()*.015-crazing*.08;}
  else if(kind==='linen'){const cross=(Math.floor(x/6)+Math.floor(y/6))%2;n+=(cross?linen[x]:linen[y])*.025;h=.5+(cross?linen[x]:linen[y])*.15;}
  else if(kind==='paper'){n+=Math.sin(x*.13+a[y]*2)*.025;h=.5+Math.sin(x*1.7+y*.02)*.07+random()*.035;}
  else throw new Error('Unknown procedural surface');
  const i=(y*size+x)*4;for(let k=0;k<3;k++)color[i+k]=Math.max(0,Math.min(255,values[k]*(1+n)));color[i+3]=255;height[y*size+x]=h;
 }
 for(let i=0;i<height.length;i++){const j=i*4,v=Math.round(height[i]*255),r=Math.round(140+height[i]*90);for(let k=0;k<3;k++){bump[j+k]=v;rough[j+k]=r;}bump[j+3]=rough[j+3]=255;}
 return [color,bump,rough];
}

// Jump the original LCG without drawing the overwritten first ceramic maps.
export function advanceSeed(seed,count){let a=1664525n,c=1013904223n,value=BigInt(seed),n=BigInt(count),mask=0xffffffffn;while(n){if(n&1n)value=(a*value+c)&mask;c=(c*(a+1n))&mask;a=(a*a)&mask;n>>=1n;}return Number(value);}

export async function generateSurfaces(jobs){
 if(typeof Worker==='undefined')return jobs.map(surfacePixels);
 const source=`const generate=${surfacePixels.toString()};onmessage=({data})=>{try{const pixels=generate(data);postMessage({pixels},pixels.map(p=>p.buffer));}catch(error){postMessage({error:error.message});}};`;
 const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'})),output=new Array(jobs.length);let next=0;
 try{await Promise.all(Array.from({length:Math.min(2,jobs.length)},async()=>{
  let worker;try{worker=new Worker(url);}catch{worker=null;}
  try{while(next<jobs.length){const i=next++;if(!worker){output[i]=surfacePixels(jobs[i]);continue;}
   try{output[i]=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Surface worker timeout')),30000);worker.onmessage=e=>{clearTimeout(timer);e.data.error?reject(new Error(e.data.error)):resolve(e.data.pixels);};worker.onerror=e=>{clearTimeout(timer);reject(new Error(e.message));};worker.postMessage(jobs[i]);});}
   catch{worker.terminate();worker=null;output[i]=surfacePixels(jobs[i]);}
  }}finally{worker?.terminate();}
 }));return output;}finally{URL.revokeObjectURL(url);}
}
