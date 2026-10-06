const test=require('node:test');
const assert=require('node:assert/strict');
require('../src/engine.js');
// Renderer geometry exports do not access a browser until Renderer is constructed.
global.MetroEngine=require('../src/engine.js');
require('../src/renderer.js');
const R=global.MetroRenderer;
function project(matrix,p,width){const v=[...p,1],out=[0,0,0,0];for(let row=0;row<4;row++)for(let i=0;i<4;i++)out[row]+=matrix[i*4+row]*v[i];return(out[0]/out[3]+1)*width/2;}
test('portrait cameras retain whole runner in all lanes at 320 and 390 pixels',()=>{
  for(const width of[320,390])for(const lane of[-1,-.5,0,.5,1])for(const y of[0,1.8,2.75]){
    const height=844,c=R.cameraConfig(width/height),x=lane*3.2,eye=[x*c.follow,c.height+y*.45,c.back],target=[x*c.targetFollow,1.3+y*.15,-26],vp=R.multiply(R.perspective(c.fov*Math.PI/180,width/height,.1,290),R.view(eye,target));
    for(const dx of[-.66,.66])for(const dy of[0,1.92]){const px=project(vp,[x+dx,y+dy,0],width);assert.ok(px>12&&px<width-12,`${width}/${lane}/${y} clips runner at ${px}`);}
  }
});
test('desktop camera retains established follow, distance and field of view',()=>{assert.deepEqual(R.cameraConfig(16/9),{follow:.26,targetFollow:.16,height:5.3,back:8.3,fov:62});});
