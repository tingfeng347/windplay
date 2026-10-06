(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShadowCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const GRID = 28, CELL = 0.17, MASK_SIZE = 112, MASK_EXTENT = 3.5;
  const PASS_SCORE = 0.9, HOLD_MS = 600;
  const FACE_INDICES = [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const wrapAngle = v => Number.isFinite(v) ? ((v + 180) % 360 + 360) % 360 - 180 : 0;
  function rotationMatrix(angles) {
    const [x,y,z] = angles.map(v => v * Math.PI / 180);
    const a=Math.cos(x), b=Math.sin(x), c=Math.cos(y), d=Math.sin(y), e=Math.cos(z), f=Math.sin(z);
    return [e*c, e*d*b-f*a, e*d*a+f*b, f*c, f*d*b+e*a, f*d*a-e*b, -d, c*b, c*a];
  }
  const transform = (m,p) => [m[0]*p[0]+m[1]*p[1]+m[2]*p[2],m[3]*p[0]+m[4]*p[1]+m[5]*p[2],m[6]*p[0]+m[7]*p[1]+m[8]*p[2]];
  const transpose = m => [m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]];
  function polygonContains(points,x,y) {
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++) {
      const a=points[i],b=points[j];
      if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
    }
    return inside;
  }
  const ellipse = (x,y,cx,cy,rx,ry=rx) => ((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
  const poly = (points,x,y) => polygonContains(points,x,y);
  const shapes = [
    {id:'cat',name:'窗边的猫',clue:'尖耳朵、圆脑袋，还有一条向上卷起的尾巴。',description:'让两只耳朵朝上，找到坐在窗边的猫。',solution:[18,-46,0],start:[-48,68,0],axes:2,
      contains:(x,y)=>ellipse(x,y,16,19,6.1,7.5)||ellipse(x,y,15,9.4,5.1,5.1)||poly([[10,7],[9.6,1.5],[14.2,5.5]],x,y)||poly([[16,5.5],[20.5,1.7],[20,8]],x,y)||(ellipse(x,y,6.4,19,4.9,6.1)&&!ellipse(x,y,6.4,17.9,2.6,3.7)&&y<24.4)||poly([[7,23],[16,22],[19,26],[6,26]],x,y)},
    {id:'bird',name:'掠过的飞鸟',clue:'先找展开的两翼，再让短短的尾羽落在下方。',description:'两翼展开，像从展墙上掠过的一只鸟。',solution:[-27,38,0],start:[58,-76,0],axes:2,
      contains:(x,y)=>poly([[14,12],[10,9],[3,3],[1,5],[3,11],[7,16],[11,18],[12,22],[14,24],[16,22],[17,18],[21,16],[25,11],[27,5],[25,3],[18,9]],x,y)||ellipse(x,y,14,6.7,2.3,2.6)||poly([[12,8],[16,8],[16,17],[12,17]],x,y)||poly([[15,5.5],[19,7],[15,8]],x,y)},
    {id:'key',name:'旧门的钥匙',clue:'圆环中间留一束光，钥匙的两个齿指向右下。',description:'保留钥匙头的空心圆环，再对齐齿和柄。',solution:[34,-32,24],start:[-58,64,-37],axes:3,
      contains:(x,y)=>(ellipse(x,y,8.5,8.3,6.8)&&!ellipse(x,y,8.5,8.3,3.3))||poly([[11,12],[14,10],[25,21],[22,24]],x,y)||poly([[18,16],[21,13],[23,15],[20,18]],x,y)||poly([[22,20],[25,17],[27,19],[24,22]],x,y)},
    {id:'lighthouse',name:'海岸的灯塔',clue:'塔身上窄下宽。让灯室坐在塔顶，底座落稳。',description:'屋顶、灯室、塔身与底座从上到下连成一线。',solution:[-41,28,-18],start:[57,-65,44],axes:3,
      contains:(x,y)=>poly([[8,7],[14,1],[20,7]],x,y)||(x>=8&&x<=20&&y>=7&&y<=10&&!(x>11&&x<17&&y>7.8&&y<9.6))||poly([[10,10],[18,10],[21,23],[7,23]],x,y)||(x>=4&&x<=24&&y>=23&&y<=26)},
    {id:'teapot',name:'午后的茶壶',clue:'弯弯的壶嘴在左边，右边的把手中间要透光。',description:'看清左侧壶嘴和右侧空心把手，找回午后的茶壶。',solution:[29,43,-31],start:[-61,-57,49],axes:3,
      contains:(x,y)=>ellipse(x,y,13,17.5,7.5,7.3)||(ellipse(x,y,22,16,5.1,6.1)&&!ellipse(x,y,22,16,2.8,3.8))||poly([[7,13],[3,10],[1,7],[4,7],[7,10],[9,12],[9,19],[6,17]],x,y)||poly([[7,11],[10,8],[17,8],[20,11]],x,y)||ellipse(x,y,13.5,6.5,2.1,1.8)||(x>=7&&x<=19&&y>=23&&y<=25)},
    {id:'butterfly',name:'停驻的蝴蝶',clue:'两对翅膀之间，是细细的身体和伸出的触角。',description:'让两侧翅膀展开，细身体与触角保持竖直。',solution:[-32,-39,36],start:[63,59,-46],axes:3,
      contains:(x,y)=>ellipse(x,y,6.8,9.2,5.5,7.3)||ellipse(x,y,21.2,9.2,5.5,7.3)||ellipse(x,y,8.8,20.3,4.7,5.5)||ellipse(x,y,19.2,20.3,4.7,5.5)||ellipse(x,y,14,15.5,1.7,9)||poly([[13.2,8],[9.5,2],[11,1],[14,7]],x,y)||poly([[14,7],[17,1],[18.5,2],[14.8,8]],x,y)}
  ];
  function hull(points) {
    const p = points.map(v=>[v[0],v[1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const unique=p.filter((v,i)=>!i||v[0]!==p[i-1][0]||v[1]!==p[i-1][1]);
    if(unique.length<3)return unique;
    const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const lower=[],upper=[];
    for(const v of unique){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),v)<=0)lower.pop();lower.push(v);}
    for(const v of unique.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),v)<=0)upper.pop();upper.push(v);}
    lower.pop();upper.pop();return lower.concat(upper);
  }
  function boxVertices(x0,y0,x1,y1,z0,z1) {
    return [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
  }
  function createLevel(def,index) {
    const cells=Array.from({length:GRID},(_,row)=>Array.from({length:GRID},(_,col)=>def.contains(col+.5,row+.5)));
    const inverse=transpose(rotationMatrix(def.solution));
    const blocks=[];
    for(let row=0;row<GRID;row++)for(let col=0;col<GRID;col++) {
      if(!cells[row][col])continue;
      let end=col+1;while(end<Math.min(GRID,col+3)&&cells[row][end])end++;
      const hash=((row*131+col*73+index*59)%97)/96;
      const z=(hash-.5)*(def.id==='key'?1.2:1.95), thickness=.28+((row+col)%3)*.09;
      const vertices=boxVertices((col-GRID/2)*CELL,(GRID/2-row-1)*CELL,(end-GRID/2)*CELL,(GRID/2-row)*CELL,z-thickness/2,z+thickness/2);
      blocks.push({vertices:vertices.map(p=>transform(inverse,p)),tint:(row*7+col*3)%5});col=end-1;
    }
    const level={id:def.id,name:def.name,clue:def.clue,description:def.description,solution:def.solution.slice(),start:def.start.slice(),axes:def.axes,blocks,index};
    level.targetPolygons=projectShadow(level,level.solution);
    level.targetMask=rasterize(level.targetPolygons);
    return level;
  }
  function rotatedBlocks(level,angles) {
    const matrix=rotationMatrix(angles);
    return level.blocks.map(block=>({tint:block.tint,vertices:block.vertices.map(p=>transform(matrix,p))}));
  }
  // The single light emits parallel rays along -Z. Intersecting those rays with
  // the wall keeps X/Y; the convex hull of each box is its exact cast shadow.
  function projectShadow(level,angles) {
    return rotatedBlocks(level,angles).map(block=>hull(block.vertices));
  }
  function rasterize(polygons,size=MASK_SIZE,extent=MASK_EXTENT) {
    const mask=new Uint8Array(size*size),scale=size/(extent*2);
    for(const polygon of polygons) {
      if(polygon.length<3)continue;
      const points=polygon.map(([x,y])=>[(x+extent)*scale,(extent-y)*scale]);
      const minY=clamp(Math.ceil(Math.min(...points.map(p=>p[1]))-.5),0,size-1);
      const maxY=clamp(Math.floor(Math.max(...points.map(p=>p[1]))-.5),0,size-1);
      for(let y=minY;y<=maxY;y++) {
        const scan=y+.5,crossings=[];
        for(let i=0,j=points.length-1;i<points.length;j=i++) {
          const a=points[i],b=points[j];
          if((a[1]>scan)!==(b[1]>scan))crossings.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));
        }
        crossings.sort((a,b)=>a-b);
        for(let i=0;i+1<crossings.length;i+=2) {
          const from=clamp(Math.ceil(crossings[i]-.5),0,size),to=clamp(Math.ceil(crossings[i+1]-.5),0,size);
          for(let x=from;x<to;x++)mask[y*size+x]=1;
        }
      }
    }
    return mask;
  }
  function maskIoU(a,b) {
    if(a.length!==b.length)throw new RangeError('Mask dimensions must match');
    let intersection=0,union=0;
    for(let i=0;i<a.length;i++){if(a[i]||b[i])union++;if(a[i]&&b[i])intersection++;}
    return union ? intersection/union : 0;
  }
  function evaluate(level,angles) {
    const polygons=projectShadow(level,angles),mask=rasterize(polygons);
    return {polygons,mask,score:maskIoU(mask,level.targetMask)};
  }
  function advanceStability(previous,score,deltaMs,moving=false) {
    const held=(!moving&&Number.isFinite(score)&&score>=PASS_SCORE)?Math.min(HOLD_MS,Math.max(0,previous)+clamp(Number.isFinite(deltaMs)?deltaMs:0,0,100)):0;
    return {held,complete:held>=HOLD_MS};
  }
  const LEVELS=shapes.map(createLevel);
  function initialAngles(level,attempt=0) {
    if(!attempt)return level.start.slice();
    for(let n=0;n<12;n++) {
      const angles=[wrapAngle(level.start[0]+attempt*41+n*17),wrapAngle(level.start[1]-attempt*53-n*23),level.axes===3?wrapAngle(level.start[2]+attempt*37+n*19):0];
      if(evaluate(level,angles).score<.65)return angles;
    }
    return level.start.slice();
  }
  function parseProgress(raw) {
    const fallback={version:1,completed:[],lastLevel:LEVELS[0].id};
    if(typeof raw!=='string'||raw.length>4096)return fallback;
    try {
      const value=JSON.parse(raw),ids=new Set(LEVELS.map(level=>level.id));
      if(!value||value.version!==1||!Array.isArray(value.completed))return fallback;
      return {version:1,completed:[...new Set(value.completed.filter(id=>typeof id==='string'&&ids.has(id)))],lastLevel:ids.has(value.lastLevel)?value.lastLevel:LEVELS[0].id};
    }catch{return fallback;}
  }
  return Object.freeze({GRID,CELL,MASK_SIZE,MASK_EXTENT,PASS_SCORE,HOLD_MS,FACE_INDICES,LEVELS,clamp,wrapAngle,rotationMatrix,transform,transpose,hull,polygonContains,boxVertices,rotatedBlocks,projectShadow,rasterize,maskIoU,evaluate,advanceStability,initialAngles,parseProgress});
});
