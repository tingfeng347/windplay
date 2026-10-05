(function(root){
  'use strict';
  const C=root.VoxelCore;
  const FACES=[
    {d:[1,0,0],shade:.8,p:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]},
    {d:[-1,0,0],shade:.7,p:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]},
    {d:[0,1,0],shade:1,p:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},
    {d:[0,-1,0],shade:.48,p:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},
    {d:[0,0,1],shade:.86,p:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]},
    {d:[0,0,-1],shade:.74,p:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]}
  ];
  function atlas(){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    const colors=['#846343','#61933b','#866344','#858786','#725334','#a07c4e','#477e38','#d8cc97','#a8d1d1','#838c8a','#b58a52','#427cac','#7c7e7b','#85817a','#547d36','#f7c86a','#404449','#fbfcfd','#ffffff','#ffffff','#ffffff'];
    const fill=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
    for(let tile=0;tile<colors.length;tile++){
      const ox=(tile%8)*16,oy=Math.floor(tile/8)*16;
      fill(ox,oy,16,16,colors[tile]);
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){
        const r=C.hash(x,y,981+tile*13);ctx.fillStyle=r>.67?'rgba(255,255,255,.12)':r<.3?'rgba(0,0,0,.14)':'rgba(0,0,0,0)';ctx.fillRect(ox+x,oy+y,1,1);
      }
      if(tile===0){fill(ox,oy,16,4,'#648d3e');for(let x=0;x<16;x++)fill(ox+x,oy+4,1,Math.floor(C.hash(x,0,15)*3),'#648d3e');}
      if(tile===4){for(let x=1;x<16;x+=4){fill(ox+x,oy,1,16,'#4e3c2a');fill(ox+x+1,oy+3,1,10,'#9a774a');}}
      if(tile===5){for(let i=1;i<7;i+=2){ctx.strokeStyle=i===1?'#6b492c':'#785836';ctx.strokeRect(ox+i+.5,oy+i+.5,15-i*2,15-i*2);}fill(ox+7,oy+7,2,2,'#63452b');}
      if(tile===8){fill(ox,oy,16,1,'#e3f4f0');fill(ox,oy,1,16,'#e3f4f0');fill(ox+15,oy,1,16,'#608d94');fill(ox,oy+15,16,1,'#608d94');for(let i=3;i<12;i++)fill(ox+i,oy+13-i,1,1,'#dcecea');}
      if(tile===9){for(let y=0;y<16;y+=8){fill(ox,oy+y,16,1,'#515b58');fill(ox+(y===0?8:0),oy+y,1,8,'#515b58');}}
      if(tile===10){for(let y=0;y<16;y+=4){fill(ox,oy+y,16,1,'#775736');fill(ox+(y%8?4:11),oy+y+1,1,3,'#775736');}}
      if(tile===11){for(let y=2;y<16;y+=5){fill(ox+((y*3)%6),oy+y,7,1,'#719ebe');fill(ox+8,oy+y+2,6,1,'#376d9c');}}
      if(tile===12||tile===13){for(let n=0;n<5;n++){const x=2+Math.floor(C.hash(n,2,tile)*10),y=2+Math.floor(C.hash(n,5,tile)*10);fill(ox+x,oy+y,2,3,tile===12?'#2e3333':'#c8976e');fill(ox+x+1,oy+y-1,2,2,tile===12?'#444746':'#9b7252');}}
      if(tile===14){ctx.clearRect(ox,oy,16,16);fill(ox+7,oy+6,2,10,'#446d2d');fill(ox+4,oy+11,4,2,'#547d36');fill(ox+9,oy+9,3,2,'#547d36');fill(ox+4,oy+2,7,5,'#eeafba');fill(ox+5,oy+1,5,7,'#eeafba');fill(ox+6,oy+3,3,3,'#f2d36b');}
      if(tile===15){fill(ox+2,oy+2,12,12,'#f3df9c');fill(ox+5,oy+5,6,6,'#fff2c8');fill(ox,oy,16,2,'#89734a');fill(ox,oy+14,16,2,'#89734a');fill(ox,oy,2,16,'#89734a');fill(ox+14,oy,2,16,'#89734a');}
      if(tile>=17)fill(ox,oy,16,16,'#ffffff');
    }
    return canvas;
  }
  function uv(tile){const x=tile%8,y=Math.floor(tile/8);return [(x*16+.2)/128,(y*16+.2)/64,((x+1)*16-.2)/128,((y+1)*16-.2)/64];}
  function quad(out,points,tile,shade=1,color=[1,1,1]){
    const [u0,v0,u1,v1]=uv(tile),coords=[[u0,v1],[u1,v1],[u1,v0],[u0,v0]];
    for(const i of [0,1,2,0,2,3])out.push(...points[i],...coords[i],...color,shade);
  }
  function box(out,x,y,z,w,h,d,tile=17,color=[1,1,1],glow=false){
    for(const face of FACES){const points=face.p.map(p=>[x+p[0]*w,y+p[1]*h,z+p[2]*d]);quad(out,points,tile,glow?1.5:face.shade,color);}
  }
  function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
  function normalize(a){const l=Math.hypot(...a)||1;return a.map(v=>v/l);}
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function view(eye,direction){
    const z=direction.map(v=>-v),x=normalize(cross([0,1,0],z)),y=cross(z,x);
    return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  }
  function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];out[c*4+r]=v;}return out;}
  const vertex=`attribute vec3 aPosition;attribute vec2 aUV;attribute vec3 aColor;attribute float aShade;
    uniform mat4 uVP;varying vec2 vUV;varying vec3 vColor;varying float vShade;varying vec3 vWorld;
    void main(){vUV=aUV;vColor=aColor;vShade=aShade;vWorld=aPosition;gl_Position=uVP*vec4(aPosition,1.0);}`;
  const fragment=`precision mediump float;uniform sampler2D uAtlas;uniform float uDay;uniform vec3 uEye;uniform vec3 uFog;
    varying vec2 vUV;varying vec3 vColor;varying float vShade;varying vec3 vWorld;
    void main(){vec4 tex=texture2D(uAtlas,vUV);if(tex.a<0.2)discard;float light=vShade>1.1?1.0:(0.22+uDay*0.78)*vShade;
      vec3 color=tex.rgb*vColor*light;float fog=smoothstep(24.0,74.0,length(vWorld-uEye));gl_FragColor=vec4(mix(color,uFog,fog),1.0);}`;
  class Renderer {
    constructor(canvas){
      this.canvas=canvas;const gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'});if(!gl)throw new Error('此浏览器没有可用的 WebGL。请开启硬件加速，或使用新版 Chrome、Edge、Firefox、Safari。');
      this.gl=gl;this.meshes=new Map();this.textureCanvas=atlas();
      const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
      this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);
      if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('无法初始化方块渲染器');
      gl.useProgram(this.program);this.uniform={};for(const name of ['uVP','uAtlas','uDay','uEye','uFog'])this.uniform[name]=gl.getUniformLocation(this.program,name);
      this.attributes={};for(const name of ['aPosition','aUV','aColor','aShade'])this.attributes[name]=gl.getAttribLocation(this.program,name);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.textureCanvas);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);this.dynamic=gl.createBuffer();this.outlineBuffer=gl.createBuffer();
      this.width=0;this.height=0;this.lastWorld=null;this.faces=0;
    }
    reset(){for(const mesh of this.meshes.values())this.gl.deleteBuffer(mesh.buffer);this.meshes.clear();this.lastWorld=null;}
    chunk(world,cx,cz){
      const out=[];
      for(let x=cx*16;x<Math.min(world.width,cx*16+16);x++)for(let z=cz*16;z<Math.min(world.depth,cz*16+16);z++)for(let y=0;y<world.height;y++){
        const id=world.get(x,y,z);if(!id)continue;const b=C.BLOCKS[id];
        if(id===13){quad(out,[[x+.1,y,z+.1],[x+.9,y,z+.9],[x+.9,y+1,z+.9],[x+.1,y+1,z+.1]],14,1);quad(out,[[x+.9,y,z+.1],[x+.1,y,z+.9],[x+.1,y+1,z+.9],[x+.9,y+1,z+.1]],14,1);continue;}
        for(const [i,f]of FACES.entries()){
          const next=world.get(x+f.d[0],y+f.d[1],z+f.d[2]);
          if(next!==0&&next!==13&&!(next===10&&id!==10))continue;
          const tile=i===2?(b.top??b.tile):i===3?(b.bottom??b.tile):b.tile;
          const points=f.p.map(p=>[x+p[0],y+p[1]-(id===10&&p[1]===1?.12:0),z+p[2]]);
          quad(out,points,tile,id===14?1.5:f.shade);
        }
      }
      const key=`${cx},${cz}`,gl=this.gl,old=this.meshes.get(key);if(old)gl.deleteBuffer(old.buffer);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(out),gl.STATIC_DRAW);
      this.meshes.set(key,{buffer,count:out.length/9});
    }
    bind(buffer){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const [name,size,offset]of [['aPosition',3,0],['aUV',2,12],['aColor',3,20],['aShade',1,32]]){const a=this.attributes[name];gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,36,offset);}}
    render(state,mobs,hit,mining,showcase=false){
      const {gl,canvas}=this,w=state.world,p=state.player;
      const ratio=Math.min(window.devicePixelRatio||1,1.6),width=Math.floor(canvas.clientWidth*ratio),height=Math.floor(canvas.clientHeight*ratio);
      if(width!==this.width||height!==this.height){canvas.width=this.width=width;canvas.height=this.height=height;gl.viewport(0,0,width,height);}
      if(this.lastWorld!==w){this.reset();this.lastWorld=w;for(let cx=0;cx<Math.ceil(w.width/16);cx++)for(let cz=0;cz<Math.ceil(w.depth/16);cz++)w.dirty.add(`${cx},${cz}`);}
      // Initial generation happens once; edits replace only the affected chunks.
      for(const key of w.dirty){const [cx,cz]=key.split(',').map(Number);this.chunk(w,cx,cz);}w.dirty.clear();
      const day=C.daylight(state),fog=[.08+day*.55,.12+day*.64,.21+day*.65];
      gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
      let eye=[p.x,p.y+1.62,p.z],yaw=p.yaw,pitch=p.pitch;
      if(showcase){const t=performance.now()/1000*.025,center=w.width/2;eye=[center+Math.sin(t)*14,29,center+Math.cos(t)*14];yaw=-t;pitch=-.38;}
      const dir=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)],vp=multiply(perspective(75*Math.PI/180,width/height,.055,130),view(eye,dir));
      gl.uniformMatrix4fv(this.uniform.uVP,false,vp);gl.uniform1f(this.uniform.uDay,day);gl.uniform3fv(this.uniform.uEye,eye);gl.uniform3fv(this.uniform.uFog,fog);gl.uniform1i(this.uniform.uAtlas,0);
      for(const mesh of this.meshes.values()){this.bind(mesh.buffer);gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
      const out=[];
      const time=performance.now()/1000;
      for(let n=0;n<14;n++){const xx=((n*17.9+time*.35)%120)-20,zz=((n*29.7)%100)-10;box(out,xx,37+(n%3)*2,zz,6+(n%3),.65,3.5,17,[1,1,1]);}
      const angle=state.time/480*Math.PI*2;box(out,p.x+Math.cos(angle)*55,p.y+Math.sin(angle)*45+5,p.z-40,4,4,.7,17,[1,.94,.76],true);
      for(const mob of mobs){
        const {x,y,z,type}=mob;
        const hostile=type==='shade',body=hostile?[.28,.34,.39]:[.88,.86,.78],leg=hostile?[.2,.25,.31]:[.42,.38,.3];
        const bounce=Math.sin(time*7+mob.id)*.02;
        box(out,x-.4,y+.38+bounce,z-.3,.8,.57,.62,17,body);
        box(out,x-.23,y+.83+bounce,z-.4,.47,.43,.43,17,body);
        box(out,x-.23,y+1.08+bounce,z-.415,.08,.08,.02,17,hostile?[1,.72,.25]:[.14,.13,.1],hostile);
        box(out,x+.11,y+1.08+bounce,z-.415,.08,.08,.02,17,hostile?[1,.72,.25]:[.14,.13,.1],hostile);
        for(const dx of [-.3,.2])for(const dz of [-.23,.15])box(out,x+dx,y,z+dz,.14,.4,.14,17,leg);
      }
      if(hit&&!showcase){
        const expansion=.004,color=mining>0?[1,.75,.35]:[1,1,1],thickness=.017;
        const x=hit.x-expansion,y=hit.y-expansion,z=hit.z-expansion,s=1+2*expansion;
        for(const yy of [0,s-thickness])for(const zz of [0,s-thickness])box(out,x,y+yy,z+zz,s,thickness,thickness,17,color,true);
        for(const xx of [0,s-thickness])for(const zz of [0,s-thickness])box(out,x+xx,y,z+zz,thickness,s,thickness,17,color,true);
        for(const xx of [0,s-thickness])for(const yy of [0,s-thickness])box(out,x+xx,y+yy,z,thickness,thickness,s,17,color,true);
      }
      this.bind(this.dynamic);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(out),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,out.length/9);
      if(!showcase){
        // Render a small original block hand and the selected material in camera space.
        const held=[],id=C.selectedItem(state),item=C.ITEMS[id],swing=mining>0?Math.sin(mining*18)*.025:0;
        box(held,.27,-.68+swing,.75,.17,.31,.2,17,[.76,.6,.42]);
        if(C.available(state,id)&&C.BLOCKS[id]){
          for(const [i,f]of FACES.entries()){
            const b=C.BLOCKS[id],tile=i===2?(b.top??b.tile):i===3?(b.bottom??b.tile):b.tile;
            quad(held,f.p.map(v=>[.25+v[0]*.28,-.46+swing+v[1]*.28,.7+v[2]*.28]),tile,id===14?1.5:f.shade);
          }
        }else if(C.available(state,id)&&item?.tool){
          box(held,.34,-.46+swing,.79,.035,.38,.045,17,[.55,.38,.22]);
          if(item.tool==='sword')box(held,.315,-.19+swing,.76,.08,.35,.045,3,[.84,.9,.88]);
          else box(held,.23,-.15+swing,.76,.28,.065,.065,id===21?10:3,[1,1,1]);
        }else if(C.available(state,id)&&item?.food)box(held,.29,-.38+swing,.76,.18,.16,.18,17,[.85,.3,.31]);
        const right=[Math.cos(yaw),0,Math.sin(yaw)],up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),Math.cos(yaw)*Math.sin(pitch)];
        for(let i=0;i<held.length;i+=9){const x=held[i],y=held[i+1],z=held[i+2];for(let axis=0;axis<3;axis++)held[i+axis]=eye[axis]+right[axis]*x+up[axis]*y+dir[axis]*z;}
        gl.clear(gl.DEPTH_BUFFER_BIT);this.bind(this.dynamic);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(held),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,held.length/9);
      }
      this.eye=eye;this.direction=dir;this.frames=(this.frames||0)+1;
    }
    icon(id){
      if(!C.BLOCKS[id])return null;
      const b=C.BLOCKS[id],tile=b.top??b.tile,source=this.textureCanvas,canvas=document.createElement('canvas');canvas.width=canvas.height=32;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(source,(tile%8)*16,Math.floor(tile/8)*16,16,16,0,0,32,32);return canvas.toDataURL();
    }
  }
  root.VoxelRenderer={Renderer,atlas};
})(typeof globalThis==='object'?globalThis:this);
